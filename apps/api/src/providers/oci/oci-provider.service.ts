import * as common from "oci-common";
import * as streaming from "oci-streaming";
import * as objectstorage from "oci-objectstorage";
import * as aidocument from "oci-aidocument";
import "../../shared/envs.shared"; // Import for Bun.env typing

export class OCIProviderService {
    private provider: common.AuthenticationDetailsProvider | null = null;

    constructor() {
        // Lazy initialization to avoid errors during module load
    }

    private getProvider(): common.AuthenticationDetailsProvider {
        if (!this.provider) {
            this.provider = this.createAuthenticationProvider();
        }
        return this.provider;
    }

    private createAuthenticationProvider(): common.AuthenticationDetailsProvider {
        // Check if we have all required environment variables
        const tenancyId = Bun.env.OCI_TENANCY_ID;
        const userId = Bun.env.OCI_USER_ID;
        const fingerprint = Bun.env.OCI_FINGERPRINT;
        const privateKeyPath = Bun.env.OCI_PRIVATE_KEY_PATH;
        const region = Bun.env.OCI_REGION;

        if (!tenancyId || !userId || !fingerprint || !privateKeyPath) {
            console.warn("⚠️ OCI environment variables not fully configured, falling back to config file");
            try {
                return new common.ConfigFileAuthenticationDetailsProvider();
            } catch (error) {
                throw new Error(`OCI authentication failed. Please ensure either:
1. Environment variables are set: OCI_TENANCY_ID, OCI_USER_ID, OCI_FINGERPRINT, OCI_PRIVATE_KEY_PATH
2. Or OCI config file exists at ~/.oci/config

Current error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // Expand tilde (~) in private key path
        const expandedKeyPath = privateKeyPath.startsWith('~') 
            ? privateKeyPath.replace('~', process.env.HOME || process.env.USERPROFILE || '')
            : privateKeyPath;

        // Validate that the key file exists and is readable
        try {
            const fs = require('fs');
            console.log(`🔑 Attempting to read private key from: ${expandedKeyPath}`);
            
            if (!fs.existsSync(expandedKeyPath)) {
                throw new Error(`Private key file not found at: ${expandedKeyPath}`);
            }
            
            // Test if we can read the file
            const keyContent = fs.readFileSync(expandedKeyPath, 'utf8');
            console.log(`🔑 Key file read successfully, length: ${keyContent.length} chars`);
            console.log(`🔑 Key starts with: ${keyContent.substring(0, 50)}...`);
            
            if (!keyContent.includes('BEGIN PRIVATE KEY') && !keyContent.includes('BEGIN RSA PRIVATE KEY')) {
                throw new Error(`Invalid private key format in file: ${expandedKeyPath}. Expected PEM format.`);
            }
            
            console.log(`🔑 Private key validation passed`);
        } catch (error) {
            console.error(`🔑 Private key validation failed:`, error);
            throw new Error(`Private key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Map region string to OCI Region enum
        let ociRegion: common.Region = common.Region.US_PHOENIX_1; // Default
        if (region) {
            switch (region.toLowerCase()) {
                case 'us-phoenix-1':
                    ociRegion = common.Region.US_PHOENIX_1;
                    break;
                case 'us-ashburn-1':
                    ociRegion = common.Region.US_ASHBURN_1;
                    break;
                case 'eu-frankfurt-1':
                    ociRegion = common.Region.EU_FRANKFURT_1;
                    break;
                case 'ap-tokyo-1':
                    ociRegion = common.Region.AP_TOKYO_1;
                    break;
                // Add more regions as needed
                default:
                    console.warn(`Unknown region ${region}, using default us-phoenix-1`);
                    ociRegion = common.Region.US_PHOENIX_1;
            }
        }
        
        // Try to pass the key content directly instead of the file path
        try {
            const fs = require('fs');
            const keyContent = fs.readFileSync(expandedKeyPath, 'utf8');
            
            console.log(`🔑 Creating authentication provider with key content directly`);
            
            // Create authentication provider from environment variables with key content
            return new common.SimpleAuthenticationDetailsProvider(
                tenancyId,
                userId,
                fingerprint,
                keyContent, // Pass key content directly instead of file path
                null, // passphrase (if private key is encrypted)
                ociRegion
            );
        } catch (directKeyError) {
            console.error(`🔑 Direct key content failed, falling back to file path:`, directKeyError);
            
            // Fallback to file path method
            return new common.SimpleAuthenticationDetailsProvider(
                tenancyId,
                userId,
                fingerprint,
                expandedKeyPath,
                null, // passphrase (if private key is encrypted)
                ociRegion
            );
        }
    }

    createStreamClient(): streaming.StreamClient {
        const client = new streaming.StreamClient({
            authenticationDetailsProvider: this.getProvider()
        });

        client.endpoint = Bun.env.OCI_STREAMING_ENDPOINT ||
            "https://cell-1.streaming.us-phoenix-1.oci.oraclecloud.com";

        return client;
    }

    createObjectStorageClient(): objectstorage.ObjectStorageClient {
        return new objectstorage.ObjectStorageClient({
            authenticationDetailsProvider: this.getProvider()
        });
    }

    createAIDocumentClient(): aidocument.AIServiceDocumentClient {
        console.log(`🏥 Creating AI Document client with authentication...`);
        return new aidocument.AIServiceDocumentClient({
            authenticationDetailsProvider: this.getProvider()
        });
    }

    getAuthProvider(): common.AuthenticationDetailsProvider {
        return this.getProvider();
    }
}

export const ociProviderService = new OCIProviderService();