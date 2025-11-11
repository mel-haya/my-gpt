import {openai as originalOpenAI} from "@ai-sdk/openai"
import {customProvider} from "ai"

export const openai = customProvider({
    languageModels: {
        smart: originalOpenAI.responses("gpt-5-mini"),
        fast: originalOpenAI.responses("gpt-5-nano"),
    },
    fallbackProvider: originalOpenAI
})
    
