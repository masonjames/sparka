import { getPersistentSandboxProvider } from "../lib/sandbox/runtime";
import { stopDevelopmentPersistentSandboxes } from "../lib/eve/persistent-sandbox-store";
import { z } from "zod";

const runId = z.uuid().parse(process.argv[2]);
await stopDevelopmentPersistentSandboxes(runId, getPersistentSandboxProvider);
// The app DB pool otherwise keeps this one-shot supervisor command alive.
process.exit(0);
