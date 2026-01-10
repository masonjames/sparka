import { streamObject } from "ai";
import { z } from "zod";
import type { AppModelId } from "@/lib/ai/app-models";
import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({
    title: _title,
    description: _description,
    dataStream,
    prompt,
    selectedModel,
    costAccumulator,
  }) => {
    let draftContent = "";

    const result = streamObject({
      model: await getLanguageModel(selectedModel),
      system: codePrompt,
      prompt,
      experimental_telemetry: { isEnabled: true },
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of result.fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: "data-codeDelta",
            data: code ?? "",
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    const usage = await result.usage;
    costAccumulator?.addLLMCost(selectedModel, usage, "createDocument-code");

    return draftContent;
  },
  onUpdateDocument: async ({
    document,
    description,
    dataStream,
    selectedModel,
    costAccumulator,
  }) => {
    let draftContent = "";

    const result = streamObject({
      model: await getLanguageModel(selectedModel),
      system: updateDocumentPrompt(document.content || "", "code"),
      experimental_telemetry: { isEnabled: true },
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of result.fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: "data-codeDelta",
            data: code ?? "",
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    const usage = await result.usage;
    costAccumulator?.addLLMCost(
      selectedModel as AppModelId,
      usage,
      "updateDocument-code"
    );

    return draftContent;
  },
});
