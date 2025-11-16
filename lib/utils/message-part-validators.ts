import { z } from "zod";

// Provider metadata schema - using unknown since we don't have a specific schema
const providerMetadataSchema = z.unknown().optional();

/**
 * Zod validators for each UI message part type
 * Used to validate parts before mapping to database Part rows
 */

export const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  state: z.enum(["streaming", "done"]).optional(),
  providerMetadata: providerMetadataSchema,
});

export const reasoningPartSchema = z.object({
  type: z.literal("reasoning"),
  text: z.string(),
  state: z.enum(["streaming", "done"]).optional(),
  providerMetadata: providerMetadataSchema,
});

export const filePartSchema = z.object({
  type: z.literal("file"),
  mediaType: z.string(),
  filename: z.string().optional(),
  url: z.string(),
  providerMetadata: providerMetadataSchema,
});

export const sourceUrlPartSchema = z.object({
  type: z.literal("source-url"),
  sourceId: z.string(),
  url: z.string(),
  title: z.string().optional(),
  providerMetadata: providerMetadataSchema,
});

export const sourceDocumentPartSchema = z.object({
  type: z.literal("source-document"),
  sourceId: z.string(),
  mediaType: z.string(),
  title: z.string(),
  filename: z.string().optional(),
  providerMetadata: providerMetadataSchema,
});

export const stepStartPartSchema = z.object({
  type: z.literal("step-start"),
});

export const dataPartSchema = z.object({
  type: z.string().startsWith("data-"),
  id: z.string().optional(),
  data: z.unknown(),
});

// Tool part schemas for different states
export const toolPartInputStreamingSchema = z.object({
  type: z.string().startsWith("tool-"),
  toolCallId: z.string(),
  state: z.literal("input-streaming"),
  providerExecuted: z.boolean().optional(),
  input: z.unknown().optional(),
  output: z.never().optional(),
  errorText: z.never().optional(),
  approval: z.never().optional(),
});

export const toolPartInputAvailableSchema = z.object({
  type: z.string().startsWith("tool-"),
  toolCallId: z.string(),
  state: z.literal("input-available"),
  providerExecuted: z.boolean().optional(),
  input: z.unknown(),
  output: z.never().optional(),
  errorText: z.never().optional(),
  callProviderMetadata: providerMetadataSchema,
  approval: z.never().optional(),
});

export const toolPartApprovalRequestedSchema = z.object({
  type: z.string().startsWith("tool-"),
  toolCallId: z.string(),
  state: z.literal("approval-requested"),
  input: z.unknown(),
  providerExecuted: z.boolean().optional(),
  output: z.never().optional(),
  errorText: z.never().optional(),
  callProviderMetadata: providerMetadataSchema,
  approval: z.object({
    id: z.string(),
    approved: z.never().optional(),
    reason: z.never().optional(),
  }),
});

export const toolPartApprovalRespondedSchema = z.object({
  type: z.string().startsWith("tool-"),
  toolCallId: z.string(),
  state: z.literal("approval-responded"),
  input: z.unknown(),
  providerExecuted: z.boolean().optional(),
  output: z.never().optional(),
  errorText: z.never().optional(),
  callProviderMetadata: providerMetadataSchema,
  approval: z.object({
    id: z.string(),
    approved: z.boolean(),
    reason: z.string().optional(),
  }),
});

export const toolPartOutputAvailableSchema = z.object({
  type: z.string().startsWith("tool-"),
  toolCallId: z.string(),
  state: z.literal("output-available"),
  providerExecuted: z.boolean().optional(),
  input: z.unknown(),
  output: z.unknown(),
  errorText: z.never().optional(),
  callProviderMetadata: providerMetadataSchema,
  preliminary: z.boolean().optional(),
  approval: z
    .object({
      id: z.string(),
      approved: z.literal(true),
      reason: z.string().optional(),
    })
    .optional(),
});

export const toolPartOutputErrorSchema = z.object({
  type: z.string().startsWith("tool-"),
  toolCallId: z.string(),
  state: z.literal("output-error"),
  providerExecuted: z.boolean().optional(),
  input: z.unknown(),
  output: z.never().optional(),
  errorText: z.string(),
  callProviderMetadata: providerMetadataSchema,
  approval: z
    .object({
      id: z.string(),
      approved: z.literal(true),
      reason: z.string().optional(),
    })
    .optional(),
});

export const toolPartOutputDeniedSchema = z.object({
  type: z.string().startsWith("tool-"),
  toolCallId: z.string(),
  state: z.literal("output-denied"),
  providerExecuted: z.boolean().optional(),
  input: z.unknown(),
  output: z.never().optional(),
  errorText: z.never().optional(),
  callProviderMetadata: providerMetadataSchema,
  approval: z.object({
    id: z.string(),
    approved: z.literal(false),
    reason: z.string().optional(),
  }),
});

// Union schema for all tool part states
export const toolPartSchema = z.union([
  toolPartInputStreamingSchema,
  toolPartInputAvailableSchema,
  toolPartApprovalRequestedSchema,
  toolPartApprovalRespondedSchema,
  toolPartOutputAvailableSchema,
  toolPartOutputErrorSchema,
  toolPartOutputDeniedSchema,
]);

// Union schema for all part types
export const messagePartSchema = z.union([
  textPartSchema,
  reasoningPartSchema,
  filePartSchema,
  sourceUrlPartSchema,
  sourceDocumentPartSchema,
  stepStartPartSchema,
  dataPartSchema,
  toolPartSchema,
]);

/**
 * Validates a tool part and returns the result
 * Returns result with success flag - if validation fails, the part should be skipped
 */
export function validateToolPart(part: unknown) {
  return toolPartSchema.safeParse(part);
}
