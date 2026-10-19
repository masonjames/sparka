import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import pathModule from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

// oxlint-disable-next-line typescript/strict-void-return -- Node promisify uses execFile's custom promise implementation; its ChildProcess return is intentionally ignored.
const execute = promisify(execFile);
const directory = pathModule.join(
  process.cwd(),
  "apps/chat/.eve/chatjs-cleanup"
);
const intent = z.object({
  pid: z.number().int().positive(),
  started: z.string(),
  runId: z.uuid(),
});
const deadline = 60_000;
const processStart = async (pid: number): Promise<string | null> => {
  try {
    const { stdout } = await execute(
      "ps",
      ["-p", String(pid), "-o", "lstart="],
      { timeout: 5000 }
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
};
const stop = async (runId: string): Promise<void> => {
  await execute(
    process.execPath,
    [
      "--tsconfig-override=apps/chat/tsconfig.json",
      "--env-file=.env.local",
      "--env-file=.env.worktree.local",
      "apps/chat/scripts/stop-persistent-sandboxes.ts",
      runId,
    ],
    { cwd: process.cwd(), timeout: deadline }
  );
};
export const finishPersistentSandboxCleanup = async (
  runId: string
): Promise<void> => {
  await stop(runId);
  await rm(pathModule.join(directory, `${runId}.json`), { force: true });
};
/** Recover only dead supervisor runs in this checkout; never stop another live run. */
export const preparePersistentSandboxCleanup = async (
  runId: string
): Promise<void> => {
  await mkdir(directory, { recursive: true });
  for (const name of await readdir(directory)) {
    if (!name.endsWith(".json")) {
      continue;
    }
    // oxlint-disable-next-line eslint/no-await-in-loop -- Recover one dead run before starting another runtime.
    const content = await readFile(pathModule.join(directory, name), "utf-8");
    const saved = intent.parse(JSON.parse(content));
    if (name !== `${saved.runId}.json`) {
      throw new Error("Sandbox cleanup intent identity mismatch.");
    }
    // oxlint-disable-next-line eslint/no-await-in-loop -- Verify process start identity before touching its resources.
    if ((await processStart(saved.pid)) === saved.started) {
      continue;
    }
    // oxlint-disable-next-line eslint/no-await-in-loop -- Failed cleanup retains the original intent and blocks a fresh run.
    await finishPersistentSandboxCleanup(saved.runId);
  }
  const started = await processStart(process.pid);
  if (started === null) {
    throw new Error("Supervisor identity unavailable.");
  }
  await writeFile(
    pathModule.join(directory, `${runId}.json`),
    JSON.stringify({ pid: process.pid, started, runId }),
    { flag: "wx" }
  );
};
