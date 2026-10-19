import { config } from "../lib/config";
import { getSandboxProvider } from "../lib/sandbox/runtime";
import {
  hasDevelopmentPersistentSandboxes,
  stopDevelopmentPersistentSandboxes,
} from "../lib/eve/persistent-sandbox-store";
import { z } from "zod";

const runId = z.uuid().parse(process.argv[2]);
if (await hasDevelopmentPersistentSandboxes(runId)) {
  if (config.persistentSandbox !== "app") {
    throw new Error(
      "Restore the app-owned sandbox profile before reconciling its development run."
    );
  }
  const provider = getSandboxProvider();
  if (!provider.persistent) {
    throw new Error("Persistent sandbox cleanup provider is unavailable.");
  }
  await stopDevelopmentPersistentSandboxes(
    runId,
    provider.scope,
    provider.persistent.stop
  );
}
// The app DB pool otherwise keeps this one-shot supervisor command alive.
process.exit(0);
