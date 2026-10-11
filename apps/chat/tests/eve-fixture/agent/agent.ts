/* oxlint-disable promise/avoid-new -- These fixtures adapt callback, timer, stream, or browser event APIs into awaited Promises. */
import { defineAgent } from "eve";
import { mockModel } from "eve/evals";

/* oxlint-disable typescript/strict-boolean-expressions, typescript/strict-void-return --
 * typescript/strict-boolean-expressions (#610): default export intentionally keeps the existing falsy-value behavior of lastUserMessage?.startsWith("slow"); lastUserMessage?.startsWith("confirm"); distinguishing empty, zero, and absent states requires a domain behavior decision.
 * typescript/strict-void-return (#611): default export's void callback contract discards its result; changing the callback API or operation order solely to hide the return value is unnecessary.
 */
export default defineAgent({
  experimental: { workflow: { world: "@workflow/world-postgres" } },
  model: mockModel(async ({ lastUserMessage, toolResults, tools }) => {
    if (lastUserMessage?.startsWith("slow")) {
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
    if (lastUserMessage === "fail") {
      throw new Error("Deterministic provider failure");
    }
    if (lastUserMessage === "question") {
      if (toolResults.length > 0) {
        return "Answer received.";
      }
      return {
        toolCalls: [
          {
            name: "ask_question",
            input: { prompt: "What should the note say?", allowFreeform: true },
          },
        ],
      };
    }
    if (lastUserMessage?.startsWith("confirm")) {
      if (toolResults.length > 0) {
        return "Approval handled.";
      }
      const tool = tools.find((item) => item.name === "confirm_note");
      return {
        toolCalls: [
          {
            name: tool?.name ?? "run_tool",
            input: tool
              ? { note: "Review release" }
              : { name: "confirm_note", input: { note: "Review release" } },
          },
        ],
      };
    }
    return `Verified: ${lastUserMessage}`;
  }),
  modelContextWindowTokens: 128_000,
});
/* oxlint-enable typescript/strict-boolean-expressions, typescript/strict-void-return */
