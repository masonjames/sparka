import { smoothStream, streamText, tool } from "ai";
import { z } from "zod";
import type { AppModelId } from "@/lib/ai/app-models";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { getDocumentById, saveDocument } from "@/lib/db/queries";
import type { DocumentToolProps, DocumentToolResult } from "./types";

export const editTextDocumentTool = ({
  session,
  messageId,
  selectedModel,
  costAccumulator,
}: DocumentToolProps) =>
  tool({
    description: `Edit an existing text document.

Use for:
- Rewriting the whole document for major changes
- Making targeted edits for isolated changes
- Following user instructions about which parts to modify

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

      if (document.kind !== "text") {
        return { error: "Document is not a text document" };
      }

      yield {
        status: "streaming",
        id,
        title: document.title,
        kind: "text",
        content: "",
      };

      const result = streamText({
        model: await getLanguageModel(selectedModel),
        system: updateDocumentPrompt(document.content, "text"),
        prompt: description,
        experimental_transform: smoothStream({ chunking: "word" }),
        experimental_telemetry: {
          isEnabled: true,
          functionId: "editTextDocument",
        },
        providerOptions: {
          openai: {
            prediction: {
              type: "content",
              content: document.content,
            },
          },
        },
      });

      let content = "";

      for await (const delta of result.fullStream) {
        if (delta.type === "text-delta") {
          content += delta.text;
          yield {
            status: "streaming",
            id,
            title: document.title,
            kind: "text",
            content,
          };
        }
      }

      const usage = await result.usage;
      costAccumulator?.addLLMCost(
        selectedModel as AppModelId,
        usage,
        "editTextDocument"
      );

      if (session.user?.id) {
        await saveDocument({
          id,
          title: document.title,
          content,
          kind: "text",
          userId: session.user.id,
          messageId,
        });
      }

      return {
        status: "complete",
        id,
        title: document.title,
        kind: "text",
        content,
      };
    },
  });
