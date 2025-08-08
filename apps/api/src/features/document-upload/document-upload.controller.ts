import { Context } from "hono";
import { documentUploadService } from "./document-upload.service";

export const handleDocumentUpload = async (c: Context) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get('file') as File;
        const userId = c.req.header('X-User-Id') || 'anonymous';

        if (!file) {
            return c.json({ success: false, message: 'No file uploaded' }, 400);
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());

        const objectName = await documentUploadService.uploadDocument(
            file.name,
            fileBuffer,
            userId,
            file.type
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