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

**What's new**

- Agents
  The Agent class provides a structured way to encapsulate LLM configuration, tools, and behavior into reusable components.
  agents will allow us to have the same configuration for both the testing and generating while it was difficult to achieve since one needed streaming and the other didn't and agents does both.

- Tool approval
  Tool approval adds a critical safety layer when tools do actions like deleting files, processing payments or executing scripts but it's not a feature that we need for now.

- Tool Calling with Structured Output
  generateObject is now deprecated because now generateText does handle structured output by passing an output schema this change will allow tool calling when generating objects.

- DevTools
  now it is possible to debug the model's behavior by using the devtools by wrapping it with a devTools middleware.

```Typescript
import { wrapLanguageModel, gateway, generateText  } from 'ai';
import { devToolsMiddleware } from '@ai-sdk/devtools';

const devToolsEnabledModel = wrapLanguageModel({
  model: gateway('anthropic/claude-sonnet-4.5'),
  middleware: devToolsMiddleware(),
});

const result = await generateText({
  model: devToolsEnabledModel,
  prompt: 'What is love?',
});
```
Launch the viewer with `npx @ai-sdk/devtools` and open http://localhost:4983

- Reranking
  Reranking reorders search results based on their relevance to a specific query, letting you pass only the most relevant documents to the model.
  now AI SDK have native support for reranking although reranking models are not yet supported on ai gateway but providers like cohere provide a free trial this could improve our RAG results but could also add a little bit of latency.

- Standard JSON Schema
  AI SDK 6 adds support for any schema library that implements the Standard JSON Schema