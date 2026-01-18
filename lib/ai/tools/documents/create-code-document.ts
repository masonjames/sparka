import { Output, streamText, tool } from "ai";
import { z } from "zod";
import type { AppModelId } from "@/lib/ai/app-models";
import { codePrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { saveDocument } from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";
import type { DocumentToolProps, DocumentToolResult } from "./types";

export const createCodeDocumentTool = ({
  session,
  messageId,
  selectedModel,
  costAccumulator,
}: DocumentToolProps) =>
  tool({
    description: `Create a code document/file.

Use for:
- Python scripts and programs
- Code snippets that need to be saved
- Single-file code examples

The title MUST include the file extension (e.g., "script.py", "App.tsx", "utils.js").
This extension determines syntax highlighting.`,
    inputSchema: z.object({
      title: z
        .string()
        .describe(
          'Filename with extension (e.g., "script.py", "component.tsx", "utils.js")'
        ),
      description: z
        .string()
        .describe("A detailed description of what the code should do"),
    }),
    async *execute({
      title,
      description,
    }): AsyncGenerator<DocumentToolResult, DocumentToolResult, unknown> {
      const id = generateUUID();

      yield { status: "streaming", id, title, kind: "code", content: "" };

      const result = streamText({
        model: await getLanguageModel(selectedModel),
        system: codePrompt,
        prompt: `Title: ${title}\nDescription: ${description}`,
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
          yield { status: "streaming", id, title, kind: "code", content };
        }
      }

      const usage = await result.usage;
      costAccumulator?.addLLMCost(
        selectedModel as AppModelId,
        usage,
        "createCodeDocument"
      );

      if (session.user?.id) {
        await saveDocument({
          id,
          title,
          content,
          kind: "code",
          userId: session.user.id,
          messageId,
        });
      }

      return { status: "complete", id, title, kind: "code", content };
    },
  });
