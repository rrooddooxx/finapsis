import {createOpenAI} from "@ai-sdk/openai";
import "../../shared/envs.shared"; // Import for Bun.env typing

export const openAiProvider = () => {
    const client = createOpenAI({
        apiKey: Bun.env.OPENAI_API_KEY,
        organization: "ainterprete",
    })

    return {
        client
    }

}