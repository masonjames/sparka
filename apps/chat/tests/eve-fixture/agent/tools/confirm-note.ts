import { defineDynamic, defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { filterEveTools } from "../../../../lib/eve/turn-tools";

/* oxlint-disable typescript/promise-function-async --
 * typescript/promise-function-async (#606): confirmNote preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections.
 */
const confirmNote = defineTool({
  approval: {
    request: always(),
    response: ({ responder, session }) => {
      if (responder.principalId === session.initiator?.principalId) {
        return { status: "allowed" };
      }
      return { reason: "Only the owner may respond", status: "rejected" };
    },
  },
  description:
    "Confirm a short note after explicit human approval. No external side effects.",
  execute: ({ note }) => Promise.resolve({ confirmed: true, note }),
  inputSchema: z.object({ note: z.string().trim().min(1).max(500) }),
});
/* oxlint-enable typescript/promise-function-async */

export default defineDynamic({
  events: {
    "step.started": () => filterEveTools({ confirm_note: confirmNote }),
  },
});
