import type { UiToolName } from "@/lib/ai/types";
import { env } from "@/lib/env";
import { getEveConnectionOptions } from "./connection-options";
import { resolveWorkflowWorld } from "./world-config";

const assertEveConfigured = (): void => {
  if (
    !(
      typeof env.EVE_INTERNAL_ORIGIN === "string" &&
      env.EVE_INTERNAL_ORIGIN !== "" &&
      typeof env.EVE_GATEWAY_SECRET === "string" &&
      env.EVE_GATEWAY_SECRET !== "" &&
      (resolveWorkflowWorld(env) === "vercel" ||
        (typeof env.WORKFLOW_POSTGRES_URL === "string" &&
          env.WORKFLOW_POSTGRES_URL !== ""))
    )
  ) {
    throw new Error(
      "Configure the Eve origin, gateway secret and local workflow database (outside Vercel) before starting a conversation."
    );
  }
};

const eveRequest = async (
  owner: string,
  path: string,

  init: RequestInit = {},
  modelId?: string,
  selectedTool?: UiToolName
): Promise<Response> => {
  assertEveConfigured();
  const connection = getEveConnectionOptions(owner);
  const headers = new Headers({
    ...connection.headers,
    authorization: `Bearer ${connection.auth.bearer}`,
  });
  if (typeof modelId === "string" && modelId !== "") {
    headers.set("x-chatjs-model", modelId);
  }
  if (typeof selectedTool === "string") {
    headers.set("x-chatjs-tool", selectedTool);
  }

  // oxlint-disable-next-line typescript/strict-boolean-expressions -- BodyInit combines text, buffers and streams with null/undefined; retain no content-type for empty text or absent bodies. Explicit null comparisons also conflict with unicorn/no-null.
  if (init.body) {
    headers.set("content-type", "application/json");
  }
  return await fetch(new URL(path, connection.host), {
    ...init,
    cache: "no-store",
    headers,
    redirect: "error",
  });
};
export { assertEveConfigured, eveRequest };
