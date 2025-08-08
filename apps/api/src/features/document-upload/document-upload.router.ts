import { Hono } from "hono";
import { handleDocumentUpload, handleMessagingUpload } from "./document-upload.controller";

const documentUploadRouter = new Hono();

documentUploadRouter.post("/upload", handleDocumentUpload);
documentUploadRouter.post("/upload-messaging", handleMessagingUpload);

export default documentUploadRouter;