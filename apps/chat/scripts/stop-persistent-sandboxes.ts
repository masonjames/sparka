import { getSandboxProvider } from "../lib/sandbox/runtime";
import { stopDevelopmentPersistentSandboxes } from "../lib/eve/persistent-sandbox-store";
import { z } from "zod";

const runId = z.uuid().parse(process.argv[2]);
const provider = getSandboxProvider();
if (!provider.persistent) {
  throw new Error("Persistent sandbox cleanup provider is unavailable.");
}
await stopDevelopmentPersistentSandboxes(
  runId,
  provider.scope,
  provider.persistent.stop
);
// The app DB pool otherwise keeps this one-shot supervisor command alive.
process.exit(0);
