
import { Context } from "hono";
import { documentUploadService } from "./document-upload.service";

export const handleDocumentUpload = async (c: Context) => {
    try {
        const userId = c.req.header('X-User-Email') || 'anonymous';
        const fileName = c.req.header('X-File-Name') || `upload-${Date.now()}`;
        const contentType = c.req.header('Content-Type') || 'application/octet-stream';
        
        const fileBody = await c.req.arrayBuffer();

        if (!fileBody || fileBody.byteLength === 0) {
            return c.json({ success: false, message: 'No file content uploaded' }, 400);
        }

        const fileBuffer = Buffer.from(fileBody);

        const objectName = await documentUploadService.uploadDocument(
            fileName,
            fileBuffer,
            userId,
            contentType
        );

        return c.json({ 
            success: true, 
            message: 'File uploaded successfully', 
            objectName 
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return c.json({ success: false, message: errorMessage }, 500);
    }
};

export const handleMessagingUpload = async (c: Context) => {
    try {
        const userId = c.req.header('X-User-Email') || 'anonymous';
        const body = await c.req.json();
        const { fileUrl, chatId, telegramUser } = body;

        if (!fileUrl) {
            return c.json({ success: false, message: 'Missing fileUrl' }, 400);
        }

        // Download the file directly in the controller
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
            throw new Error(`Failed to download file from URL: ${fileResponse.statusText}`);
        }

        const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
        const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
        const urlPath = new URL(fileUrl).pathname;
        const fileName = urlPath.substring(urlPath.lastIndexOf('/') + 1) || `upload-${Date.now()}`;

        // Pass the downloaded file buffer to the upload service
        const objectName = await documentUploadService.uploadDocument(
            fileName,
            fileBuffer,
            userId,
            contentType
        );

        return c.json({ 
            success: true, 
            message: 'File processed and uploaded successfully from URL', 
            objectName,
            source: 'telegram',
            chatId,
            telegramUser
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return c.json({ success: false, message: errorMessage }, 500);
    }
};
