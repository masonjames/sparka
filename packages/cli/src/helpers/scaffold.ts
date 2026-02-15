import { cp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { runCommand } from "../utils/run-command";

export async function scaffoldFromTemplate(
  destination: string
): Promise<void> {
  const templateDir = resolve(
    import.meta.dir,
    "../../../../templates/chat-app"
  );
  await cp(templateDir, destination, { recursive: true });
}

export async function scaffoldFromGit(
  url: string,
  destination: string
): Promise<void> {
  await runCommand(
    "git",
    ["clone", "--depth", "1", url, destination],
    process.cwd()
  );
  await rm(join(destination, ".git"), { recursive: true, force: true });
}
