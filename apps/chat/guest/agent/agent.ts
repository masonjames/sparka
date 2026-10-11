import { defineAgent, defineDynamic } from "eve";

import { GUEST_SESSION_DURATION_MS } from "../../lib/eve/disposable-guest";
import { resolveEveModel } from "../../lib/eve/model-selection";

/* oxlint-disable typescript/promise-function-async --typescript/promise-function-async (#606): default export preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections. */

export default defineAgent({
  defaultTools: false,
  // Disposable guests use Vercel Workflow when deployed and isolated local storage
  // in development. Sharing the registered agent's PostgreSQL queue is unsafe.
  experimental: { workflow: { retention: 0 } },
  limits: { sessionTimeoutMs: GUEST_SESSION_DURATION_MS },
  model: defineDynamic({
    events: {
      "step.started": (
        _event: unknown,
        context: Readonly<{
          session: Readonly<{
            auth: Readonly<{
              initiator: Readonly<{
                attributes: Readonly<
                  Record<string, string | readonly string[]>
                >;
              }> | null;
            }>;
          }>;
        }>
      ) => {
        const modelId = context.session.auth.initiator?.attributes.modelId;
        if (typeof modelId !== "string") {
          throw new TypeError("Guest session has no authorized model.");
        }
        return resolveEveModel(modelId);
      },
    },
  }),
});
/* oxlint-enable typescript/promise-function-async */
