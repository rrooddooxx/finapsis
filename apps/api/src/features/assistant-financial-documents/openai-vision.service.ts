import { generateObject, generateText } from "ai";
import { openAiProvider } from "../../providers/openai/openai.provider";
import { devLogger } from "../../utils/logger.utils";
import { z } from "zod";

export interface VisionAnalysisRequest {
  imageBase64: string;
  imageMimeType: string; // e.g., 'image/jpeg', 'image/png'
  bucketName: string;
  objectName: string;
  namespace: string;
  userId: string;
  documentType?: string;
}

export interface ChileanMerchantInfo {
  merchantName: string;
  rut?: string;
  giro?: string;
  address?: string;
  city?: string;
  confidence: number;
}

export interface VisionAnalysisResult {
  success: boolean;
  extractedText: string;
  amounts: number[];
  dates: string[];
  merchantInfo: ChileanMerchantInfo;
  transactionInfo: {
    transactionType: 'INCOME' | 'EXPENSE';
    category: string;
    subcategory?: string;
    amount: number;
    currency: string;
    description: string;
    confidence: number;
  };
  chileanContext: {
    documentType: 'BOLETA' | 'FACTURA' | 'COMPROBANTE' | 'RECIBO' | 'TRANSFERENCIA' | 'UNKNOWN';
    isChileanDocument: boolean;
    language: 'es' | 'en' | 'mixed';
    hasRUT: boolean;
    hasIVA: boolean;
  };
  confidence: number;
  processingTime: number;
  error?: string;
}

// Simplified and more permissive Zod schema for OpenAI Vision
const VisionAnalysisSchema = z.object({
  extractedText: z.string().default('Sin texto extraído').describe("Complete text extracted from the image"),
  amounts: z.array(z.number()).default([]).describe("All numeric amounts found in the document"),
  dates: z.array(z.string()).default([]).describe("All dates found in the document"),
  merchantInfo: z.object({
    merchantName: z.string().default('Comercio desconocido').describe("Name of the merchant or business"),
    rut: z.string().optional().describe("Chilean RUT number if present"),
    giro: z.string().optional().describe("Business activity description"),
    address: z.string().optional().describe("Business address"),
    city: z.string().optional().describe("City location"),
    confidence: z.number().min(0).max(1).default(0.1).describe("Confidence in merchant identification")
  }).default({}),
  transactionInfo: z.object({
    transactionType: z.enum(['INCOME', 'EXPENSE']).default('EXPENSE').describe("Type of financial transaction"),
    category: z.string().default('otros_gastos').describe("Category of expense/income"),
    subcategory: z.string().optional().describe("More specific subcategory"),
    amount: z.number().default(0).describe("Main transaction amount"),
    currency: z.string().default('CLP').describe("Currency code"),
    description: z.string().default('Gasto general').describe("Transaction description"),
    confidence: z.number().min(0).max(1).default(0.1).describe("Confidence in classification")
  }).default({}),
  chileanContext: z.object({
    documentType: z.enum(['BOLETA', 'FACTURA', 'COMPROBANTE', 'RECIBO', 'TRANSFERENCIA', 'UNKNOWN']).default('UNKNOWN'),
    isChileanDocument: z.boolean().default(false).describe("Whether this appears to be a Chilean document"),
    language: z.enum(['es', 'en', 'mixed']).default('es').describe("Primary language of the document"),
    hasRUT: z.boolean().default(false).describe("Whether a Chilean RUT is present"),
    hasIVA: z.boolean().default(false).describe("Whether IVA (Chilean tax) is mentioned")
  }).default({}),
  confidence: z.number().min(0).max(1).default(0.1).describe("Overall confidence in the analysis")
});

export class OpenAIVisionService {
  private client;

  constructor() {
    this.client = openAiProvider().client;
  }

