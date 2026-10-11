import { z } from "zod";

import { checkDatabase } from "@/lib/db/health";
import { env } from "@/lib/env";

const MINIMUM_WORKFLOW_ID_LENGTH = 1;
const EVE_HEALTH_TIMEOUT_MS = 4000;
const READINESS_TIMEOUT_MS = 4500;

const eveHealth = z.object({
  ok: z.literal(true),
  status: z.literal("ready"),
  workflowId: z.string().min(MINIMUM_WORKFLOW_ID_LENGTH),
});

export const GET = async (): Promise<Response> => {
  // Public readiness reveals no database, agent or credential details.
  // Both workers must be ready before the host sends traffic to this instance.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all([
        checkDatabase(),
        ...["chat", "guest"].map(async (agent) => {
          const response = await fetch(
            new URL(`/eve/${agent}/v1/health`, env.EVE_INTERNAL_ORIGIN),
            {
              cache: "no-store",
              redirect: "error",
              signal: AbortSignal.timeout(EVE_HEALTH_TIMEOUT_MS),
            }
          );
          if (!response.ok) {
            throw new Error("Eve unavailable");
          }
          eveHealth.parse(await response.json());
        }),
      ]),
      // oxlint-disable-next-line promise/avoid-new -- Bridge the readiness timer or never-settling test fixture to the awaited operation.
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("Readiness timed out"));
        }, READINESS_TIMEOUT_MS);
      }),
    ]);
    return Response.json(
      { status: "ready" },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { headers: { "cache-control": "no-store" }, status: 503 }
    );
  } finally {
    clearTimeout(timeout);
  }
};
