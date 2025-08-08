import {generateObject} from "ai";
import {z} from "zod";
import {openAiProvider} from "../../providers/openai/openai.provider";
import {devLogger} from "../../utils/logger.utils";
import {
  ClassificationResult,
  DocumentContext,
  ExtractedFinancialData
} from "./financial-transaction-classifier.service";

// Schema for LLM structured output
const llmClassificationSchema = z.object({
    transactionType: z.enum(['INCOME', 'EXPENSE']).describe('Tipo de transacción: INCOME (ingresos) o EXPENSE (gastos)'),
    category: z.string().describe('Categoría principal de la transacción en español'),
    subcategory: z.string().optional().describe('Subcategoría específica si aplica'),
    amount: z.number().describe('Monto principal de la transacción en pesos chilenos (CLP)'),
    currency: z.string().default('CLP').describe('Moneda de la transacción'),
    merchant: z.string().optional().describe('Nombre del comercio, empresa o entidad'),
    description: z.string().describe('Descripción clara de la transacción'),
    transactionDate: z.string().describe('Fecha de la transacción en formato YYYY-MM-DD'),
    confidence: z.number().min(0).max(1).describe('Nivel de confianza de la clasificación (0-1)'),
    reasoning: z.string().describe('Explicación breve de por qué se clasificó así'),
    extractedEntities: z.object({
        amounts: z.array(z.number()).describe('Todos los montos encontrados en el documento'),
        dates: z.array(z.string()).describe('Todas las fechas encontradas'),
        businesses: z.array(z.string()).describe('Nombres de negocios o empresas encontrados'),
        categories: z.array(z.string()).describe('Posibles categorías identificadas')
    }).describe('Entidades extraídas del documento')
});

export type LLMClassificationResult = z.infer<typeof llmClassificationSchema>;

export interface LLMVerificationOptions {
    includeOriginalClassification?: boolean;
    requireHighConfidence?: boolean;
    chileanContext?: boolean;
}

export class DocumentClassificationLLMService {
    private readonly openAI;
    private readonly model = "gpt-4o-mini";

    constructor() {
        this.openAI = openAiProvider().client;
    }

