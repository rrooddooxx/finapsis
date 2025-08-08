import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { devLogger } from "../../utils/logger.utils";
import { z } from "zod";
import { documentConverterService } from "./document-converter.service";

export interface DocumentTypeClassificationRequest {
  bucketName: string;
  objectName: string;
  namespace: string;
  userId: string;
}

export interface DocumentTypeClassificationResult {
  success: boolean;
  documentType: 'EXPENSE' | 'INCOME';
  confidence: number;
  reasoning: string;
  suggestedCategory?: string;
  merchant?: string;
  processingTime: number;
  error?: string;
}

// Zod schema for document type classification
const DocumentTypeSchema = z.object({
  documentType: z.enum(['EXPENSE', 'INCOME']).describe("Whether this document represents an expense (purchase/payment) or income (salary/sale/transfer received)"),
  confidence: z.number().min(0).max(1).describe("Confidence level in classification (0.0 to 1.0)"),
  reasoning: z.string().min(10).describe("Brief explanation of classification decision - at least 10 characters"),
  suggestedCategory: z.string().default("general").describe("Suggested specific category - use 'general' if unclear"),
  merchant: z.string().default("unknown").describe("Merchant/business name - use 'unknown' if not identifiable")
});

export class DocumentTypeClassifierService {
  
  /**
   * First-stage classifier: Determine if document is EXPENSE or INCOME
   * This runs before the main processing pipeline to split flows
   */
  async classifyDocumentType(request: DocumentTypeClassificationRequest): Promise<DocumentTypeClassificationResult> {
    const startTime = Date.now();

    try {
      devLogger('DocumentTypeClassifier', `🔍 Starting document type classification - Object: ${request.objectName}`);

      // Convert document to images for Vision API analysis
      const conversionResult = await documentConverterService.convertToImages({
        bucketName: request.bucketName,
        objectName: request.objectName,
        namespace: request.namespace,
        userId: request.userId
      });

      if (!conversionResult.success || conversionResult.imageData.length === 0) {
        return {
          success: false,
          documentType: 'EXPENSE', // Default to expense
          confidence: 0.5,
          reasoning: 'Unable to convert document for analysis - defaulting to expense',
          processingTime: Date.now() - startTime,
          error: 'Document conversion failed'
        };
      }

      // Use first image for classification
      const firstImage = conversionResult.imageData[0];
      
      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: this.buildClassificationPrompt()
              },
              {
                type: 'image',
                image: `data:${firstImage.mimeType};base64,${firstImage.base64}`
              }
            ]
          }
        ],
        schema: DocumentTypeSchema,
        temperature: 0.1, // Low temperature for consistent classification
        maxRetries: 3 // Retry on schema validation failures
      });

      const processingTime = Date.now() - startTime;

      devLogger('DocumentTypeClassifier', `✅ Classification completed - Type: ${result.object.documentType}, Confidence: ${result.object.confidence}, Processing: ${processingTime}ms`);

      return {
        success: true,
        documentType: result.object.documentType,
        confidence: result.object.confidence,
        reasoning: result.object.reasoning,
        suggestedCategory: result.object.suggestedCategory,
        merchant: result.object.merchant,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      devLogger('DocumentTypeClassifier', `❌ Classification failed: ${errorMessage}`);

      return {
        success: false,
        documentType: 'EXPENSE', // Default fallback
        confidence: 0.3,
        reasoning: 'Classification failed - defaulting to expense',
        processingTime,
        error: errorMessage
      };
    }
  }

  /**
   * Build focused prompt for document type classification
   */
  private buildClassificationPrompt(): string {
    return `
Analiza esta imagen de documento financiero chileno y determina si representa un GASTO (EXPENSE) o un INGRESO (INCOME).

INSTRUCCIONES IMPORTANTES:
- Responde EXACTAMENTE en el formato JSON requerido
- "confidence" debe ser un número decimal entre 0.0 y 1.0
- "reasoning" debe explicar tu decisión con al menos 10 caracteres
- "suggestedCategory" usa una categoría específica o "general"
- "merchant" usa el nombre visible o "unknown"

CRITERIOS PARA GASTOS (EXPENSE):
- Boletas de compra (productos, servicios)
- Facturas que el usuario debe pagar
- Recibos de pagos realizados
- Comprobantes de transferencias enviadas
- Compras en tiendas, restaurants, servicios
- Ejemplos: boletas de supermercado, facturas de servicios básicos, compras online

CRITERIOS PARA INGRESOS (INCOME):
- Liquidaciones de sueldo
- Comprobantes de transferencias RECIBIDAS
- Facturas que el usuario emite a sus clientes
- Comprobantes de ventas realizadas
- Depósitos bancarios
- Ejemplos: liquidación de sueldo, transferencia recibida, factura emitida

CONTEXTO CHILENO:
- Boletas electrónicas típicamente son gastos
- Si dice "liquidación de sueldo" → INCOME
- Si dice "transferencia recibida" → INCOME  
- Si dice "factura por servicios prestados" → INCOME
- Si muestra compra en tienda (Jumbo, Falabella, etc.) → EXPENSE
- Si es una factura SII que el usuario emite → INCOME

Analiza el documento y responde en formato JSON estructurado.
    `.trim();
  }
}

export const documentTypeClassifierService = new DocumentTypeClassifierService();