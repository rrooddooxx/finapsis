import { devLogger } from "../../utils/logger.utils";
import { ociProviderService } from "../../providers/oci/oci-provider.service";
import { financialDocumentsConfig } from "./assistant-financial-documents.config";

export interface PdfConversionRequest {
  bucketName: string;
  objectName: string;
  namespace: string;
  userId: string;
  pdfBuffer?: Buffer;
}

export interface PdfConversionResult {
  success: boolean;
  imageUrls: string[];
  pageCount: number;
  conversionMethod: 'cloud-function' | 'local-library' | 'third-party';
  error?: string;
  processingTime: number;
}

/**
 * PDF to Image Converter Service
 * Handles conversion of PDF documents to images for OpenAI Vision API
 */
export class PdfConverterService {

  /**
   * Convert PDF to images using available methods
   */
  async convertPdfToImages(request: PdfConversionRequest): Promise<PdfConversionResult> {
    const startTime = Date.now();

    try {
      devLogger('PdfConverter', '📄 Starting PDF to image conversion', {
        objectName: request.objectName,
        hasBuffer: !!request.pdfBuffer
      });

      // Method 1: Try OCI Functions for PDF conversion (recommended for production)
      try {
        const result = await this.convertUsingOciFunction(request);
        if (result.success) {
          return { ...result, processingTime: Date.now() - startTime };
        }
      } catch (error) {
        devLogger('PdfConverter', '⚠️ OCI Function conversion failed, trying alternative', { error });
      }

      // Method 2: Try local PDF library conversion
      try {
        const result = await this.convertUsingLocalLibrary(request);
        if (result.success) {
          return { ...result, processingTime: Date.now() - startTime };
        }
      } catch (error) {
        devLogger('PdfConverter', '⚠️ Local library conversion failed, trying alternative', { error });
      }

      // Method 3: Use third-party service
      try {
        const result = await this.convertUsingThirdPartyService(request);
        return { ...result, processingTime: Date.now() - startTime };
      } catch (error) {
        devLogger('PdfConverter', '❌ All conversion methods failed', { error });
        
        return {
          success: false,
          imageUrls: [],
          pageCount: 0,
          conversionMethod: 'third-party',
          error: `PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          processingTime: Date.now() - startTime
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        imageUrls: [],
        pageCount: 0,
        conversionMethod: 'cloud-function',
        error: `PDF conversion error: ${errorMessage}`,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Method 1: Use OCI Functions for PDF conversion (scalable, production-ready)
   */
  private async convertUsingOciFunction(request: PdfConversionRequest): Promise<Omit<PdfConversionResult, 'processingTime'>> {
    devLogger('PdfConverter', '☁️ Attempting OCI Function conversion');

    // TODO: Implement OCI Functions integration
    // 1. Create an OCI Function that uses pdf2pic or similar
    // 2. Invoke the function with the PDF buffer or storage reference
    // 3. Function returns image URLs or base64 images
    
    const config = financialDocumentsConfig.getDocumentAIConfig();
    
    // For now, this is a placeholder
    throw new Error('OCI Function PDF conversion not implemented yet');
  }

  /**
   * Method 2: Use local PDF processing library
   */
  private async convertUsingLocalLibrary(request: PdfConversionRequest): Promise<Omit<PdfConversionResult, 'processingTime'>> {
    devLogger('PdfConverter', '🔧 Attempting local library conversion');

    // TODO: Implement local PDF conversion
    // Options:
    // 1. pdf2pic - Pure JavaScript, good for simple PDFs
    // 2. pdf-poppler - Requires poppler-utils system dependency
    // 3. pdf-lib + canvas - More control but complex
    
    try {
      // Example implementation with pdf2pic:
      // const pdf2pic = require("pdf2pic");
      // const pdfBuffer = request.pdfBuffer || await this.downloadPdf(request);
      // 
      // const convert = pdf2pic.fromBuffer(pdfBuffer, {
      //   density: 300,           // Output resolution
      //   saveFilename: `page_${request.userId}`,
      //   savePath: `/tmp/`,
      //   format: "png",
      //   width: 2000,
      //   height: 2000
      // });
      // 
      // const results = await convert.bulk(-1); // Convert all pages
      // const imageUrls = await this.uploadImagesToStorage(results, request);
      // 
      // return {
      //   success: true,
      //   imageUrls,
      //   pageCount: results.length,
      //   conversionMethod: 'local-library'
      // };

      throw new Error('Local PDF library conversion not implemented yet');

    } catch (error) {
      throw new Error(`Local conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Method 3: Use third-party conversion service
   */
  private async convertUsingThirdPartyService(request: PdfConversionRequest): Promise<Omit<PdfConversionResult, 'processingTime'>> {
    devLogger('PdfConverter', '🌐 Attempting third-party service conversion');

    // TODO: Implement third-party service integration
    // Options:
    // 1. CloudConvert API
    // 2. Adobe PDF Services API  
    // 3. ILovePDF API
    // 4. ConvertAPI
    
    try {
      // Example with CloudConvert:
      // const pdfBuffer = request.pdfBuffer || await this.downloadPdf(request);
      // const response = await fetch('https://api.cloudconvert.com/v2/convert', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${Bun.env.CLOUDCONVERT_API_KEY}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     input_format: 'pdf',
      //     output_format: 'png',
      //     input: pdfBuffer.toString('base64')
      //   })
      // });
      
      throw new Error('Third-party service conversion not implemented yet');

    } catch (error) {
      throw new Error(`Third-party conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download PDF from OCI Object Storage
   */
  private async downloadPdf(request: PdfConversionRequest): Promise<Buffer> {
    try {
      const objectStorageClient = ociProviderService.createObjectStorageClient();
      
      const getObjectRequest = {
        namespaceName: request.namespace,
        bucketName: request.bucketName,
        objectName: request.objectName
      };

      devLogger('PdfConverter', '📥 Downloading PDF from Object Storage');
      
      const response = await objectStorageClient.getObject(getObjectRequest);
      
      if (response.value instanceof ReadableStream) {
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

      throw new Error('No PDF data received');

    } catch (error) {
      devLogger('PdfConverter', '❌ Failed to download PDF', { error });
      throw error;
    }
  }

  /**
   * Upload converted images back to OCI Object Storage
   */
  private async uploadImagesToStorage(imageResults: any[], request: PdfConversionRequest): Promise<string[]> {
    const uploadPromises = imageResults.map(async (result, index) => {
      const imageName = `${request.objectName}_page_${index + 1}.png`;
      const imageBuffer = Buffer.from(result.base64, 'base64');
      
      // TODO: Upload to Object Storage
      // const objectStorageClient = ociProviderService.createObjectStorageClient();
      // await objectStorageClient.putObject({...});
      
      // Return the public URL
      return `https://objectstorage.region.oraclecloud.com/n/${request.namespace}/b/${request.bucketName}/o/${imageName}`;
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Validate PDF file
   */
  validatePdf(pdfBuffer: Buffer): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check if buffer starts with PDF signature
    if (!pdfBuffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
      issues.push('Invalid PDF signature');
    }
    
    // Check file size (reasonable limits for processing)
    const sizeMB = pdfBuffer.length / (1024 * 1024);
    if (sizeMB > 50) {
      issues.push('PDF file too large (>50MB)');
    }
    
    if (sizeMB < 0.001) {
      issues.push('PDF file too small (<1KB)');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

export const pdfConverterService = new PdfConverterService();