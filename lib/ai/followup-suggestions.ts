import { type ModelMessage, Output, streamText } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";
import type { StreamWriter } from "@/lib/ai/types";
import { config } from "@/lib/config";
import { generateUUID } from "@/lib/utils";

export async function generateFollowupSuggestions(
  modelMessages: ModelMessage[]
) {
  const maxQuestionCount = 5;
  const minQuestionCount = 3;
  const maxCharactersPerQuestion = 80;
  const prompt = `Generate follow-up suggestions that can be sent directly as the user's next message.

Rules:
- Return JSON object: { "suggestions": string[] } only.
- ${minQuestionCount}-${maxQuestionCount} suggestions total.
- Each suggestion must be <= ${maxCharactersPerQuestion} characters.
- Write each suggestion in first-person user voice, as if the user is typing it.
- No meta prompts like "Would you like..." or "What topic...".
- No assistant voice, no commentary, no numbering.
- Keep each suggestion specific and actionable.

Good:
- "Help me debug this stack trace."
- "Give me a 5-step plan to learn this."
- "Rewrite that answer as a short email."

Bad:
- "Would you like a short answer or detailed steps?"
- "What topic would you like to explore next?"`;

  return streamText({
    model: await getLanguageModel(config.models.defaults.followupSuggestions),
    messages: [
      ...modelMessages,
      {
        role: "user",
        content: prompt,
      },
    ],
    output: Output.object({
      schema: z.object({
        suggestions: z
          .array(z.string())
          .min(minQuestionCount)
          .max(maxQuestionCount),
      }),
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
  const result = await followupSuggestionsResult;

  for await (const chunk of result.partialOutputStream) {
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
