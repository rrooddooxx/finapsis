import {createOpenAI} from "@ai-sdk/openai";

export const openAiProvider = () => {
    const client = createOpenAI({
        apiKey: Bun.env.OPENAI_API_KEY,
        organization: "ainterprete",
    })

    return {
        client
    }

}