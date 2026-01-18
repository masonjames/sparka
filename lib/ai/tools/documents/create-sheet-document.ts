import { Output, streamText, tool } from "ai";
import { z } from "zod";
import type { AppModelId } from "@/lib/ai/app-models";
import { sheetPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { saveDocument } from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";
import type { DocumentToolProps, DocumentToolResult } from "./types";

export const createSheetDocumentTool = ({
  session,
  messageId,
  selectedModel,
  costAccumulator,
}: DocumentToolProps) =>
  tool({
    description: `Create a spreadsheet document in CSV format.

Use for:
- Data tables and datasets
- Lists with multiple columns
- Financial data, statistics
- Any tabular information

The spreadsheet will be created with proper column headers and data.`,
    inputSchema: z.object({
      title: z.string().describe("Spreadsheet title"),
      description: z
        .string()
        .describe("A detailed description of the data and columns needed"),
    }),
    async *execute({
      title,
      description,
    }): AsyncGenerator<DocumentToolResult, DocumentToolResult, unknown> {
      const id = generateUUID();

      yield { status: "streaming", id, title, kind: "sheet", content: "" };

      const result = streamText({
        model: await getLanguageModel(selectedModel),
        system: sheetPrompt,
        prompt: `Title: ${title}\nDescription: ${description}`,
        experimental_telemetry: { isEnabled: true },
        output: Output.object({
          schema: z.object({
            csv: z.string().describe("CSV data"),
          }),
        }),
      });

      let content = "";

      for await (const partialObject of result.partialOutputStream) {
        const { csv } = partialObject;
        if (csv) {
          content = csv;
          yield { status: "streaming", id, title, kind: "sheet", content };
        }
      }

      const usage = await result.usage;
      costAccumulator?.addLLMCost(
        selectedModel as AppModelId,
        usage,
        "createSheetDocument"
      );

      if (session.user?.id) {
        await saveDocument({
          id,
          title,
          content,
          kind: "sheet",
          userId: session.user.id,
          messageId,
        });
      }

      return { status: "complete", id, title, kind: "sheet", content };
    },
  });
