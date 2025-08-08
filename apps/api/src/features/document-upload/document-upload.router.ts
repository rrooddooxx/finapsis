import { Hono } from "hono";
import { handleDocumentUpload } from "./document-upload.controller";

const documentUploadRouter = new Hono();

documentUploadRouter.post("/upload", handleDocumentUpload);

export default documentUploadRouter;