    /**
     * Verify and enhance classification using OpenAI GPT
     */
    async verifyClassification(
        extractedData: ExtractedFinancialData,
        documentContext: DocumentContext,
        originalClassification?: ClassificationResult,
        options: LLMVerificationOptions = {}
    ): Promise<LLMClassificationResult> {
        devLogger('DocumentClassificationLLMService', `🤖 Starting LLM verification ${JSON.stringify({
            hasOriginalClassification: !!originalClassification,
            textLength: extractedData.text?.length || 0,
            documentType: documentContext.documentType
        })}`);

        try {
            const prompt = this.buildClassificationPrompt(
                extractedData,
                documentContext,
                originalClassification,
                options
            );

            const result = await generateObject({
                model: this.openAI(this.model),
                schema: llmClassificationSchema,
                prompt,
                temperature: 0.1, // Low temperature for consistent classification
            });

            devLogger('DocumentClassificationLLMService', `✅ LLM verification completed ${JSON.stringify({
                transactionType: result.object.transactionType,
                category: result.object.category,
                confidence: result.object.confidence,
                amount: result.object.amount
            })}`);

            return result.object;

        } catch (error) {
            devLogger('DocumentClassificationLLMService', `❌ Error in LLM verification: ${error}`);
            throw new Error(`LLM verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Classify document using only LLM (without prior OCR classification)
     */
    async classifyWithLLM(
        extractedData: ExtractedFinancialData,
        documentContext: DocumentContext,
        options: LLMVerificationOptions = {}
    ): Promise<LLMClassificationResult> {
        return this.verifyClassification(extractedData, documentContext, undefined, options);
    }

    /**
     * Compare LLM result with original classification to identify discrepancies
     */
    compareClassifications(
        llmResult: LLMClassificationResult,
        originalResult: ClassificationResult
    ): {
        hasDiscrepancies: boolean;
        discrepancies: string[];
        recommendedResult: LLMClassificationResult | ClassificationResult;
        combinedConfidence: number;
    } {
        const discrepancies: string[] = [];

        // Check transaction type
        if (llmResult.transactionType !== originalResult.transactionType) {
            discrepancies.push(`Tipo de transacción: OCR=${originalResult.transactionType}, LLM=${llmResult.transactionType}`);
        }

        // Check category
        if (llmResult.category !== originalResult.category) {
            discrepancies.push(`Categoría: OCR=${originalResult.category}, LLM=${llmResult.category}`);
        }

        // Check amount (with tolerance for small differences)
        const amountDiff = Math.abs(llmResult.amount - originalResult.amount);
        const amountTolerance = Math.max(originalResult.amount * 0.05, 100); // 5% or 100 CLP
        if (amountDiff > amountTolerance) {
            discrepancies.push(`Monto: OCR=${originalResult.amount}, LLM=${llmResult.amount}`);
        }

        const hasDiscrepancies = discrepancies.length > 0;
        let recommendedResult: LLMClassificationResult | ClassificationResult;

        // Prioritize LLM result, as it's the expert verifier.
        // Fall back to original only if LLM is not confident AND there are no discrepancies.
        if (llmResult.confidence < 0.5 && !hasDiscrepancies) {
            // LLM is not confident and agrees with the original, so we can use the original.
            recommendedResult = originalResult;
        } else {
            // Otherwise, always use the LLM's result. It was called to verify and potentially correct.
            recommendedResult = llmResult;
        }

        // Calculate combined confidence
        const combinedConfidence = hasDiscrepancies
            ? Math.max(llmResult.confidence, originalResult.confidence) * 0.8 // Penalize for discrepancies
            : Math.min(1.0, (llmResult.confidence + originalResult.confidence) / 2); // Average if they agree

        devLogger('DocumentClassificationLLMService', `🔍 Classification comparison completed`, {
            hasDiscrepancies,
            discrepancyCount: discrepancies.length,
            combinedConfidence,
            recommendedSource: recommendedResult === llmResult ? 'LLM' : 'OCR'
        });

        return {
            hasDiscrepancies,
            discrepancies,
            recommendedResult,
            combinedConfidence
        };
    }

    /**
     * Generate Chilean-specific financial insights from classification
     */
    generateFinancialInsights(result: LLMClassificationResult): string[] {
        const insights: string[] = [];

        // Amount-based insights
        if (result.amount > 50000) { // Large amount
            insights.push(`💰 Transacción significativa de $${result.amount.toLocaleString('es-CL')} CLP`);
        }

        if (result.amount < 1000) { // Small amount
            insights.push(`🔸 Monto menor: $${result.amount.toLocaleString('es-CL')} CLP`);
        }

        // Category-specific insights
        const categoryInsights: Record<string, string> = {
            'servicios_basicos': '🏠 Gasto en servicios esenciales del hogar',
            'transporte': '🚗 Gasto en movilización y transporte',
            'alimentacion': '🍽️ Gasto en comida y alimentación',
            'salud': '🏥 Inversión en salud y bienestar',
            'educacion': '📚 Inversión en educación y desarrollo',
            'sueldo': '💼 Ingreso laboral regular',
            'trabajo_independiente': '👨‍💼 Ingreso por servicios profesionales',
        };

        if (categoryInsights[result.category]) {
            insights.push(categoryInsights[result.category]);
        }

        // Confidence-based insights
        if (result.confidence < 0.5) {
            insights.push('⚠️ Clasificación con baja confianza - revisar manualmente');
        } else if (result.confidence > 0.8) {
            insights.push('✅ Clasificación de alta confianza');
        }

        return insights;
    }

    /**
     * Build comprehensive prompt for Chilean financial document classification
     */
    private buildClassificationPrompt(
        extractedData: ExtractedFinancialData,
        documentContext: DocumentContext,
        originalClassification?: ClassificationResult,
        options: LLMVerificationOptions = {}
    ): string {
        const {chileanContext = true} = options;

        let prompt = `
Eres un experto en clasificación de documentos financieros chilenos. Tu tarea es analizar el siguiente documento y extraer información de transacciones financieras.

**CONTEXTO CHILENO:**
${chileanContext ? `
- Los documentos están en español y siguen las normativas chilenas
- Las fechas pueden estar en formato DD/MM/YYYY
- Los montos están en pesos chilenos (CLP)
- Busca patrones de RUT, boletas electrónicas, facturas
- Considera empresas chilenas conocidas (Jumbo, Líder, Copec, Enel, etc.)
` : ''}

**DOCUMENTO A ANALIZAR:**
Tipo de documento: ${documentContext.documentType || 'Desconocido'}
Nombre del archivo: ${documentContext.fileName || 'Sin nombre'}
Idioma: ${documentContext.language || 'es'}

**TEXTO EXTRAÍDO:**
${extractedData.text || 'No hay texto disponible'}

**DATOS DETECTADOS:**
- Montos encontrados: ${JSON.stringify(extractedData.amounts || [])}
- Fechas encontradas: ${JSON.stringify(extractedData.dates || [])}
- Comercio detectado: ${extractedData.merchant || 'No detectado'}

${originalClassification ? `
**CLASIFICACIÓN PREVIA (para verificación):**
- Tipo: ${originalClassification.transactionType}
- Categoría: ${originalClassification.category}
- Subcategoría: ${originalClassification.subcategory || 'N/A'}
- Monto: ${originalClassification.amount} ${originalClassification.currency}
- Descripción: ${originalClassification.description}
- Confianza: ${originalClassification.confidence}
- Razón: ${originalClassification.reasoning}
` : ''}

**CATEGORÍAS CHILENAS DISPONIBLES:**

**GASTOS (EXPENSE):**
- transporte: Bencina, metro, micro, bus, taxi, Uber, Cabify, peajes, estacionamiento
- servicios_basicos: Luz (Enel, Chilectra), agua (Aguas Andinas), gas (Metrogas), internet/teléfono (Movistar, Entel, Claro, WOM, VTR)
- alimentacion: Supermercados (Jumbo, Líder, Santa Isabel, Tottus), restaurantes, comida rápida, delivery
- salud: Consultas médicas, medicamentos, farmacias (Salcobrand, Cruz Verde), clínicas, isapres
- educacion: Colegios, universidades, institutos, matrículas, libros, materiales
- entretenimiento: Cine, Netflix, Spotify, gimnasios, deportes

**INGRESOS (INCOME):**
- sueldo: Salarios, remuneraciones, liquidaciones de sueldo
- trabajo_independiente: Honorarios, freelance, servicios independientes, consultorías
- negocio: Ventas, facturas emitidas, ingresos comerciales
- inversiones: Dividendos, intereses, depósitos a plazo, rentas
- otros_ingresos: Bonos, subsidios, devoluciones, reembolsos

**INSTRUCCIONES ESPECÍFICAS:**
1. Analiza cuidadosamente el texto en español
2. Identifica el monto principal (el más significativo, no subtotales)
3. Determina si es un ingreso o gasto según el contexto
4. Clasifica en la categoría más apropiada para Chile
5. Extrae fecha más probable de la transacción
6. Identifica el comercio o empresa involucrada
7. Genera una descripción clara y útil
8. Asigna un nivel de confianza basado en la claridad de la información
9. Explica tu razonamiento brevemente

${options.requireHighConfidence ? 'IMPORTANTE: Solo procede si tienes alta confianza (>0.7) en la clasificación.' : ''}

Responde con la información estructurada solicitada.`;

        return prompt;
    }
}

export const documentClassificationLLMService = new DocumentClassificationLLMService();