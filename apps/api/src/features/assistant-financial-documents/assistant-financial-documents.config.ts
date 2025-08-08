import "../../shared/envs.shared"; // Import for Bun.env typing
import {DocumentAnalysisFeatureType} from "./document-analyzer.service";

export interface FinancialDocumentsConfig {
    // OCI Streaming Configuration
    streaming: {
        streamId: string;
        streamName: string;
        endpoint: string;
        poolName: string;
        poolOcid: string;
        poolFqdn: string;
        consumerGroup: string;
        consumerInstance: string;
    };

    // OCI Document AI Configuration
    documentAI: {
        compartmentId: string;
        namespace: string;
        region: string;
    };

    // Processing Configuration
    processing: {
        batchSize: number;
        pollingDelaySeconds: number;
        errorRetryDelaySeconds: number;
        autoStartWorker: boolean;
    };

    // Document Analysis Features by Type
    analysisFeatures: {
        [key: string]: {
            type: DocumentAnalysisFeatureType;
            maxResults: number;
        }[];
    };

    // Supported Document Types and Extensions
    documentTypes: {
        supportedEvents: string[];
        supportedExtensions: string[];
        typeMapping: { [pattern: string]: string };
    };

    // Language Detection
    languageDetection: {
        defaultLanguage: string;
        languagePatterns: { [pattern: string]: string };
    };
}

class FinancialDocumentsConfiguration {
    private static instance: FinancialDocumentsConfiguration;
    private config: FinancialDocumentsConfig;

    private constructor() {
        this.config = this.buildConfig();
    }

    public static getInstance(): FinancialDocumentsConfiguration {
        if (!FinancialDocumentsConfiguration.instance) {
            FinancialDocumentsConfiguration.instance = new FinancialDocumentsConfiguration();
        }
        return FinancialDocumentsConfiguration.instance;
    }

    public getConfig(): FinancialDocumentsConfig {
        return this.config;
    }

    public getStreamingConfig() {
        return this.config.streaming;
    }

    public getDocumentAIConfig() {
        return this.config.documentAI;
    }

    public getProcessingConfig() {
        return this.config.processing;
    }

    public getFeaturesForDocumentType(documentType: string) {
        return this.config.analysisFeatures[documentType] || this.config.analysisFeatures.default;
    }

    public getDocumentTypesConfig() {
        return this.config.documentTypes;
    }

    public getLanguageDetectionConfig() {
        return this.config.languageDetection;
    }

    public detectDocumentType(fileName: string): string {
        const lowerFileName = fileName.toLowerCase();
        const typeMapping = this.config.documentTypes.typeMapping;

        for (const [pattern, type] of Object.entries(typeMapping)) {
            if (lowerFileName.includes(pattern)) {
                return type;
            }
        }

        return 'OTHERS';
    }

    public detectLanguage(fileName: string, compartmentName?: string): string {
        const lowerFileName = fileName.toLowerCase();
        const lowerCompartmentName = compartmentName?.toLowerCase() || '';
        const languagePatterns = this.config.languageDetection.languagePatterns;

        // Check filename patterns
        for (const [pattern, language] of Object.entries(languagePatterns)) {
            if (lowerFileName.includes(pattern) || lowerCompartmentName.includes(pattern)) {
                return language;
            }
        }

        return this.config.languageDetection.defaultLanguage;
    }

    public isDocumentUploadEvent(eventType: string, fileName: string): boolean {
        const {supportedEvents, supportedExtensions} = this.config.documentTypes;

        const isUploadEvent = supportedEvents.some(event =>
            eventType?.toLowerCase().includes(event.toLowerCase())
        );

        const isDocumentFile = supportedExtensions.some(ext =>
            fileName?.toLowerCase().endsWith(ext)
        );

        return isUploadEvent && isDocumentFile;
    }

    public validateRequiredConfig(): { isValid: boolean; missingKeys: string[] } {
        const missingKeys: string[] = [];

        if (!this.config.streaming.streamId) missingKeys.push('OCI_DOCUMENT_STREAM_OCID');
        if (!this.config.documentAI.compartmentId) missingKeys.push('OCI_COMPARTMENT_ID');
        if (!this.config.streaming.poolOcid) missingKeys.push('OCI_STREAM_POOL_OCID');

        return {
            isValid: missingKeys.length === 0,
            missingKeys
        };
    }

