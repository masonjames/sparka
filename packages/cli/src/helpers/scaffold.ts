import { existsSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "../utils/run-command";

function findTemplateDir(): string {
  const __dir = dirname(fileURLToPath(import.meta.url));
  // Production (dist/index.js): ../templates/chat-app
  // Dev (src/helpers/scaffold.ts): ../../templates/chat-app
  for (const relative of ["../templates/chat-app", "../../templates/chat-app"]) {
    const candidate = resolve(__dir, relative);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    "Template not found. Run `bun template:sync` to generate templates."
  );
}

export async function scaffoldFromTemplate(
  destination: string
): Promise<void> {
  const templateDir = findTemplateDir();
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