  /**
   * Analyze a financial document image using OpenAI Vision API
   */
  async analyzeDocumentImage(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
    const startTime = Date.now();

    try {
      devLogger('OpenAI Vision', '👁️ Starting image analysis for Chilean document', {
        objectName: request.objectName,
        documentType: request.documentType,
        imageMimeType: request.imageMimeType,
        imageSize: Math.round(request.imageBase64.length / 1024) + 'KB'
      });

      // First, try with a much simpler schema to see what OpenAI actually returns
      let result;
      try {
        result = await generateObject({
          model: this.client('gpt-4o-mini'), // GPT-4o-mini supports vision
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: this.buildChileanAnalysisPrompt(request.documentType)
                },
                {
                  type: 'image',
                  image: `data:${request.imageMimeType};base64,${request.imageBase64}`
                }
              ]
            }
          ],
          schema: VisionAnalysisSchema,
          temperature: 0.1,
          maxRetries: 3,
          onFailure: ({ failureCount, error }) => {
            devLogger('OpenAI Vision', `⚠️ Schema validation attempt ${failureCount} failed`, { 
              error: error.message,
              errorStack: error.stack,
              objectName: request.objectName,
              userId: request.userId,
              documentType: request.documentType,
              imageMimeType: request.imageMimeType
            });
          }
        });
      } catch (schemaError) {
        devLogger('OpenAI Vision', '🔍 Schema validation failed, trying with generateText to see raw response', {
          schemaError: schemaError.message
        });
        
        // Fallback: get raw text response to debug what OpenAI is actually returning
        const textResult = await generateText({
          model: this.client('gpt-4o-mini'),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this Chilean financial document and return a valid JSON with the following structure:
{
  "extractedText": "complete text from image",
  "amounts": [numbers found],
  "dates": ["dates in ISO format"],
  "merchantInfo": {
    "merchantName": "merchant name",
    "confidence": 0.8
  },
  "transactionInfo": {
    "transactionType": "EXPENSE",
    "category": "alimentacion",
    "amount": 1000,
    "currency": "CLP",
    "description": "description",
    "confidence": 0.8
  },
  "chileanContext": {
    "documentType": "BOLETA",
    "isChileanDocument": true,
    "language": "es",
    "hasRUT": true,
    "hasIVA": false
  },
  "confidence": 0.8
}

Return ONLY the JSON, no other text.`
                },
                {
                  type: 'image',
                  image: `data:${request.imageMimeType};base64,${request.imageBase64}`
                }
              ]
            }
          ],
          temperature: 0.1
        });

        devLogger('OpenAI Vision', '🔍 Raw OpenAI response for debugging', {
          rawResponse: textResult.text.substring(0, 1000) + (textResult.text.length > 1000 ? '...' : ''),
          responseLength: textResult.text.length
        });

        // Try to manually parse the JSON response
        try {
          const cleanedResponse = textResult.text.trim().replace(/```json\s?/, '').replace(/```\s?$/, '');
          const parsedResponse = JSON.parse(cleanedResponse);
          
          // Manually validate and create result object
          result = {
            object: {
              extractedText: parsedResponse.extractedText || 'Sin texto extraído',
              amounts: Array.isArray(parsedResponse.amounts) ? parsedResponse.amounts : [],
              dates: Array.isArray(parsedResponse.dates) ? parsedResponse.dates : [],
              merchantInfo: {
                merchantName: parsedResponse.merchantInfo?.merchantName || 'Comercio desconocido',
                rut: parsedResponse.merchantInfo?.rut,
                giro: parsedResponse.merchantInfo?.giro,
                address: parsedResponse.merchantInfo?.address,
                city: parsedResponse.merchantInfo?.city,
                confidence: parsedResponse.merchantInfo?.confidence || 0.1
              },
              transactionInfo: {
                transactionType: parsedResponse.transactionInfo?.transactionType || 'EXPENSE',
                category: parsedResponse.transactionInfo?.category || 'otros_gastos',
                subcategory: parsedResponse.transactionInfo?.subcategory,
                amount: parsedResponse.transactionInfo?.amount || 0,
                currency: parsedResponse.transactionInfo?.currency || 'CLP',
                description: parsedResponse.transactionInfo?.description || 'Gasto general',
                confidence: parsedResponse.transactionInfo?.confidence || 0.1
              },
              chileanContext: {
                documentType: parsedResponse.chileanContext?.documentType || 'UNKNOWN',
                isChileanDocument: parsedResponse.chileanContext?.isChileanDocument || false,
                language: parsedResponse.chileanContext?.language || 'es',
                hasRUT: parsedResponse.chileanContext?.hasRUT || false,
                hasIVA: parsedResponse.chileanContext?.hasIVA || false
              },
              confidence: parsedResponse.confidence || 0.1
            }
          };

          devLogger('OpenAI Vision', '✅ Successfully parsed fallback JSON response', {
            merchantName: result.object.merchantInfo.merchantName,
            amount: result.object.transactionInfo.amount,
            category: result.object.transactionInfo.category
          });

        } catch (parseError) {
          devLogger('OpenAI Vision', '❌ Failed to parse fallback JSON response', {
            parseError: parseError.message,
            rawResponsePreview: textResult.text.substring(0, 500)
          });
          throw schemaError; // Re-throw original schema error
        }
      }

      const processingTime = Date.now() - startTime;

      devLogger('OpenAI Vision', '✅ Image analysis completed', {
        merchantName: result.object.merchantInfo.merchantName,
        amount: result.object.transactionInfo.amount,
        category: result.object.transactionInfo.category,
        confidence: result.object.confidence,
        processingTime
      });

      return {
        success: true,
        extractedText: result.object.extractedText,
        amounts: result.object.amounts,
        dates: result.object.dates,
        merchantInfo: result.object.merchantInfo,
        transactionInfo: result.object.transactionInfo,
        chileanContext: result.object.chileanContext,
        confidence: result.object.confidence,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      devLogger('OpenAI Vision', '❌ Image analysis failed', {
        error: errorMessage,
        processingTime
      });

      return {
        success: false,
        extractedText: 'Error al procesar imagen',
        amounts: [],
        dates: [],
        merchantInfo: {
          merchantName: 'Error de procesamiento',
          confidence: 0.1
        },
        transactionInfo: {
          transactionType: 'EXPENSE',
          category: 'otros_gastos',
          amount: 0,
          currency: 'CLP',
          description: 'Error al analizar documento',
          confidence: 0.1
        },
        chileanContext: {
          documentType: 'UNKNOWN',
          isChileanDocument: false,
          language: 'es',
          hasRUT: false,
          hasIVA: false
        },
        confidence: 0.1,
        processingTime,
        error: errorMessage
      };
    }
  }

  /**
   * Build analysis prompt optimized for Chilean financial documents
   */
  private buildChileanAnalysisPrompt(documentType?: string): string {
    return `
Analiza esta imagen de un documento financiero chileno y devuelve EXACTAMENTE la estructura JSON solicitada.

IMPORTANTE: Responde SOLO con JSON válido, sin markdown, sin explicaciones adicionales.

ESTRUCTURA REQUERIDA:
{
  "extractedText": "todo el texto visible en la imagen",
  "amounts": [lista de números encontrados],
  "dates": ["fechas en formato YYYY-MM-DD"],
  "merchantInfo": {
    "merchantName": "nombre del comercio",
    "rut": "RUT si está presente",
    "confidence": 0.8
  },
  "transactionInfo": {
    "transactionType": "EXPENSE o INCOME",
    "category": "categoría apropiada",
    "amount": número_principal,
    "currency": "CLP",
    "description": "descripción",
    "confidence": 0.8
  },
  "chileanContext": {
    "documentType": "BOLETA, FACTURA, COMPROBANTE, RECIBO, TRANSFERENCIA, o UNKNOWN",
    "isChileanDocument": true/false,
    "language": "es",
    "hasRUT": true/false,
    "hasIVA": true/false
  },
  "confidence": 0.8
}

CATEGORÍAS VÁLIDAS:
alimentacion, electronica, transporte, salud, educacion, servicios_basicos, entretenimiento, vestimenta, hogar, servicios_financieros, otros_gastos

COMERCIOS CHILENOS COMUNES:
Jumbo, Líder, Unimarc → alimentacion
Cruz Verde, Salcobrand → salud  
Falabella, Ripley → vestimenta
Copec, Shell → transporte
Enel, CGE → servicios_basicos

INSTRUCCIONES:
1. Extrae TODO el texto visible
2. Identifica montos (formato $1.234.567)
3. Encuentra fechas (DD/MM/YYYY, etc.)
4. Determina si es INCOME o EXPENSE
5. Categoriza apropiadamente
6. Usa monto TOTAL como amount principal

Responde SOLO con el JSON, nada más.
    `.trim();
  }

  /**
   * Analyze multiple images (for multi-page documents)
   */
  async analyzeMultipleImages(imageDataList: Array<{base64: string, mimeType: string}>, request: Omit<VisionAnalysisRequest, 'imageBase64' | 'imageMimeType'>): Promise<VisionAnalysisResult[]> {
    const results: VisionAnalysisResult[] = [];

    for (let i = 0; i < imageDataList.length; i++) {
      const imageRequest: VisionAnalysisRequest = {
        ...request,
        imageBase64: imageDataList[i].base64,
        imageMimeType: imageDataList[i].mimeType
      };

      devLogger('OpenAI Vision', `📄 Analyzing page ${i + 1} of ${imageDataList.length}`);
      const result = await this.analyzeDocumentImage(imageRequest);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate quick text analysis for comparison with OCR results
   */
  async quickTextExtraction(imageBase64: string, imageMimeType: string): Promise<string> {
    try {
      const result = await generateText({
        model: this.client('gpt-4o-mini'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all visible text from this image. Return only the text content without any analysis or formatting.'
              },
              {
                type: 'image',
                image: `data:${imageMimeType};base64,${imageBase64}`
              }
            ]
          }
        ],
        temperature: 0
      });

      return result.text;

    } catch (error) {
      devLogger('OpenAI Vision', '❌ Quick text extraction failed', { error });
      return '';
    }
  }
}

export const openAIVisionService = new OpenAIVisionService();