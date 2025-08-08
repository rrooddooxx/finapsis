import * as objectstorage from "oci-objectstorage";
import { ociProviderService } from "../../providers/oci/oci-provider.service";
import { devLogger } from "../../utils/logger.utils";
import { documentUploadConfig } from "./document-upload.config";
import { Readable } from "stream";

export class DocumentUploadService {
    private objectStorageClient: objectstorage.ObjectStorageClient;

    constructor() {
        this.objectStorageClient = ociProviderService.createObjectStorageClient();
    }

    async uploadDocument(fileName: string, fileBuffer: Buffer, userId: string, contentType: string): Promise<string> {
        try {
            const config = documentUploadConfig.getConfig();
            const objectName = `${userId}/${fileName}`;

            devLogger('DocumentUploadService', 'Uploading document to OCI Object Storage', {
                objectName,
                bucketName: config.bucketName,
                namespace: config.namespace,
            });
            devLogger('DocumentUploadService', `🔍 User ID validation - Type: ${typeof userId}, Length: ${userId.length}, Is UUID: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)}`);

            const putObjectRequest: objectstorage.requests.PutObjectRequest = {
                namespaceName: config.namespace,
                bucketName: config.bucketName,
                objectName: objectName,
                contentLength: fileBuffer.length,
                putObjectBody: fileBuffer, // Pass the buffer directly
                contentType: contentType,
            };

            const response = await this.objectStorageClient.putObject(putObjectRequest);

            devLogger('DocumentUploadService', 'Document uploaded successfully', {
                etag: response.eTag,
                opcRequestId: response.opcClientRequestId,
            });

            return objectName;
        } catch (error) {
            devLogger('DocumentUploadService', 'Error uploading document', error);
            throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export const documentUploadService = new DocumentUploadService();