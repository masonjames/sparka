import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getOrCreateMcpClient, removeMcpClient } from "@/lib/ai/mcp/mcp-client";
import { generateMcpNameId, MCP_NAME_MAX_LENGTH } from "@/lib/ai/mcp-name-id";
import {
  createMcpConnector,
  deleteMcpConnector,
  getAuthenticatedSession,
  getMcpConnectorById,
  getMcpConnectorByNameId,
  getMcpConnectorsByUserId,
  updateMcpConnector,
} from "@/lib/db/mcp-queries";
import { createModuleLogger } from "@/lib/logger";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const log = createModuleLogger("mcp.router");

/**
 * Validates and generates a nameId from a connector name.
 * Throws TRPCError if the name is invalid or the namespace already exists.
 */
async function validateAndGenerateNameId({
  name,
  userId,
  excludeId,
}: {
  name: string;
  userId: string | null;
  excludeId?: string;
}): Promise<string> {
  const result = generateMcpNameId(name);
  if (!result.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        result.error === "empty"
          ? "Connector name must contain at least one alphanumeric character"
          : 'Connector name cannot be "global" (reserved)',
    });
  }

  const existing = await getMcpConnectorByNameId({
    userId,
    nameId: result.nameId,
    excludeId,
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `A connector with namespace "${result.nameId}" already exists. Choose a different name.`,
    });
  }

  return result.nameId;
}

