import type { FileUIPart, ModelMessage, Tool } from "ai";
import type { ModelId } from "@/lib/ai/app-models";
import { getOrCreateMcpClient, type MCPClient } from "@/lib/ai/mcp/mcp-client";
import { createToolId } from "@/lib/ai/mcp-name-id";
import { codeExecution } from "@/lib/ai/tools/code-execution";
import { createDocumentTool } from "@/lib/ai/tools/create-document";
import { generateImageTool } from "@/lib/ai/tools/generate-image";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { readDocument } from "@/lib/ai/tools/read-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { retrieveUrl } from "@/lib/ai/tools/retrieve-url";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { tavilyWebSearch } from "@/lib/ai/tools/web-search";
import type { Session } from "@/lib/auth";
import { siteConfig } from "@/lib/config";
import type { McpConnector } from "@/lib/db/schema";
import { createModuleLogger } from "@/lib/logger";
import { isMultimodalImageModel } from "@/lib/models/image-model-id";
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
  const imageToolModelId = isMultimodalImageModel(selectedModel)
    ? selectedModel
    : undefined;

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
    retrieveUrl,
    ...(siteConfig.integrations.webSearch
      ? {
          webSearch: tavilyWebSearch({
            dataStream,
            writeTopLevelUpdates: true,
          }),
        }
      : {}),

    ...(siteConfig.integrations.sandbox ? { codeExecution } : {}),
    ...(siteConfig.integrations.imageGeneration
      ? {
          generateImage: generateImageTool({
            attachments,
            lastGeneratedImage,
            // If the currently selected chat model can generate images (multimodal),
            // prefer it. Otherwise, the tool falls back to siteConfig.models.defaults.image.
            modelId: imageToolModelId,
          }),
        }
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
 * Uses OAuth-aware MCP clients that can authenticate with OAuth 2.1 + PKCE.
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
  if (!siteConfig.integrations.mcp) {
    return {
      tools: {},
      cleanup: async () => Promise.resolve(),
    };
  }

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
      // Get or create OAuth-aware MCP client
      const mcpClient = getOrCreateMcpClient({
        id: connector.id,
        name: connector.name,
        url: connector.url,
        type: connector.type,
        // Legacy Basic auth headers for connectors that have client credentials
        headers:
          connector.oauthClientId && connector.oauthClientSecret
            ? {
                Authorization: `Basic ${Buffer.from(`${connector.oauthClientId}:${connector.oauthClientSecret}`).toString("base64")}`,
              }
            : undefined,
      });

      // Attempt to connect
      await mcpClient.connect();

      // Skip connectors that need OAuth authorization
      if (mcpClient.status === "authorizing") {
        log.info(
          { connector: connector.name },
          "MCP connector needs OAuth authorization, skipping"
        );
        continue;
      }

      // Skip if not connected
      if (mcpClient.status !== "connected") {
        log.warn(
          { connector: connector.name, status: mcpClient.status },
          "MCP connector not connected, skipping"
        );
        continue;
      }

      clients.push(mcpClient);
      const tools = await mcpClient.tools();

      // Namespace tool names with connector nameId to avoid collisions
      // Format: {namespace}.{toolName} or global.{namespace}.{toolName}
      const isGlobal = connector.userId === null;
      for (const [toolName, tool] of Object.entries(tools)) {
        const toolId = createToolId(connector.nameId, toolName, isGlobal);
        allTools[toolId] = tool as Tool;
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
