import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateMcpNameId, MCP_NAME_MAX_LENGTH } from "@/lib/ai/mcp-name-id";
import {
  createMcpConnector,
  deleteMcpConnector,
  getMcpConnectorById,
  getMcpConnectorByNameId,
  getMcpConnectorsByUserId,
  updateMcpConnector,
} from "@/lib/db/queries";
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
      // Only allow editing own connectors (not global ones unless you're the owner)
      if (connector.userId !== null && connector.userId !== ctx.user.id) {
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
      // Only allow toggling own connectors
      if (connector.userId !== null && connector.userId !== ctx.user.id) {
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
        "creating MCP client"
      );

      const client = await createMCPClient({
        transport: {
          type: connector.type,
          url: connector.url,
          ...(connector.oauthClientId && connector.oauthClientSecret
            ? {
                headers: {
                  Authorization: `Basic ${Buffer.from(`${connector.oauthClientId}:${connector.oauthClientSecret}`).toString("base64")}`,
                },
              }
            : {}),
        },
      });

      log.debug(
        { connectorId: connector.id },
        "MCP client created, discovering capabilities"
      );

      try {
        const [toolsResult, resourcesResult, promptsResult] = await Promise.all(
          [
            client
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
            client
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
            client
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
        await client.close();
        log.debug({ connectorId: connector.id }, "MCP client closed");
      }
    }),
});
