import { tool } from 'ai';
import { z } from 'zod';
import { documentAnalyzerService, DocumentAnalysisFeatureType } from '../../assistant-financial-documents/document-analyzer.service';

const analyzeFinancialDocumentAction = async (params: {
  bucketName: string;
  objectName: string;
  objectId: string;
  namespace?: string;
  userId?: string;
  documentType?: 'INVOICE' | 'RECEIPT' | 'BANK_STATEMENT' | 'CHECK' | 'PAYSLIP' | 'TAX_FORM' | 'OTHERS';
  language?: string;
  includeTableExtraction?: boolean;
}) => {
    const { 
      bucketName, 
      objectName, 
      objectId, 
      namespace = 'axjq1e002pwz', 
      userId, 
      documentType, 
      language, 
      includeTableExtraction = true 
    } = params;
    
    try {
      console.log(`Analyzing financial document: ${objectName} (${documentType || 'auto-detect'}) for user: ${userId}`);
      
      // Build analysis configuration
      const config = {
        features: [
          { type: 'TEXT_DETECTION' as DocumentAnalysisFeatureType, maxResults: 100 },
          { type: 'KEY_VALUE_DETECTION' as DocumentAnalysisFeatureType, maxResults: 50 }
        ],
        documentType,
        language: language || 'en',
        includeOutputLocation: true
      };

      // Add table extraction if requested  
      if (includeTableExtraction) {
        config.features.push({ 
          type: 'TABLE_EXTRACTION' as DocumentAnalysisFeatureType, 
          maxResults: 20 
        });
      }
      
      // Start document analysis
      const analysisResult = await documentAnalyzerService.analyzeDocument({
        bucketName,
        objectName,
        objectId,
        namespace,
        userId,
        config
      });

      if (analysisResult.status === 'failed') {
        return {
          success: false,
          error: analysisResult.error || 'Document analysis failed',
          message: 'Lo siento, no pude analizar el documento. Verifica que el archivo sea una imagen o PDF válido.'
        };
      }

      if (analysisResult.status === 'processing') {
        return {
          success: true,
          status: 'processing',
          jobId: analysisResult.jobId,
          message: 'Estoy analizando tu documento financiero. Te aviso cuando termine el análisis.',
          instructions: 'El análisis puede tomar unos minutos. Puedes preguntar por el estado usando el ID del trabajo.'
        };
      }

      // If completed immediately (unlikely with OCI Document AI)
      if (analysisResult.status === 'completed' && analysisResult.extractedData) {
        const { financialData, text } = analysisResult.extractedData;
        
        return {
          success: true,
          status: 'completed',
          data: {
            extractedText: text?.substring(0, 500) + (text && text.length > 500 ? '...' : ''),
            amounts: financialData?.amounts || [],
            dates: financialData?.dates || [],
            categories: financialData?.categories || [],
            merchant: financialData?.merchant,
            totalAmount: financialData?.amounts?.reduce((sum, amount) => sum + amount, 0) || 0
          },
          message: `Análisis completado! Encontré ${financialData?.amounts?.length || 0} montos y categoricé el gasto como: ${financialData?.categories?.join(', ') || 'sin categoría'}.`
        };
      }

      return {
        success: false,
        error: 'Unknown status',
        message: 'Estado desconocido del análisis del documento.'
      };

    } catch (error) {
      console.error('Error in document analysis tool:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Ocurrió un error al analizar el documento. Intenta de nuevo más tarde.'
      };
    }
};

export const analyzeFinancialDocumentTool = tool({
  description: 'Analyze financial documents (receipts, invoices, bank statements) uploaded by the user. Extracts amounts, dates, merchant info, and categorizes expenses.',
  inputSchema: z.object({
    bucketName: z.string().describe('The OCI Object Storage bucket name where the document is stored'),
    objectName: z.string().describe('The object name/key of the uploaded document'),
    objectId: z.string().describe('The OCI Object Storage object ID/OCID'),
    namespace: z.string().default('axjq1e002pwz').describe('The OCI Object Storage namespace'),
    userId: z.string().optional().describe('The user ID for tracking purposes'),
    documentType: z.enum(['INVOICE', 'RECEIPT', 'BANK_STATEMENT', 'CHECK', 'PAYSLIP', 'TAX_FORM', 'OTHERS']).optional().describe('The type of financial document'),
    language: z.string().optional().describe('Document language in BCP 47 format (e.g., en, es, pt)'),
    includeTableExtraction: z.boolean().default(true).describe('Whether to extract tables from the document')
  }),
  execute: analyzeFinancialDocumentAction
});