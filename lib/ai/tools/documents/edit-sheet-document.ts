import { Output, streamText, tool } from "ai";
import { z } from "zod";
import type { AppModelId } from "@/lib/ai/app-models";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { getDocumentById, saveDocument } from "@/lib/db/queries";
import type { DocumentToolProps, DocumentToolResult } from "./types";

export const editSheetDocumentTool = ({
  session,
  messageId,
  selectedModel,
  costAccumulator,
}: DocumentToolProps) =>
  tool({
    description: `Edit an existing spreadsheet document.

Use for:
- Adding or removing rows/columns
- Updating data values
- Restructuring the spreadsheet
- Following user instructions about data changes

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

      if (document.kind !== "sheet") {
        return { error: "Document is not a spreadsheet" };
      }

      yield {
        status: "streaming",
        id,
        title: document.title,
        kind: "sheet",
        content: "",
      };

      const result = streamText({
        model: await getLanguageModel(selectedModel),
        system: updateDocumentPrompt(document.content, "sheet"),
        prompt: description,
        experimental_telemetry: { isEnabled: true },
        output: Output.object({
          schema: z.object({
            csv: z.string(),
          }),
        }),
      });

      let content = "";

      for await (const partialObject of result.partialOutputStream) {
        const { csv } = partialObject;
        if (csv) {
          content = csv;
          yield {
            status: "streaming",
            id,
            title: document.title,
            kind: "sheet",
            content,
          };
        }
      }

      const usage = await result.usage;
      costAccumulator?.addLLMCost(
        selectedModel as AppModelId,
        usage,
        "editSheetDocument"
      );

      if (session.user?.id) {
        await saveDocument({
          id,
          title: document.title,
          content,
          kind: "sheet",
          userId: session.user.id,
          messageId,
        });
      }

      return {
        status: "complete",
        id,
        title: document.title,
        kind: "sheet",
        content,
      };
    },
  });
