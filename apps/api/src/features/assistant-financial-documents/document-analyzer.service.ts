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
                language: config.language || 'en'
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

            // Safely extract job ID from the response
            const responseData = response as unknown;
            let jobId: string | undefined;

            if (typeof responseData === 'object' && responseData !== null) {
                const obj = responseData as Record<string, unknown>;

                // Try different possible response structures
                if (obj.analyzeDocumentResult && typeof obj.analyzeDocumentResult === 'object') {
                    const result = obj.analyzeDocumentResult as Record<string, unknown>;
                    if (typeof result.jobId === 'string') {
                        jobId = result.jobId;
                    }
                } else if (obj.processorJob && typeof obj.processorJob === 'object') {
                    const job = obj.processorJob as Record<string, unknown>;
                    if (typeof job.id === 'string') {
                        jobId = job.id;
                    }
                } else if (typeof obj.jobId === 'string') {
                    jobId = obj.jobId;
                }
            }

            devLogger(`✨ Document analysis job created: ${jobId || 'No job ID found'}`);

            return {
                jobId: jobId,
                status: 'processing'
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
            language: 'en',
            includeOutputLocation: true
        };
    }

    private buildAnalysisFeatures(config: DocumentAnalysisConfig) {
        return config.features.map(feature => ({
            featureType: this.mapFeatureTypeToOCI(feature.type),
            maxResults: feature.maxResults || 50
        }));
    }

    private mapFeatureTypeToOCI(featureType: string): string {
        const featureTypeMap: Record<string, string> = {
            'TEXT_DETECTION': 'TEXT_DETECTION',
            'KEY_VALUE_DETECTION': 'KEY_VALUE_DETECTION',
            'TABLE_EXTRACTION': 'TABLE_DETECTION',
            'LANGUAGE_CLASSIFICATION': 'LANGUAGE_CLASSIFICATION',
            'DOCUMENT_CLASSIFICATION': 'DOCUMENT_CLASSIFICATION'
        };

        return featureTypeMap[featureType] || featureType;
    }

    private async parseAnalysisResults(job: any): Promise<any> {
        try {
            const extractedData = {
                text: job.outputLocation?.text || '',
                tables: job.outputLocation?.tables || [],
                keyValues: job.outputLocation?.keyValuePairs || [],
                financialData: this.processFinancialDocument(job.outputLocation?.text || '')
            };

            return extractedData;

        } catch (error) {
            console.error("Error parsing analysis results:", error);
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