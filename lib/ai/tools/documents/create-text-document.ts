import { smoothStream, streamText, tool } from "ai";
import { z } from "zod";
import type { AppModelId } from "@/lib/ai/app-models";
import { getLanguageModel } from "@/lib/ai/providers";
import { saveDocument } from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";
import type { DocumentToolProps, DocumentToolResult } from "./types";

const TEXT_SYSTEM_PROMPT =
  "Write about the given topic. Markdown is supported. Use headings wherever appropriate.";

export const createTextDocumentTool = ({
  session,
  messageId,
  selectedModel,
  costAccumulator,
}: DocumentToolProps) =>
  tool({
    description: `Create a text document with markdown support.

Use for:
- Essays, articles, blog posts, reports
- Documentation, guides, tutorials
- Emails, letters, formal writing
- Any substantial text content (>100 lines)

The title should be descriptive of the content.`,
    inputSchema: z.object({
      title: z.string().describe("Document title"),
      description: z
        .string()
        .describe("A detailed description of what the document should contain"),
    }),
    async *execute({
      title,
      description,
    }): AsyncGenerator<DocumentToolResult, DocumentToolResult, unknown> {
      const id = generateUUID();

      yield { status: "streaming", id, title, kind: "text", content: "" };

      const result = streamText({
        model: await getLanguageModel(selectedModel),
        system: TEXT_SYSTEM_PROMPT,
        prompt: `Title: ${title}\nDescription: ${description}`,
        experimental_transform: smoothStream({ chunking: "word" }),
        experimental_telemetry: { isEnabled: true },
      });

      let content = "";

      for await (const delta of result.fullStream) {
        if (delta.type === "text-delta") {
          content += delta.text;
          yield { status: "streaming", id, title, kind: "text", content };
        }
      }

      const usage = await result.usage;
      costAccumulator?.addLLMCost(
        selectedModel as AppModelId,
        usage,
        "createTextDocument"
      );

      if (session.user?.id) {
        await saveDocument({
          id,
          title,
          content,
          kind: "text",
          userId: session.user.id,
          messageId,
        });
      }

      return { status: "complete", id, title, kind: "text", content };
    },
  });
