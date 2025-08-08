import * as aidocument from "oci-aidocument";
import {ociProviderService} from "../../providers/oci/oci-provider.service";
import {devLogger} from "../../utils/logger.utils";
import {financialDocumentsConfig} from "./assistant-financial-documents.config";

export type DocumentAnalysisFeatureType =
    'TEXT_DETECTION'
    | 'KEY_VALUE_DETECTION'
    | 'TABLE_EXTRACTION'
    | 'LANGUAGE_CLASSIFICATION'
    | 'DOCUMENT_CLASSIFICATION';

export interface DocumentAnalysisConfig {
    features: {
        type: DocumentAnalysisFeatureType;
        maxResults?: number;
    }[];
    documentType?: 'INVOICE' | 'RECEIPT' | 'BANK_STATEMENT' | 'CHECK' | 'PAYSLIP' | 'TAX_FORM' | 'OTHERS';
    language?: string; // BCP 47 format like 'en', 'es', etc.
    includeOutputLocation?: boolean;
}

export interface DocumentAnalysisRequest {
    bucketName: string;
    objectName: string;
    objectId: string;
    namespace: string;
    compartmentId?: string;
    userId?: string;
    config?: DocumentAnalysisConfig;
}

export interface DocumentAnalysisResult {
    jobId?: string;
    status: 'processing' | 'completed' | 'failed';
    extractedData?: {
        text?: string;
        tables?: any[];
        keyValues?: any[];
        financialData?: {
            amounts: number[];
            dates: string[];
            categories: string[];
            merchant: string | null;
        };
        documentClassification?: {
            documentType: string;
            confidence: number;
            categories: string[];
            language?: string;
        };
        metadata?: {
            pageCount?: number;
            mimeType?: string;
            extractedAt?: string;
        };
    };
    error?: string;
}

export class DocumentAnalyzerService {
    private aiDocumentClient: aidocument.AIServiceDocumentClient;

    constructor() {
        this.aiDocumentClient = ociProviderService.createAIDocumentClient();
    }

