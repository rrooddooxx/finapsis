import {Context} from "hono";
import {documentUploadService} from "./document-upload.service";
import {userRepository} from "../users/user.repository";
import {asyncChatMessageService} from "../assistant-chatbot/async-chat-message.service";
import {devLogger} from "../../utils/logger.utils";

export const handleDocumentUpload = async (c: Context) => {
    try {
        const userId = c.req.header('X-User-Email') || 'anonymous@test.com';
        const fileName = c.req.header('X-File-Name') || `upload-${Date.now()}`;
        const contentType = c.req.header('Content-Type') || 'application/octet-stream';
        const user = await userRepository.findOrCreateUser(userId);

        const fileBody = await c.req.arrayBuffer();

        if (!fileBody || fileBody.byteLength === 0) {
            return c.json({success: false, message: 'No file content uploaded'}, 400);
        }

        const fileBuffer = Buffer.from(fileBody);

        const objectName = await documentUploadService.uploadDocument(
            fileName,
            fileBuffer,
            user.id,
            contentType
        );

        // Send async confirmation message to chat interface (will appear in next chat message)
        devLogger('DocumentUpload', `🚀 About to send file upload confirmation for user ${user.id}, file: ${fileName}`);
        await asyncChatMessageService.sendFileUploadConfirmation(user.id, fileName);
        devLogger('DocumentUpload', `✅ File upload confirmation sent for user ${user.id}`);

        return c.json({
            success: true,
            message: 'File uploaded successfully',
            objectName
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return c.json({success: false, message: errorMessage}, 500);
    }
};

export const handleMessagingUpload = async (c: Context) => {
    try {
        const userId = c.req.header('X-User-Email') || 'anonymous';
        const body = await c.req.json();
        const {fileUrl, chatId, telegramUser} = body;

        if (!fileUrl) {
            return c.json({success: false, message: 'Missing fileUrl'}, 400);
        }

        const user = await userRepository.findOrCreateUser(userId);
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
            user.id,
            contentType
        );

        // Send async confirmation message to chat interface (will appear in next chat message)
        await asyncChatMessageService.sendFileUploadConfirmation(user.id, fileName);

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
        return c.json({success: false, message: errorMessage}, 500);
    }
};
