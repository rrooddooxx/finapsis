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

            // Add output location if configured
            if (config.includeOutputLocation !== false) {
                analyzeDocumentDetails.outputLocation = {
                    namespaceName: docAIConfig.namespace || request.namespace,
                    bucketName: docAIConfig.resultsbucket || request.bucketName,
                    prefix: `results/${Date.now()}_${request.objectName}`
                };
            }

            devLogger("🔄 OCI Document AI request payload:", JSON.stringify(analyzeDocumentDetails, null, 2));

            const response = await this.aiDocumentClient.analyzeDocument({
                analyzeDocumentDetails
            });

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
            devLogger("❌ Error analyzing document:", JSON.stringify(error));

            return {
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
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
        return {
            features: defaultFeatures,
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
            devLogger("📝 Extracted text length:", extractedText.length, "characters");
            devLogger("📄 Extracted text preview:", extractedText.substring(0, 200) + "...");

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
            devLogger("❌ Error parsing analysis results:", error);
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
        const amountRegex = /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
        const matches = text.match(amountRegex) || [];
        return matches.map(match => parseFloat(match.replace(/[$,]/g, '')));
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