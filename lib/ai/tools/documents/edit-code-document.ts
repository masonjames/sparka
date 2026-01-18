import { Output, streamText, tool } from "ai";
import { z } from "zod";
import type { AppModelId } from "@/lib/ai/app-models";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { getDocumentById, saveDocument } from "@/lib/db/queries";
import type { DocumentToolProps, DocumentToolResult } from "./types";

export const editCodeDocumentTool = ({
  session,
  messageId,
  selectedModel,
  costAccumulator,
}: DocumentToolProps) =>
  tool({
    description: `Edit an existing code document.

Use for:
- Fixing bugs or errors in the code
- Adding new functionality
- Refactoring or improving code quality
- Following user instructions about code changes

Avoid:
- Updating immediately after a document was just created
- Using this if there is no previous document in the conversation`,
    inputSchema: z.object({
      id: z.string().describe("The ID of the document to edit"),
      description: z
        .string()
        .describe("Description of the changes that need to be made"),
    }),
    async *execute({
      id,
      description,
    }): AsyncGenerator<
      DocumentToolResult,
      DocumentToolResult | { error: string },
      unknown
    > {
      const document = await getDocumentById({ id });

      if (!document) {
        return { error: "Document not found" };
      }

      if (document.kind !== "code") {
        return { error: "Document is not a code document" };
      }

      yield {
        status: "streaming",
        id,
        title: document.title,
        kind: "code",
        content: "",
      };

      const result = streamText({
        model: await getLanguageModel(selectedModel),
        system: updateDocumentPrompt(document.content || "", "code"),
        prompt: description,
        experimental_telemetry: { isEnabled: true },
        output: Output.object({
          schema: z.object({
            code: z.string(),
          }),
        }),
      });

      let content = "";

      for await (const partialObject of result.partialOutputStream) {
        const { code } = partialObject;
        if (code) {
          content = code;
          yield {
            status: "streaming",
            id,
            title: document.title,
            kind: "code",
            content,
          };
        }
      }

      const usage = await result.usage;
      costAccumulator?.addLLMCost(
        selectedModel as AppModelId,
        usage,
        "editCodeDocument"
      );

      if (session.user?.id) {
        await saveDocument({
          id,
          title: document.title,
          content,
          kind: "code",
          userId: session.user.id,
          messageId,
        });
      }

      return {
        status: "complete",
        id,
        title: document.title,
        kind: "code",
        content,
      };
    },
  });