export const mcpRouter = createTRPCRouter({
  list: protectedProcedure.query(
    async ({ ctx }) => await getMcpConnectorsByUserId({ userId: ctx.user.id })
  ),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(MCP_NAME_MAX_LENGTH),
        url: z.string().url(),
        type: z.enum(["http", "sse"]),
        oauthClientId: z.string().optional(),
        oauthClientSecret: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const nameId = await validateAndGenerateNameId({
        name: input.name,
        userId: ctx.user.id,
      });

      return await createMcpConnector({
        userId: ctx.user.id,
        name: input.name,
        nameId,
        url: input.url,
        type: input.type,
        oauthClientId: input.oauthClientId,
        oauthClientSecret: input.oauthClientSecret,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        updates: z.object({
          name: z.string().min(1).max(MCP_NAME_MAX_LENGTH).optional(),
          url: z.string().url().optional(),
          type: z.enum(["http", "sse"]).optional(),
          oauthClientId: z.string().nullable().optional(),
          oauthClientSecret: z.string().nullable().optional(),
          enabled: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const connector = await getMcpConnectorById({ id: input.id });
      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }
      // Only allow editing own connectors (not global ones)
      if (connector.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot edit this connector",
        });
      }

      // If name is being updated, regenerate nameId
      const updates = { ...input.updates };
      if (updates.name) {
        const nameId = await validateAndGenerateNameId({
          name: updates.name,
          userId: connector.userId,
          excludeId: input.id,
        });
        (updates as typeof updates & { nameId: string }).nameId = nameId;
      }

      await updateMcpConnector({ id: input.id, updates });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const connector = await getMcpConnectorById({ id: input.id });
      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }
      // Only allow deleting own connectors
      if (connector.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete this connector",
        });
      }
      await deleteMcpConnector({ id: input.id });
      return { success: true };
    }),

  toggleEnabled: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const connector = await getMcpConnectorById({ id: input.id });
      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }
      // Only allow toggling own connectors (not global ones)
      if (connector.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify this connector",
        });
      }
      await updateMcpConnector({
        id: input.id,
        updates: { enabled: input.enabled },
      });
      return { success: true };
    }),

  discover: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const connector = await getMcpConnectorById({ id: input.id });
      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }
      // Only allow discovering own connectors or global ones
      if (connector.userId !== null && connector.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot access this connector",
        });
      }

      log.debug(
        { connectorId: connector.id, url: connector.url },
        "creating MCP client for discovery"
      );

      // Use OAuth-aware client
      const mcpClient = await getOrCreateMcpClient({
        id: connector.id,
        name: connector.name,
        url: connector.url,
        type: connector.type,
      });

      await mcpClient.connect();

      // Check if authorization is needed
      if (mcpClient.status === "authorizing") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Connector requires OAuth authorization",
        });
      }

      if (mcpClient.status !== "connected") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to connect to MCP server (status: ${mcpClient.status})`,
        });
      }

      log.debug(
        { connectorId: connector.id },
        "MCP client connected, discovering capabilities"
      );

      try {
        const [toolsResult, resourcesResult, promptsResult] = await Promise.all(
          [
            mcpClient
              .tools()
              .then((tools) =>
                Object.entries(tools).map(([name, tool]) => ({
                  name,
                  description: tool.description ?? null,
                }))
              )
              .catch((err) => {
                log.warn(
                  { connectorId: connector.id, err },
                  "failed to list tools"
                );
                return [];
              }),
            mcpClient
              .listResources()
              .then((r) =>
                r.resources.map((res) => ({
                  name: res.name,
                  uri: res.uri,
                  description: res.description ?? null,
                  mimeType: res.mimeType ?? null,
                }))
              )
              .catch((err) => {
                log.warn(
                  { connectorId: connector.id, err },
                  "failed to list resources"
                );
                return [];
              }),
            mcpClient
              .listPrompts()
              .then((r) =>
                r.prompts.map((p) => ({
                  name: p.name,
                  description: p.description ?? null,
                  arguments:
                    p.arguments?.map((arg) => ({
                      name: arg.name,
                      description: arg.description ?? null,
                      required: arg.required ?? false,
                    })) ?? [],
                }))
              )
              .catch((err) => {
                log.warn(
                  { connectorId: connector.id, err },
                  "failed to list prompts"
                );
                return [];
              }),
          ]
        );

        log.info(
          {
            connectorId: connector.id,
            toolsCount: toolsResult.length,
            resourcesCount: resourcesResult.length,
            promptsCount: promptsResult.length,
          },
          "MCP discovery completed"
        );

        return {
          tools: toolsResult,
          resources: resourcesResult,
          prompts: promptsResult,
        };
      } finally {
        // Don't close the client - keep it cached for reuse
        log.debug({ connectorId: connector.id }, "MCP discovery finished");
      }
    }),

  /**
   * Initiate OAuth authorization for an MCP connector.
   * Returns the authorization URL that the client should open in a popup.
   */
  authorize: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const connector = await getMcpConnectorById({ id: input.id });
      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }
      // Only allow authorizing own connectors or global ones
      if (connector.userId !== null && connector.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot authorize this connector",
        });
      }

      log.info({ connectorId: connector.id }, "Initiating OAuth authorization");

      // Remove any existing client to force a fresh connection
      await removeMcpClient(connector.id);

      // Create a new client and attempt to connect
      const mcpClient = await getOrCreateMcpClient({
        id: connector.id,
        name: connector.name,
        url: connector.url,
        type: connector.type,
      });

      await mcpClient.connect();

      if (mcpClient.status !== "authorizing") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connector does not require OAuth authorization",
        });
      }

      const authUrl = mcpClient.getAuthorizationUrl();
      if (!authUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get authorization URL",
        });
      }

      log.info(
        { connectorId: connector.id, authUrl: authUrl.toString() },
        "OAuth authorization URL generated"
      );

      return { authorizationUrl: authUrl.toString() };
    }),

  /**
   * Check if a connector has valid OAuth tokens.
   */
  checkAuth: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const connector = await getMcpConnectorById({ id: input.id });
      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }
      // Only allow checking own connectors or global ones
      if (connector.userId !== null && connector.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot access this connector",
        });
      }

      const session = await getAuthenticatedSession({
        mcpConnectorId: connector.id,
      });

      return {
        isAuthenticated: !!session?.tokens,
        hasSession: !!session,
      };
    }),

  /**
   * Refresh/reconnect an MCP client after OAuth completion.
   */
  refreshClient: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const connector = await getMcpConnectorById({ id: input.id });
      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }
      if (connector.userId !== null && connector.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot access this connector",
        });
      }

      // Remove existing client and reconnect
      await removeMcpClient(connector.id);

      const mcpClient = await getOrCreateMcpClient({
        id: connector.id,
        name: connector.name,
        url: connector.url,
        type: connector.type,
      });

      await mcpClient.connect();

      return {
        status: mcpClient.status,
        needsAuth: mcpClient.status === "authorizing",
      };
    }),
});
