import "../../shared/envs.shared";

export interface DocumentUploadConfig {
  namespace: string;
  bucketName: string;
  bucketOcid: string;
}

class DocumentUploadConfiguration {
    private static instance: DocumentUploadConfiguration;
    private config: DocumentUploadConfig;

    private constructor() {
        this.config = this.buildConfig();
    }

    public static getInstance(): DocumentUploadConfiguration {
        if (!DocumentUploadConfiguration.instance) {
            DocumentUploadConfiguration.instance = new DocumentUploadConfiguration();
        }
        return DocumentUploadConfiguration.instance;
    }

    public getConfig(): DocumentUploadConfig {
        return this.config;
    }

    private buildConfig(): DocumentUploadConfig {
        return {
            namespace: Bun.env.OCI_NAMESPACE || '',
            bucketName: Bun.env.OCI_DOCUMENTS_BUCKET_NAME || '',
            bucketOcid: Bun.env.OCI_DOCUMENTS_BUCKET_OCID || '',
        };
    }
}

export const documentUploadConfig = DocumentUploadConfiguration.getInstance();