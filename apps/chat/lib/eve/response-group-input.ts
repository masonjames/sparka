import { z } from "zod";

import { frontendToolsSchema } from "@/lib/ai/types";
import type { ReadonlyNativeSurface } from "@/lib/readonly-native-surface";

import { eveForkInput } from "./contracts";
import { eveMessageInput } from "./message-input";
import type { ReadonlyEveMessageInput } from "./readonly-message-types";

/* oxlint-disable typescript/strict-boolean-expressions -- * typescript/strict-boolean-expressions (#610): eveResponseGroupInput intentionally keeps the existing falsy-value behavior of input.projectId; distinguishing empty, zero, and absent states requires a domain behavior decision. */
export const eveResponseGroupInput = z
  .object({
    operationId: z.uuid(),
    modelIds: z.array(z.string().min(1).max(200)).min(2),
    message: eveMessageInput,
    selectedTool: frontendToolsSchema.optional(),
    fork: eveForkInput.optional(),
    forkKind: z.enum(["edit", "comparison"]).optional(),
    projectId: z.uuid().optional(),
  })
  .strict()
  .refine(
    (input: { readonly fork?: unknown; readonly projectId?: string }) =>
      !(input.fork && input.projectId),
    "Forks inherit their source project."
  )
  .refine(
    (input: {
      readonly forkKind?: "edit" | "comparison";
      readonly fork?: unknown;
    }) => !input.forkKind || input.fork,
    "Fork intent requires a source conversation."
  )
  .transform(
    (
      input: ReadonlyNativeSurface<{
        operationId: string;
        modelIds: string[];
        selectedTool?:
          | "deepResearch"
          | "createTextDocument"
          | "createCodeDocument"
          | "createSheetDocument"
          | "editTextDocument"
          | "editCodeDocument"
          | "editSheetDocument"
          | "webSearch"
          | "generateImage"
          | "generateVideo"
          | undefined;
        fork?:
          | {
              conversationId: string;
              beforeTurnId: string;
              checkpointId?: string | undefined;
              beforeMessageId?: undefined;
            }
          | {
              conversationId: string;
              beforeMessageId: string;
              beforeTurnId?: undefined;
              checkpointId?: undefined;
            }
          | undefined;
        forkKind?: "edit" | "comparison" | undefined;
        projectId?: string | undefined;
      }> & { readonly message: ReadonlyEveMessageInput }
    ) => ({
      ...input,
      operationId: input.operationId.toLowerCase(),
    })
  );
/* oxlint-enable typescript/strict-boolean-expressions */
