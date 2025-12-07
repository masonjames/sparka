import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createMcpConnector,
  deleteMcpConnector,
  getMcpConnectorById,
  getMcpConnectorsByUserId,
  updateMcpConnector,
} from "@/lib/db/queries";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const mcpRouter = createTRPCRouter({
  list: protectedProcedure.query(
    async ({ ctx }) => await getMcpConnectorsByUserId({ userId: ctx.user.id })
  ),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        type: z.enum(["http", "sse"]),
        oauthClientId: z.string().optional(),
        oauthClientSecret: z.string().optional(),
      })
    )
    .mutation(
      async ({ ctx, input }) =>
        await createMcpConnector({
          userId: ctx.user.id,
          name: input.name,
          url: input.url,
          type: input.type,
          oauthClientId: input.oauthClientId,
          oauthClientSecret: input.oauthClientSecret,
        })
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        updates: z.object({
          name: z.string().min(1).optional(),
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
      await updateMcpConnector({ id: input.id, updates: input.updates });
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
