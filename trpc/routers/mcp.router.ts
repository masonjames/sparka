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
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

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
});
