import type {ChatMessageRequest} from '../types'

const API_BASE_URL = import.meta.env.BACKEND_API_URL || 'http://localhost:3000'

export class ChatService {
    static async sendMessage(messageRequest: ChatMessageRequest): Promise<ReadableStream<Uint8Array>> {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageRequest),
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        if (!response.body) {
            throw new Error('No response body received')
        }

        return response.body
    }
}