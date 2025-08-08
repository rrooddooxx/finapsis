import { tool } from 'ai';
import { z } from 'zod';
import { documentAnalyzerService } from '../../assistant-financial-documents/document-analyzer.service';

const checkDocumentAnalysisStatusAction = async (params: { jobId: string }) => {
    const { jobId } = params;
    try {
      console.log(`Checking analysis status for job: ${jobId}`);
      
      const result = await documentAnalyzerService.getAnalysisResult(jobId);

      if (result.status === 'processing') {
        return {
          success: true,
          status: 'processing',
          message: 'El análisis todavía está en proceso. Te aviso cuando esté listo.',
          jobId
        };
      }

      if (result.status === 'failed') {
        return {
          success: false,
          status: 'failed',
          error: result.error,
          message: `El análisis falló: ${result.error}. Puedes intentar subir el documento de nuevo.`
        };
      }

      if (result.status === 'completed' && result.extractedData) {
        const { financialData, text, tables, keyValues } = result.extractedData;
        
        const summary = {
          totalAmounts: financialData?.amounts?.length || 0,
          totalSpent: financialData?.amounts?.reduce((sum, amount) => sum + amount, 0) || 0,
          merchant: financialData?.merchant,
          categories: financialData?.categories || [],
          dates: financialData?.dates || [],
          hasStructuredData: (tables && tables.length > 0) || (keyValues && keyValues.length > 0)
        };

        return {
          success: true,
          status: 'completed',
          jobId,
          summary,
          data: {
            extractedText: text?.substring(0, 500) + (text && text.length > 500 ? '...' : ''),
            financialData,
            tablesFound: tables?.length || 0,
            keyValuePairsFound: keyValues?.length || 0
          },
          message: `¡Análisis completado! 
            - Comercio: ${summary.merchant || 'No identificado'}
            - Total gastado: $${summary.totalSpent.toFixed(2)}
            - Categorías: ${summary.categories.join(', ') || 'Sin categoría'}
            - Fechas encontradas: ${summary.dates.join(', ') || 'No encontradas'}
            ${summary.hasStructuredData ? '- Se encontraron datos estructurados (tablas/pares clave-valor)' : ''}`
        };
      }

      return {
        success: false,
        error: 'Unexpected status',
        message: 'Estado inesperado del análisis. Contacta soporte.'
      };

    } catch (error) {
      console.error('Error checking document analysis status:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Error al verificar el estado del análisis. Intenta de nuevo.'
      };
    }
};

export const checkDocumentAnalysisStatusTool = tool({
  description: 'Check the status of a document analysis job and get results when completed',
  inputSchema: z.object({
    jobId: z.string().describe('The document analysis job ID to check')
  }),
  execute: checkDocumentAnalysisStatusAction
});