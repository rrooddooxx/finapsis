// Extend Bun's Env interface with our environment variables
declare module "bun" {
    interface Env {
        OPENAI_API_KEY: string;

        // OCI Core Configuration
        OCI_TENANCY_ID: string;
        OCI_USER_ID: string;
        OCI_FINGERPRINT: string;
        OCI_PRIVATE_KEY_PATH: string;
        OCI_REGION: string;
        OCI_COMPARTMENT_ID: string;

        // OCI Object Storage
        OCI_NAMESPACE: string;
        OCI_RESULTS_BUCKET?: string;

        // OCI Streaming
        OCI_STREAMING_ENDPOINT: string;
        OCI_STREAM_NAME: string;
        OCI_DOCUMENT_STREAM_OCID: string;
        OCI_STREAM_POOL_NAME: string;
        OCI_STREAM_POOL_OCID: string;
        OCI_STREAM_POOL_FQDN: string;
        OCI_CONSUMER_GROUP_NAME?: string;
        OCI_CONSUMER_INSTANCE?: string;

        // Redis Configuration (for BullMQ)
        REDIS_HOST?: string;
        REDIS_PORT?: string;
        REDIS_DB?: string;
        REDIS_PASSWORD?: string;

        // Document Processing Worker
        AUTO_START_DOCUMENT_WORKER?: string;
        DATABASE_URL?: string;
    }
}

// Export the type for backwards compatibility if needed
export type EnvVars = typeof Bun.env;