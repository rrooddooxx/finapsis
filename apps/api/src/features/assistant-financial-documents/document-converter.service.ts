import { devLogger } from "../../utils/logger.utils";
import { ociProviderService } from "../../providers/oci/oci-provider.service";
import { financialDocumentsConfig } from "./assistant-financial-documents.config";
import { pdfConverterService } from "./pdf-converter.service";

export interface DocumentConversionRequest {
  bucketName: string;
  objectName: string;
  namespace: string;
  userId: string;
}

export interface DocumentConversionResult {
  success: boolean;
  imageData: Array<{
    base64: string;
    mimeType: string;
    fileName?: string;
  }>;
  originalFormat: string;
  conversionMethod: 'direct' | 'pdf-conversion' | 'unsupported';
  error?: string;
  processingTime: number;
}

export class DocumentConverterService {
  
  /**
   * Convert document to images compatible with OpenAI Vision API
   */
  async convertToImages(request: DocumentConversionRequest): Promise<DocumentConversionResult> {
    const startTime = Date.now();

    try {
      devLogger('DocumentConverter', `🔄 Starting document conversion - Object: ${request.objectName}, User: ${request.userId}`);

      const fileExtension = this.getFileExtension(request.objectName);
      const mimeType = this.getMimeType(fileExtension);

      // Check if the file is already an image format supported by Vision API
      if (this.isVisionSupportedImage(mimeType)) {
        devLogger('DocumentConverter', '✅ Document is already a supported image format');
        
        // Download image and convert to base64
        const imageBuffer = await this.downloadFileFromStorage(request);
        const base64Image = imageBuffer.toString('base64');
        
        return {
          success: true,
          imageData: [{
            base64: base64Image,
            mimeType: mimeType,
            fileName: request.objectName
          }],
          originalFormat: mimeType,
          conversionMethod: 'direct',
          processingTime: Date.now() - startTime
        };
      }

      // Handle PDF conversion
      if (mimeType === 'application/pdf') {
        devLogger('DocumentConverter', '📄 Converting PDF to images using dedicated PDF converter');
        
        const pdfConversionResult = await pdfConverterService.convertPdfToImages(request);
        
        // Convert PDF result URLs to base64 data (this will need PDF converter update)
        const imageData = pdfConversionResult.success ? 
          [] : // TODO: Convert PDF result to base64 format
          [];
        
        return {
          success: pdfConversionResult.success,
          imageData,
          originalFormat: mimeType,
          conversionMethod: 'pdf-conversion',
          processingTime: Date.now() - startTime,
          error: pdfConversionResult.error
        };
      }

      // Unsupported format
      devLogger('DocumentConverter', `⚠️ Unsupported file format for Vision analysis - Extension: ${fileExtension}, MIME: ${mimeType}`);

      return {
        success: false,
        imageData: [],
        originalFormat: mimeType,
        conversionMethod: 'unsupported',
        error: `Unsupported file format: ${mimeType}`,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      devLogger('DocumentConverter', `❌ Document conversion failed: ${errorMessage}`);

      return {
        success: false,
        imageData: [],
        originalFormat: 'unknown',
        conversionMethod: 'unsupported',
        error: errorMessage,
        processingTime: Date.now() - startTime
      };
    }
  }


  /**
   * Check if the file is a Vision API supported image format
   */
  private isVisionSupportedImage(mimeType: string): boolean {
    const supportedTypes = [
      'image/png',
      'image/jpeg', 
      'image/jpg',
      'image/webp',
      'image/gif'
    ];
    
    return supportedTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Get file extension from object name
   */
  private getFileExtension(objectName: string): string {
    const lastDot = objectName.lastIndexOf('.');
    return lastDot !== -1 ? objectName.substring(lastDot + 1).toLowerCase() : '';
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'svg': 'image/svg+xml'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Generate public URL for OCI Object Storage with authentication
   */
  private generateObjectStorageUrl(request: DocumentConversionRequest): string {
    // Use OCI SDK to generate a pre-authenticated request (PAR) or signed URL
    // This ensures OpenAI can access the file even if the bucket is private
    
    const config = financialDocumentsConfig.getDocumentAIConfig();
    const baseUrl = `https://objectstorage.${config.region || 'us-phoenix-1'}.oraclecloud.com`;
    const objectPath = `/n/${request.namespace}/b/${request.bucketName}/o/${encodeURIComponent(request.objectName)}`;
    
    // For now, return the direct URL - you may need to implement proper authentication
    // In production, you should generate a pre-authenticated request (PAR) for private buckets
    return `${baseUrl}${objectPath}`;
  }

  /**
   * Download file from OCI Object Storage for local processing
   */
  private async downloadFileFromStorage(request: DocumentConversionRequest): Promise<Buffer> {
    try {
      const objectStorageClient = ociProviderService.createObjectStorageClient();
      
      const getObjectRequest = {
        namespaceName: request.namespace,
        bucketName: request.bucketName,
        objectName: request.objectName
      };

      devLogger('DocumentConverter', '📥 Downloading file from OCI Object Storage');
      
      const response = await objectStorageClient.getObject(getObjectRequest);
      
      if (response.value && response.value instanceof ReadableStream) {
        // Convert ReadableStream to Buffer
        const reader = response.value.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            chunks.push(value);
          }
        }

        return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
      } else if (response.value) {
        return Buffer.from(response.value as any);
      }

      throw new Error('No data received from Object Storage');

    } catch (error) {
      devLogger('DocumentConverter', `❌ Failed to download file from Object Storage: ${error}`);
      throw error;
    }
  }

  /**
   * Advanced PDF to Image conversion (implementation needed)
   * This would use libraries like:
   * - pdf2pic (Node.js)
   * - pdf-poppler 
   * - Sharp for image processing
   * - Or OCI Vision Service for document conversion
   */
  private async advancedPdfConversion(request: DocumentConversionRequest): Promise<string[]> {
    // TODO: Implement one of these approaches:
    
    // Option 1: Use pdf2pic library
    // const pdf2pic = require("pdf2pic");
    // const convert = pdf2pic.fromBuffer(pdfBuffer, {
    //   density: 300,
    //   saveFilename: "page",
    //   savePath: "/tmp/",
    //   format: "png",
    //   width: 2000,
    //   height: 2000
    // });
    // const results = await convert.bulk(-1);
    
    // Option 2: Use OCI Functions to convert PDF
    // Call an OCI Function that handles PDF conversion
    
    // Option 3: Use third-party service
    // Send to a conversion service API
    
    throw new Error('Advanced PDF conversion not implemented yet');
  }

  /**
   * Validate image requirements for OpenAI Vision
   */
  validateImageForVision(imageUrl: string, fileSizeMB?: number): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check file size (50MB limit)
    if (fileSizeMB && fileSizeMB > 50) {
      issues.push('File size exceeds 50MB limit');
    }
    
    // Check URL accessibility
    if (!imageUrl || !imageUrl.startsWith('http')) {
      issues.push('Invalid or inaccessible image URL');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

export const documentConverterService = new DocumentConverterService();