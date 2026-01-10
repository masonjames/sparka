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
  retrieve: {
    name: "retrieve",
    description: "Retrieve information from the web",
    cost: 0, // internal
  },
  webSearch: {
    name: "webSearch",
    description: "Search the web",
    cost: 5, // Tavily API ~5¢
  },
  codeInterpreter: {
    name: "codeInterpreter",
    description: "Interpret code in a virtual environment",
    cost: 5, // Sandbox execution ~5¢
  },
  generateImage: {
    name: "generateImage",
    description: "Generate images from text descriptions",
    cost: 17, // Nano banana pro ~17¢
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
