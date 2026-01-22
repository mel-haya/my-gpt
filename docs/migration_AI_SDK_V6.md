# Migration AI SDK v5 to v6

## Breaking changes

- convertToModelMessages() is async in AI SDK 6 to support async Tool.toModelOutput().
- the tool name is now derived from the key in the tools object
- tools now infer the outputSchema from the execute function so you can either have outputSchema (tools that only define their contract) or have an execute function but not both

```typescript
// Old method

import { tool } from "ai";

export const tools = {
    searchKnowledgeBase: tool({
        name: "searchKnowledgeBase",
        description: "description",
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
        description: "description",
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
import { getToolName, isToolUIPart, isStaticToolUIPart } from "ai";
```

- generateObject is deprecated

```typescript
// Old method
import { generateObject } from "ai";

const { object } = generateObject({
  model: "openai/gpt-4o",
  schema: evaluationSchema,
  system: "Generate an evaluation",
  prompt: "evaluate the following test",
});

// New method
import { generateText, Output } from "ai";

const { output } = await generateText({
  model: "openai/gpt-4o",
  output: Output.object({ schema: evaluationSchema }),
  system: "Generate an evaluation",
  prompt: "evaluate the following test",
});
```

## What's New

### Agents

The new `Agent` class provides a structured way to encapsulate LLM configuration, tools, and behavior into reusable components.

Agents allow us to share the same configuration between **generation** and **testing** workflows. Previously, this was difficult because one required streaming while the other did not. Agents now handle both seamlessly.

---

### Tool Approval

Tool approval introduces an additional safety layer for tools that perform sensitive actions such as deleting files, processing payments, or executing scripts.

While important for high-risk operations, this feature is **not required for our current use cases**.

---

### Tool Calling with Structured Output

`generateObject` is now deprecated.

Structured output is now handled directly by `generateText` by passing an output schema. This change enables **tool calling while generating structured objects**, simplifying the API and reducing duplication.

---

### DevTools

You can now debug model behavior using AI SDK DevTools by wrapping the model with a DevTools middleware.

```ts
import { wrapLanguageModel, gateway, generateText } from "ai";
import { devToolsMiddleware } from "@ai-sdk/devtools";

const devToolsEnabledModel = wrapLanguageModel({
  model: gateway("anthropic/claude-sonnet-4.5"),
  middleware: devToolsMiddleware(),
});

const result = await generateText({
  model: devToolsEnabledModel,
  prompt: "What is love?",
});
```

Launch the DevTools viewer with:

```bash
npx @ai-sdk/devtools
```

Then open: http://localhost:4983

---

### Reranking

Reranking reorders search results based on their relevance to a given query, allowing only the most relevant documents to be passed to the model.

AI SDK now provides **native support for reranking**. While reranking models are not yet available via AI Gateway, providers like Cohere offer free trials. This can improve RAG quality, with a small trade-off in added latency.

---

### Standard JSON Schema Support

AI SDK 6 now supports **any schema library** that implements the Standard JSON Schema specification, improving flexibility and interoperability.
