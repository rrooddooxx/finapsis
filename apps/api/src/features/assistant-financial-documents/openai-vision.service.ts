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

// Zod schema for structured output
const VisionAnalysisSchema = z.object({
  extractedText: z.string().default('').describe("Complete text extracted from the image"),
  amounts: z.array(z.number()).default([]).describe("All numeric amounts found in the document, sorted by relevance"),
  dates: z.array(z.string()).default([]).describe("All dates found in the document in ISO format"),
  merchantInfo: z.object({
    merchantName: z.string().default('Unknown').describe("Name of the merchant or business"),
    rut: z.string().optional().describe("Chilean RUT number if present"),
    giro: z.string().optional().describe("Business activity description"),
    address: z.string().optional().describe("Business address"),
    city: z.string().optional().describe("City location"),
    confidence: z.number().min(0).max(1).default(0).describe("Confidence in merchant identification")
  }).default({ merchantName: 'Unknown', confidence: 0 }),
  transactionInfo: z.object({
    transactionType: z.enum(['INCOME', 'EXPENSE']).default('EXPENSE').describe("Type of financial transaction"),
    category: z.string().default('otros_gastos').describe("Category of expense/income (Chilean context)"),
    subcategory: z.string().optional().describe("More specific subcategory"),
    amount: z.number().default(0).describe("Main transaction amount"),
    currency: z.string().default('CLP').describe("Currency code"),
    description: z.string().default('').describe("Transaction description"),
    confidence: z.number().min(0).max(1).default(0).describe("Confidence in classification")
  }).default({ transactionType: 'EXPENSE', category: 'otros_gastos', amount: 0, currency: 'CLP', description: '', confidence: 0 }),
  chileanContext: z.object({
    documentType: z.enum(['BOLETA', 'FACTURA', 'COMPROBANTE', 'RECIBO', 'TRANSFERENCIA', 'UNKNOWN']).default('UNKNOWN'),
    isChileanDocument: z.boolean().default(false).describe("Whether this appears to be a Chilean document"),
    language: z.enum(['es', 'en', 'mixed']).default('es').describe("Primary language of the document"),
    hasRUT: z.boolean().default(false).describe("Whether a Chilean RUT is present"),
    hasIVA: z.boolean().default(false).describe("Whether IVA (Chilean tax) is mentioned")
  }).default({ documentType: 'UNKNOWN', isChileanDocument: false, language: 'es', hasRUT: false, hasIVA: false }),
  confidence: z.number().min(0).max(1).default(0).describe("Overall confidence in the analysis")
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
        documentType: request.documentType
      });

      // Generate structured analysis using Vision model
      const result = await generateObject({
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
        temperature: 0.1, // Low temperature for consistent results
      });

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
        extractedText: '',
        amounts: [],
        dates: [],
        merchantInfo: {
          merchantName: '',
          confidence: 0
        },
        transactionInfo: {
          transactionType: 'EXPENSE',
          category: 'otros_gastos',
          amount: 0,
          currency: 'CLP',
          description: '',
          confidence: 0
        },
        chileanContext: {
          documentType: 'UNKNOWN',
          isChileanDocument: false,
          language: 'es',
          hasRUT: false,
          hasIVA: false
        },
        confidence: 0,
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
Analiza esta imagen de un documento financiero chileno con extrema precisión y extrae toda la información relevante.

CONTEXTO CHILENO IMPORTANTE:
- Busca RUT (formato: XX.XXX.XXX-X)
- Identifica tipos de documento: BOLETA ELECTRÓNICA, FACTURA, COMPROBANTE, etc.
- Reconoce comercios chilenos comunes: Jumbo, Líder, Unimarc, Copec, Shell, BancoEstado, etc.
- Formatos de moneda: $1.234.567 (punto como separador de miles)
- IVA incluido/exento
- Direcciones chilenas (comunas, regiones)

COMERCIOS Y CATEGORÍAS CHILENAS:
- Supermercados: Jumbo, Líder, Unimarc, Santa Isabel → alimentación
- Farmacias: Cruz Verde, Salcobrand, FASA → salud
- Retail: Falabella, Ripley, Paris → vestimenta/hogar
- Combustible: Copec, Shell, Petrobras → transporte
- Servicios: Enel, CGE, Aguas Andinas → servicios_básicos
- Restaurants: McDonald's, Subway, locales → alimentación
- Bancos: BancoEstado, Santander, BCI → servicios_financieros

INSTRUCCIONES DE ANÁLISIS:
1. Lee TODO el texto visible en la imagen, incluso texto pequeño o borroso
2. Identifica el comercio/merchant exactamente como aparece
3. Extrae TODOS los montos numéricos (precios, subtotales, total, IVA)
4. Encuentra fechas en cualquier formato (DD/MM/YYYY, DD-MM-YYYY, etc.)
5. Determina si es INGRESO (sueldo, venta, transferencia recibida) o GASTO (compra, pago)
6. Clasifica en categorías chilenas apropiadas
7. Calcula el monto principal de la transacción (usualmente el TOTAL)

CATEGORÍAS CHILENAS:
- alimentacion (supermercados, restaurantes, comida)
- electronica (computadores, celulares, TV, tablets, tarjetas SD, accesorios tech)
- transporte (combustible, transporte público, Uber, taxi)
- salud (farmacias, consultas médicas, medicamentos)
- educacion (colegios, universidades, libros, cursos)
- servicios_basicos (luz, agua, gas, internet, telefonía)
- entretenimiento (cine, eventos, streaming, juegos)
- vestimenta (ropa, calzado, accesorios)
- hogar (muebles, electrodomésticos, decoración)
- servicios_financieros (bancos, seguros, créditos)
- otros_gastos (misceláneos)

Responde con la máxima precisión posible, especialmente para el contexto chileno.
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