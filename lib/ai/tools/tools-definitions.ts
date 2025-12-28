import { type ToolName, toolNameSchema } from "../types";

// Tool costs in CENTS (external API fees only)
// LLM costs are calculated separately from token usage
export const toolsDefinitions: Record<ToolName, ToolDefinition> = {
  getWeather: {
    name: "getWeather",
    description: "Get the weather in a specific location",
    cost: 0, // internal
  },
  createDocument: {
    name: "createDocument",
    description: "Create a new document",
    cost: 0, // internal
  },
  updateDocument: {
    name: "updateDocument",
    description: "Update a document",
    cost: 0, // internal
  },
  requestSuggestions: {
    name: "requestSuggestions",
    description: "Request suggestions for a document",
    cost: 0, // internal
  },
  readDocument: {
    name: "readDocument",
    description: "Read the content of a document",
    cost: 0, // internal
  },
  retrieveUrl: {
    name: "retrieveUrl",
    description: "Retrieve information from a URL",
    cost: 0, // internal
  },
  webSearch: {
    name: "webSearch",
    description: "Search the web",
    cost: 1, // Tavily API ~1¢
  },
  codeExecution: {
    name: "codeExecution",
    description: "Execute code in a virtual environment",
    cost: 5, // Vercel Sandbox execution ~5¢
  },
  generateImage: {
    name: "generateImage",
    description: "Generate images from text descriptions",
    cost: 4, // DALL-E 3 standard ~4¢
  },
  deepResearch: {
    name: "deepResearch",
    description: "Research a topic",
    cost: 0, // LLM calls tracked via usage, Tavily calls counted separately
  },
};

export const allTools = toolNameSchema.options;
export type ToolDefinition = {
  name: string;
  description: string;
  cost: number;
};
