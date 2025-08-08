import type { ChatMessageRequest, UploadFileResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL;

export class ChatService {
  static async sendMessage(
    messageRequest: ChatMessageRequest
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body received");
    }

    return response.body;
  }

  static async uploadFile(params: {
    file: File;
    userEmail: string;
  }): Promise<UploadFileResponse> {
    const { file, userEmail } = params;

    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": file.name,
        "X-User-Email": userEmail || "anonymous",
      },
      body: file,
    });

    let payload: any = undefined;
    try {
      payload = await response.json();
    } catch (_) {
      // ignorar si no es JSON; el backend debería responder JSON
    }

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error:
          payload?.message || payload?.error || `HTTP error ${response.status}`,
      };
    }

    return {
      success: payload?.success ?? response.ok,
      status: response.status,
      data: payload,
      message: payload?.message,
      objectName: payload?.objectName,
    };
  }
}