    private buildConfig(): FinancialDocumentsConfig {
        return {
            streaming: {
                streamId: Bun.env.OCI_DOCUMENT_STREAM_OCID || '',
                streamName: Bun.env.OCI_STREAM_NAME || 'object-storage-create',
                endpoint: Bun.env.OCI_STREAMING_ENDPOINT || 'https://cell-1.streaming.us-phoenix-1.oci.oraclecloud.com',
                poolName: Bun.env.OCI_STREAM_POOL_NAME || 'DefaultPool',
                poolOcid: Bun.env.OCI_STREAM_POOL_OCID || '',
                poolFqdn: Bun.env.OCI_STREAM_POOL_FQDN || 'cell-1.streaming.us-phoenix-1.oci.oraclecloud.com',
                consumerGroup: Bun.env.OCI_CONSUMER_GROUP_NAME || 'financial-documents-processor',
                consumerInstance: Bun.env.OCI_CONSUMER_INSTANCE || `instance-${Date.now()}`
            },

            documentAI: {
                compartmentId: Bun.env.OCI_COMPARTMENT_ID || '',
                namespace: Bun.env.OCI_NAMESPACE || 'axjq1e002pwz',
                region: Bun.env.OCI_REGION || 'us-phoenix-1'
            },

            processing: {
                batchSize: 10,
                pollingDelaySeconds: 2,
                errorRetryDelaySeconds: 10,
                autoStartWorker: Bun.env.AUTO_START_DOCUMENT_WORKER === 'true'
            },

            analysisFeatures: {
                default: [
                    {type: 'TEXT_DETECTION', maxResults: 100},
                    {type: 'KEY_VALUE_DETECTION', maxResults: 50},
                    {type: 'TABLE_EXTRACTION', maxResults: 20}
                ],
                RECEIPT: [
                    {type: 'TEXT_DETECTION', maxResults: 100},
                    {type: 'KEY_VALUE_DETECTION', maxResults: 50},
                    {type: 'TABLE_EXTRACTION', maxResults: 20}
                ],
                INVOICE: [
                    {type: 'TEXT_DETECTION', maxResults: 100},
                    {type: 'KEY_VALUE_DETECTION', maxResults: 50},
                    {type: 'TABLE_EXTRACTION', maxResults: 20}
                ],
                BANK_STATEMENT: [
                    {type: 'TEXT_DETECTION', maxResults: 100},
                    {type: 'KEY_VALUE_DETECTION', maxResults: 50},
                    {type: 'TABLE_EXTRACTION', maxResults: 50}
                ],
                TAX_FORM: [
                    {type: 'TEXT_DETECTION', maxResults: 100},
                    {type: 'KEY_VALUE_DETECTION', maxResults: 50},
                    {type: 'TABLE_EXTRACTION', maxResults: 30}
                ],
                CHECK: [
                    {type: 'TEXT_DETECTION', maxResults: 100},
                    {type: 'KEY_VALUE_DETECTION', maxResults: 30}
                ],
                PAYSLIP: [
                    {type: 'TEXT_DETECTION', maxResults: 100},
                    {type: 'KEY_VALUE_DETECTION', maxResults: 40},
                    {type: 'TABLE_EXTRACTION', maxResults: 15}
                ]
            },

            documentTypes: {
                supportedEvents: [
                    'ObjectCreated',
                    'com.oraclecloud.objectstorage.createobject'
                ],
                supportedExtensions: [
                    '.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp'
                ],
                typeMapping: {
                    'receipt': 'RECEIPT',
                    'recibo': 'RECEIPT',
                    'boleta': 'RECEIPT',
                    'invoice': 'INVOICE',
                    'factura': 'INVOICE',
                    'bank': 'BANK_STATEMENT',
                    'statement': 'BANK_STATEMENT',
                    'estado_cuenta': 'BANK_STATEMENT',
                    'check': 'CHECK',
                    'cheque': 'CHECK',
                    'payslip': 'PAYSLIP',
                    'nomina': 'PAYSLIP',
                    'tax': 'TAX_FORM',
                    'impuesto': 'TAX_FORM'
                }
            },

            languageDetection: {
                defaultLanguage: 'es',
                languagePatterns: {
                    'recibo': 'es',
                    'factura': 'es',
                    'nomina': 'es',
                    'estado_cuenta': 'es',
                    'impuesto': 'es',
                    'chile': 'es',
                    'mx': 'es',
                    'es': 'es',
                    'brasil': 'pt',
                    'br': 'pt'
                }
            }
        };
    }
}

// Export singleton instance
export const financialDocumentsConfig = FinancialDocumentsConfiguration.getInstance();