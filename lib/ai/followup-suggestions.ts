import { type ModelMessage, streamObject } from "ai";
import { z } from "zod";
import { DEFAULT_FOLLOWUP_SUGGESTIONS_MODEL } from "@/lib/ai/app-models";
import { getLanguageModel } from "@/lib/ai/providers";
import type { StreamWriter } from "@/lib/ai/types";
import { generateUUID } from "@/lib/utils";

export function generateFollowupSuggestions(modelMessages: ModelMessage[]) {
  const maxQuestionCount = 5;
  const minQuestionCount = 3;
  const maxCharactersPerQuestion = 80;
  return streamObject({
    model: getLanguageModel(DEFAULT_FOLLOWUP_SUGGESTIONS_MODEL),
    messages: [
      ...modelMessages,
      {
        role: "user",
        content: `What question should I ask next? Return an array of suggested questions (minimum ${minQuestionCount}, maximum ${maxQuestionCount}). Each question should be no more than ${maxCharactersPerQuestion} characters.`,
      },
    ],
    schema: z.object({
      suggestions: z
        .array(z.string())
        .min(minQuestionCount)
        .max(maxQuestionCount),
    }),
  });
}

export async function streamFollowupSuggestions({
  followupSuggestionsResult,
  writer,
}: {
  followupSuggestionsResult: ReturnType<typeof generateFollowupSuggestions>;
  writer: StreamWriter;
}) {
  const dataPartId = generateUUID();

  for await (const chunk of followupSuggestionsResult.partialObjectStream) {
    writer.write({
      id: dataPartId,
      type: "data-followupSuggestions",
      data: {
        suggestions:
          chunk.suggestions?.filter(
            (suggestion): suggestion is string => suggestion !== undefined
          ) ?? [],
      },
    });
  }
}
