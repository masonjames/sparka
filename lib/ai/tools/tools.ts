import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClient as MCPClient,
} from "@ai-sdk/mcp";
import type { FileUIPart, ModelMessage, Tool } from "ai";
import type { ModelId } from "@/lib/ai/app-models";
import { codeInterpreter } from "@/lib/ai/tools/code-interpreter";
import { createDocumentTool } from "@/lib/ai/tools/create-document";
import { generateImage } from "@/lib/ai/tools/generate-image";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { readDocument } from "@/lib/ai/tools/read-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { retrieve } from "@/lib/ai/tools/retrieve";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { tavilyWebSearch } from "@/lib/ai/tools/web-search";
import type { Session } from "@/lib/auth";
import { siteConfig } from "@/lib/config";
import type { McpConnector } from "@/lib/db/schema";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";
import { deepResearch } from "./deep-research/deep-research";

const log = createModuleLogger("tools:mcp");

export function getTools({
  dataStream,
  session,
  messageId,
  selectedModel,
  attachments = [],
  lastGeneratedImage = null,
  contextForLLM,
}: {
  dataStream: StreamWriter;
  session: Session;
  messageId: string;
  selectedModel: ModelId;
  attachments: FileUIPart[];
  lastGeneratedImage: { imageUrl: string; name: string } | null;
  contextForLLM: ModelMessage[];
}) {
  return {
    getWeather,
    createDocument: createDocumentTool({
      session,
      dataStream,
      contextForLLM,
      messageId,
      selectedModel,
    }),
    updateDocument: updateDocument({
      session,
      dataStream,
      messageId,
      selectedModel,
    }),
    requestSuggestions: requestSuggestions({
      session,
      dataStream,
    }),
    readDocument: readDocument({
      session,
      dataStream,
    }),
    // reasonSearch: createReasonSearch({
    //   session,
    //   dataStream,
    // }),
    retrieve,
    ...(siteConfig.integrations.webSearch
      ? {
          webSearch: tavilyWebSearch({
            dataStream,
            writeTopLevelUpdates: true,
          }),
        }
      : {}),

    ...(siteConfig.integrations.sandbox ? { codeInterpreter } : {}),
    ...(siteConfig.integrations.openai
      ? { generateImage: generateImage({ attachments, lastGeneratedImage }) }
      : {}),
    ...(siteConfig.integrations.webSearch
      ? {
          deepResearch: deepResearch({
            session,
            dataStream,
            messageId,
            messages: contextForLLM,
          }),
        }
      : {}),
  };
}

/**
 * Creates MCP clients for the given connectors and returns their tools.
 * Returns both the tools and a cleanup function to close all clients.
 */
export async function getMcpTools({
  connectors,
}: {
  connectors: McpConnector[];
}): Promise<{
  tools: Record<string, Tool>;
  cleanup: () => Promise<void>;
}> {
  const enabledConnectors = connectors.filter((c) => c.enabled);

  if (enabledConnectors.length === 0) {
    return {
      tools: {},
      cleanup: async () => Promise.resolve(),
    };
  }

  const clients: MCPClient[] = [];
  const allTools: Record<string, Tool> = {};

  for (const connector of enabledConnectors) {
    try {
      const client = await createMCPClient({
        transport: {
          type: connector.type,
          url: connector.url,
          // Include OAuth headers if configured
          ...(connector.oauthClientId && connector.oauthClientSecret
            ? {
                headers: {
                  // TODO: Check if this is how to pass auth according to mcp spec
                  Authorization: `Basic ${Buffer.from(`${connector.oauthClientId}:${connector.oauthClientSecret}`).toString("base64")}`,
                },
              }
            : {}),
        },
      });

      clients.push(client);
      const tools = await client.tools();
      console.log("MCP Client tools", tools);

      // TODO: Decide if we should prefix or not
      // Prefix tool names with connector name to avoid collisions
      const prefix = connector.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      for (const [toolName, tool] of Object.entries(tools)) {
        allTools[`${prefix}_${toolName}`] = tool as Tool;
      }

      log.info(
        { connector: connector.name, toolCount: Object.keys(tools).length },
        "MCP client connected"
      );
    } catch (error) {
      log.error(
        { connector: connector.name, error },
        "Failed to connect to MCP server"
      );
      // Continue with other connectors even if one fails
    }
  }

  const cleanup = async () => {
    await Promise.all(
      clients.map(async (client) => {
        try {
          await client.close();
        } catch (error) {
          log.error({ error }, "Failed to close MCP client");
        }
      })
    );
  };

  return { tools: allTools, cleanup };
}
