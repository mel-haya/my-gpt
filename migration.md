### Migration AI SDK v5 to v6

**breaking changes**

- convertToModelMessages() is async in AI SDK 6 to support async Tool.toModelOutput().
- the tool name is now derived from the key in the tools object
- tools now infer the outputSchema from the execute function so you can either have outputSchema (tools that only define their contract) or have an execute function but not both

```typescript
// Old method

import { tool } from "ai";

export const tools = {
    searchKnowledgeBase: tool({
        name: "searchKnowledgeBase",
        description: "description"
        inputSchema: searchKnowledgeBaseInputSchema,
        outputSchema: searchKnowledgeBaseOutputSchema,
        execute: async ({ query }) => {
            const response = await searchDocuments(query, 5, 0)
            return response
        }
    })
}

// New method

import { tool } from "ai";

export const tools = {
    searchKnowledgeBase: tool({
        description: "description"
        inputSchema: searchKnowledgeBaseInputSchema,
        execute: async ({ query }) => {
            const response = await searchDocuments(query, 5, 0)
            return response
        }
    })
}
```
- generateImage now can be imported without experimental prefix
- Tool UI Part Helper Functions Rename
```typescript
// Old names
import {
  getToolOrDynamicToolName,
  isToolOrDynamicToolUIPart,
  isToolUIPart,
} from "ai";

// New names
import {
    getToolName,
    isToolUIPart,
    isStaticToolUIPart
} from "ai";
```
- generateObject is deprecated
```typescript
// Old method
import { generateObject } from "ai";

const { object} = generateObject({
    model: "openai/gpt-4o",
    schema: evaluationSchema,
    system: "Generate an evaluation",
    prompt: "evaluate the following test",
});

// New method
import { generateText, Output } from "ai";

const { output } = await generateText({
    model: "openai/gpt-4o",
    output: Output.object({schema: evaluationSchema}),
    system: "Generate an evaluation",
    prompt: "evaluate the following test",
});
```