    async analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResult> {
        try {
            devLogger(`🤖 Starting AI analysis for document: ${request.objectName} (ID: ${request.objectId})`);
            devLogger("📥 Full analysis request:", JSON.stringify(request, null, 2));

            const config = request.config || this.getDefaultAnalysisConfig();
            const documentType = config.documentType || financialDocumentsConfig.detectDocumentType(request.objectName);
            const docAIConfig = financialDocumentsConfig.getDocumentAIConfig();

            const documentDetails = {
                source: "OBJECT_STORAGE" as const,
                namespaceName: request.namespace || docAIConfig.namespace,
                bucketName: request.bucketName,
                objectName: request.objectName
            };

            const features = this.buildAnalysisFeatures(config);

            const analyzeDocumentDetails: any = {
                features,
                document: documentDetails,
                compartmentId: request.compartmentId || docAIConfig.compartmentId,
                documentType: documentType,
                language: config.language || 'es'
            };

            // Note: No outputLocation needed - processing via streaming from upload bucket directly

            devLogger("🔄 OCI Document AI request payload:", JSON.stringify(analyzeDocumentDetails, null, 2));

            // Add debug info about the client configuration
            devLogger("🔧 OCI Document AI client config:", {
                compartmentId: analyzeDocumentDetails.compartmentId,
                documentType: analyzeDocumentDetails.documentType,
                language: analyzeDocumentDetails.language,
                featureCount: analyzeDocumentDetails.features?.length
            });

            // Implement timeout-based fallback since OCI SDK handles retries internally
            const timeoutMs = 30000; // 30 seconds timeout
            let response: any = null;
            
            try {
                devLogger(`DocumentAnalyzer`, `🔄 Starting OCI Document AI analysis with ${timeoutMs/1000}s timeout`);
                
                response = await Promise.race([
                    this.aiDocumentClient.analyzeDocument({
                        analyzeDocumentDetails
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('OCI Document AI timeout')), timeoutMs)
                    )
                ]);
                
                devLogger(`DocumentAnalyzer`, `✅ OCI Document AI completed successfully`);
                
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                devLogger(`DocumentAnalyzer`, `❌ OCI Document AI failed or timed out: ${errorMessage}`);
                devLogger(`DocumentAnalyzer`, `💀 Skipping OCI Document AI, continuing with OpenAI Vision fallback`);
                
                // Return a fallback response that indicates OCR failed but allows processing to continue
                return {
                    status: 'completed',
                    extractedData: {
                        text: '', // Empty text - next steps will use OpenAI Vision instead
                        tables: [],
                        keyValues: [],
                        financialData: {
                            amounts: [],
                            dates: [],
                            categories: [],
                            merchant: null
                        },
                        documentClassification: {
                            documentType: 'OTHERS',
                            confidence: 0,
                            categories: [],
                            language: 'es'
                        },
                        metadata: {
                            ociAnalysisFailed: true,
                            failureReason: errorMessage.includes('timeout') ? 'OCI Document AI timeout' : 'OCI Document AI error',
                            extractedAt: new Date().toISOString()
                        }
                    }
                };
            }

            devLogger("🎉 OCI Document AI response:", JSON.stringify(response, null, 2));

            // Check if this is a synchronous response with immediate results
            const responseData = response as unknown;
            if (typeof responseData === 'object' && responseData !== null) {
                const obj = responseData as Record<string, unknown>;

                // Handle synchronous response with immediate results
                if (obj.analyzeDocumentResult && typeof obj.analyzeDocumentResult === 'object') {
                    devLogger("📋 Synchronous response detected - processing immediate results");
                    const extractedData = await this.parseAnalysisResults(obj.analyzeDocumentResult);

                    return {
                        status: 'completed',
                        extractedData
                    };
                }

                // Handle async response with job ID
                let jobId: string | undefined;
                if (obj.processorJob && typeof obj.processorJob === 'object') {
                    const job = obj.processorJob as Record<string, unknown>;
                    if (typeof job.id === 'string') {
                        jobId = job.id;
                    }
                } else if (typeof obj.jobId === 'string') {
                    jobId = obj.jobId;
                }

                if (jobId) {
                    devLogger(`✨ Document analysis job created: ${jobId}`);
                    return {
                        jobId: jobId,
                        status: 'processing'
                    };
                }
            }

            devLogger("⚠️ Unexpected response format - no results or job ID found");
            return {
                status: 'failed',
                error: 'Unexpected response format from OCI Document AI'
            };

        } catch (error) {
            // Enhanced error logging for OCI SDK issues
            const errorDetails = this.extractOCIErrorDetails(error);
            devLogger("❌ OCI Document AI error details:", JSON.stringify(errorDetails, null, 2));

            return {
                status: 'failed',
                error: errorDetails.message || 'OCI Document AI request failed'
            };
        }
    }

    /**
     * Extract detailed error information from OCI SDK errors
     */
    private extractOCIErrorDetails(error: unknown): any {
        const details: any = {
            timestamp: new Date().toISOString(),
            type: error?.constructor?.name || 'UnknownError'
        };

        if (error instanceof Error) {
            details.message = error.message;
            details.stack = error.stack;
        } else {
            details.message = String(error);
        }

        // OCI SDK specific error properties
        if (typeof error === 'object' && error !== null) {
            const ociError = error as any;
            
            // Common OCI error properties
            details.statusCode = ociError.statusCode;
            details.code = ociError.code;
            details.opcRequestId = ociError.opcRequestId;
            details.targetService = ociError.targetService;
            details.operationName = ociError.operationName;
            details.cause = ociError.cause;
            
            // Try to extract response body if available
            if (ociError.response) {
                details.response = {
                    status: ociError.response.status,
                    statusText: ociError.response.statusText,
                    headers: ociError.response.headers
                };
                
                // Try to extract response body
                if (ociError.response.data) {
                    details.responseData = ociError.response.data;
                }
            }
            
            // Extract any other enumerable properties
            for (const key of Object.keys(ociError)) {
                if (!details.hasOwnProperty(key) && key !== 'stack') {
                    details[key] = ociError[key];
                }
            }
        }

        return details;
    }

    async getAnalysisResult(jobId: string): Promise<DocumentAnalysisResult> {
        try {
            const response = await this.aiDocumentClient.getProcessorJob({
                processorJobId: jobId
            });

            const job = response.processorJob;

            if (job.lifecycleState === 'SUCCEEDED') {
                const extractedData = await this.parseAnalysisResults(job);

                return {
                    jobId,
                    status: 'completed',
                    extractedData
                };
            } else if (job.lifecycleState === 'FAILED') {
                return {
                    jobId,
                    status: 'failed',
                    error: job.lifecycleDetails || 'Analysis failed'
                };
            } else {
                return {
                    jobId,
                    status: 'processing'
                };
            }

        } catch (error) {
            console.error("Error getting analysis result:", error);

            return {
                jobId,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private getDefaultAnalysisConfig(): DocumentAnalysisConfig {
        const defaultFeatures = financialDocumentsConfig.getFeaturesForDocumentType('default');
        // Always include document classification for financial documents
        const featuresWithClassification = [
            ...defaultFeatures,
            { type: 'DOCUMENT_CLASSIFICATION' as DocumentAnalysisFeatureType, maxResults: 10 }
        ];
        
        return {
            features: featuresWithClassification,
            language: 'es',
            includeOutputLocation: true
        };
    }

    private buildAnalysisFeatures(config: DocumentAnalysisConfig) {
        return config.features
            .filter(feature => this.isFeatureSupportedForDocumentType(feature.type, config.documentType))
            .map(feature => ({
                featureType: this.mapFeatureTypeToOCI(feature.type),
                maxResults: feature.maxResults || 50
            }));
    }

    private isFeatureSupportedForDocumentType(featureType: string, documentType?: string): boolean {
        // KEY_VALUE_EXTRACTION is only supported for specific document types
        if (featureType === 'KEY_VALUE_DETECTION') {
            const supportedTypes = ['INVOICE', 'RECEIPT', 'BANK_STATEMENT', 'CHECK', 'PAYSLIP', 'TAX_FORM'];
            return supportedTypes.includes(documentType || '');
        }
        
        // TABLE_EXTRACTION is not supported for Spanish documents in OCI
        // Skip table extraction for Spanish/Chilean documents to avoid errors
        if (featureType === 'TABLE_EXTRACTION') {
            devLogger('DocumentAnalyzer', '⚠️ Skipping TABLE_EXTRACTION for Spanish documents due to OCI limitations');
            return false;
        }

        // All other features are supported for all document types
        return true;
    }

    private mapFeatureTypeToOCI(featureType: string): string {
        const featureTypeMap: Record<string, string> = {
            'TEXT_DETECTION': 'TEXT_EXTRACTION',
            'KEY_VALUE_DETECTION': 'KEY_VALUE_EXTRACTION',
            'TABLE_EXTRACTION': 'TABLE_EXTRACTION',
            'LANGUAGE_CLASSIFICATION': 'LANGUAGE_CLASSIFICATION',
            'DOCUMENT_CLASSIFICATION': 'DOCUMENT_CLASSIFICATION'
        };

        return featureTypeMap[featureType] || featureType;
    }

    private async parseAnalysisResults(analysisResult: any): Promise<any> {
        try {
            devLogger("🔍 Parsing analysis results:", JSON.stringify(analysisResult, null, 2));

            // Extract text from words array in pages
            let extractedText = '';
            const tables: any[] = [];
            const keyValues: any[] = [];

            if (analysisResult.pages && Array.isArray(analysisResult.pages)) {
                for (const page of analysisResult.pages) {
                    // Extract text from words
                    if (page.words && Array.isArray(page.words)) {
                        const pageText = page.words.map((word: any) => word.text).join(' ');
                        extractedText += pageText + '\n';
                    }

                    // Extract tables if present
                    if (page.tables && Array.isArray(page.tables)) {
                        tables.push(...page.tables);
                    }

                    // Extract key-value pairs if present
                    if (page.keyValuePairs && Array.isArray(page.keyValuePairs)) {
                        keyValues.push(...page.keyValuePairs);
                    }
                }
            }

            // Clean up the extracted text
            extractedText = extractedText.trim();
            devLogger('DocumentAnalyzer', `📝 Extracted text length: ${extractedText.length} characters`);
            devLogger('DocumentAnalyzer', `📄 Extracted text preview: ${extractedText.substring(0, 200)}...`);

            const extractedData = {
                text: extractedText,
                tables: tables,
                keyValues: keyValues,
                financialData: this.processFinancialDocument(extractedText),
                metadata: {
                    pageCount: analysisResult.documentMetadata?.pageCount || 0,
                    mimeType: analysisResult.documentMetadata?.mimeType || '',
                    extractedAt: new Date().toISOString()
                }
            };

            devLogger("✅ Successfully parsed analysis results");
            return extractedData;

        } catch (error) {
            devLogger('DocumentAnalyzer', `❌ Error parsing analysis results: ${error}`);
            return null;
        }
    }

    private processFinancialDocument(text: string) {
        return {
            amounts: this.extractAmounts(text),
            dates: this.extractDates(text),
            categories: this.categorizeExpenses(text),
            merchant: this.extractMerchant(text)
        };
    }

    private extractAmounts(text: string): number[] {
        // Improved Chilean peso amount patterns
        const amountPatterns = [
            // Chilean peso with period separators: 345.980, $345.980
            /\$?(\d{1,3}(?:\.\d{3})+(?:,\d{2})?)/g,
            // Standard formats: $345,980.00, 345,980.00
            /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
            // Simple numbers that might be amounts (3+ digits)
            /\b(\d{3,})\b/g
        ];
        
        const foundAmounts = new Set<number>();
        
        for (const pattern of amountPatterns) {
            const matches = text.match(pattern) || [];
            for (const match of matches) {
                // Clean and parse the number
                let cleanAmount = match.replace(/[$,]/g, '');
                
                // Handle Chilean format (periods as thousands separator)
                if (cleanAmount.includes('.') && !cleanAmount.match(/\.\d{2}$/)) {
                    // This is likely a thousands separator, not decimal
                    cleanAmount = cleanAmount.replace(/\./g, '');
                }
                
                const amount = parseFloat(cleanAmount);
                if (!isNaN(amount) && amount >= 1) {
                    foundAmounts.add(amount);
                }
            }
        }
        
        // Return sorted amounts (largest first)
        return Array.from(foundAmounts).sort((a, b) => b - a);
    }

    private extractDates(text: string): string[] {
        const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g;
        return text.match(dateRegex) || [];
    }

    private categorizeExpenses(text: string): string[] {
        const categories = [];
        const lowerText = text.toLowerCase();

        if (lowerText.includes('restaurant') || lowerText.includes('food')) {
            categories.push('dining');
        }
        if (lowerText.includes('gas') || lowerText.includes('fuel')) {
            categories.push('transportation');
        }
        if (lowerText.includes('grocery') || lowerText.includes('supermarket')) {
            categories.push('groceries');
        }

        return categories;
    }

    private extractMerchant(text: string): string | null {
        const lines = text.split('\n');
        return lines.find(line => line.trim().length > 0) || null;
    }
}

export const documentAnalyzerService = new DocumentAnalyzerService();