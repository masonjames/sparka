#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { cp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { join, resolve } from "node:path";
import {
  authEnvRequirements,
  featureEnvRequirements,
  gatewayEnvRequirements,
} from "../../../apps/chat/lib/config-requirements";

type PackageManager = "bun" | "npm" | "pnpm" | "yarn";
type Gateway = keyof typeof gatewayEnvRequirements;
type AuthProvider = keyof typeof authEnvRequirements;

const FEATURE_KEYS = [
  "sandbox",
  "webSearch",
  "urlRetrieval",
  "deepResearch",
  "mcp",
  "imageGeneration",
  "attachments",
  "followupSuggestions",
] as const;
type FeatureKey = (typeof FEATURE_KEYS)[number];

const FEATURE_DEFAULTS: Record<FeatureKey, boolean> = {
  sandbox: false,
  webSearch: false,
  urlRetrieval: false,
  deepResearch: false,
  mcp: false,
  imageGeneration: false,
  attachments: false,
  followupSuggestions: true,
};

const AUTH_DEFAULTS: Record<AuthProvider, boolean> = {
  google: false,
  github: true,
  vercel: false,
};

const FEATURE_HINTS: Partial<Record<FeatureKey, string>> = {
  sandbox: featureEnvRequirements.sandbox?.description,
  webSearch: featureEnvRequirements.webSearch?.description,
  urlRetrieval: featureEnvRequirements.urlRetrieval?.description,
  deepResearch: featureEnvRequirements.deepResearch?.description,
  mcp: featureEnvRequirements.mcp?.description,
  imageGeneration: featureEnvRequirements.imageGeneration?.description,
  attachments: featureEnvRequirements.attachments?.description,
};

const rl = createInterface({ input, output });

function inferPackageManager(): PackageManager {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm/")) {
    return "pnpm";
  }
  if (ua.startsWith("yarn/")) {
    return "yarn";
  }
  if (ua.startsWith("npm/")) {
    return "npm";
  }
  if (ua.startsWith("bun/")) {
    return "bun";
  }
  return "bun";
}

function toKebabCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const targetArg = args.find((arg) => !arg.startsWith("--"));
  const gitIndex = args.indexOf("--from-git");
  const fromGit = gitIndex !== -1 ? args[gitIndex + 1] : undefined;
  const yes = args.includes("--yes");
  const noInstall = args.includes("--no-install");
  return { targetArg, fromGit, yes, noInstall };
}

async function askText(label: string, fallback: string): Promise<string> {
  const answer = (await rl.question(`${label} (${fallback}): `)).trim();
  return answer || fallback;
}

async function askYesNo(label: string, fallback: boolean): Promise<boolean> {
  const suffix = fallback ? "Y/n" : "y/N";
  const answer = (await rl.question(`${label} [${suffix}] `))
    .trim()
    .toLowerCase();
  if (!answer) {
    return fallback;
  }
  return ["y", "yes"].includes(answer);
}

async function askGateway(defaultGateway: Gateway): Promise<Gateway> {
  const entries = Object.keys(gatewayEnvRequirements) as Gateway[];
  console.log("\nSelect AI gateway:");
  for (const [index, gateway] of entries.entries()) {
    const suffix = gateway === defaultGateway ? " (default)" : "";
    console.log(`${index + 1}) ${gateway}${suffix}`);
  }
  const answer = (await rl.question(`Gateway [${defaultGateway}]: `)).trim();
  if (!answer) {
    return defaultGateway;
  }
  const asNumber = Number.parseInt(answer, 10);
  if (!Number.isNaN(asNumber) && asNumber >= 1 && asNumber <= entries.length) {
    return entries[asNumber - 1];
  }
  if (entries.includes(answer as Gateway)) {
    return answer as Gateway;
  }
  return defaultGateway;
}

async function ensureTargetEmpty(targetDir: string): Promise<void> {
  const targetStats = await stat(targetDir).catch(() => null);
  if (!targetStats) {
    return;
  }
  if (!targetStats.isDirectory()) {
    throw new Error(`Target exists and is not a directory: ${targetDir}`);
  }
  const files = await readdir(targetDir);
  if (files.length > 0) {
    throw new Error(`Target directory is not empty: ${targetDir}`);
  }
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function scaffoldFromTemplate(destination: string): Promise<void> {
  const templateDir = resolve(import.meta.dir, "../../../templates/chat-app");
  await cp(templateDir, destination, { recursive: true });
}

async function scaffoldFromGit(url: string, destination: string): Promise<void> {
  await runCommand("git", ["clone", "--depth", "1", url, destination], process.cwd());
  await rm(join(destination, ".git"), { recursive: true, force: true });
}

function collectEnvChecklist(input: {
  gateway: Gateway;
  features: Record<FeatureKey, boolean>;
  auth: Record<AuthProvider, boolean>;
}): string[] {
  const requirements = new Set<string>();
  requirements.add(gatewayEnvRequirements[input.gateway].description);

  for (const feature of FEATURE_KEYS) {
    if (!input.features[feature]) {
      continue;
    }
    const requirement = FEATURE_HINTS[feature];
    if (requirement) {
      requirements.add(requirement);
    }
  }

  for (const provider of Object.keys(authEnvRequirements) as AuthProvider[]) {
    if (!input.auth[provider]) {
      continue;
    }
    requirements.add(authEnvRequirements[provider].description);
  }

  return [...requirements].sort();
}

function buildConfigTs(input: {
  appName: string;
  appPrefix: string;
  appUrl: string;
  githubUrl: string;
  gateway: Gateway;
  features: Record<FeatureKey, boolean>;
  auth: Record<AuthProvider, boolean>;
}): string {
  const featureLines = FEATURE_KEYS.map(
    (key) => `    ${key}: ${String(input.features[key])},`
  ).join("\n");
  const authLines = (Object.keys(authEnvRequirements) as AuthProvider[])
    .map((key) => `    ${key}: ${String(input.auth[key])},`)
    .join("\n");

  return `import type { ConfigInput } from "@/lib/config-schema";

const config: ConfigInput = {
  appName: ${JSON.stringify(input.appName)},
  appPrefix: ${JSON.stringify(input.appPrefix)},
  appUrl: ${JSON.stringify(input.appUrl)},
  githubUrl: ${JSON.stringify(input.githubUrl)},
  models: {
    gateway: ${JSON.stringify(input.gateway)},
  },
  features: {
${featureLines}
  },
  authentication: {
${authLines}
  },
};

export default config;
`;
}

async function main(): Promise<void> {
  const parsed = parseArgs();
  const packageManager = inferPackageManager();

  const projectNameInput = parsed.yes
    ? parsed.targetArg ?? "my-chat-app"
    : await askText("Project name", parsed.targetArg ?? "my-chat-app");
  const projectName = toKebabCase(projectNameInput) || "my-chat-app";
  const targetDir = resolve(process.cwd(), projectName);
  const appName = parsed.yes
    ? "My Chat App"
    : await askText("App display name", "My Chat App");
  const appPrefix = parsed.yes
    ? toKebabCase(appName) || "chat"
    : await askText("App prefix", toKebabCase(appName) || "chat");
  const appUrl = parsed.yes
    ? "http://localhost:3000"
    : await askText("App URL", "http://localhost:3000");
  const githubUrl = parsed.yes
    ? "https://github.com/your-org/your-repo"
    : await askText("GitHub URL", "https://github.com/your-org/your-repo");
  const gateway = parsed.yes ? "vercel" : await askGateway("vercel");

  const features = { ...FEATURE_DEFAULTS };
  if (!parsed.yes) {
    console.log("\nFeature selection:");
    for (const feature of FEATURE_KEYS) {
      const hint = FEATURE_HINTS[feature];
      const label = hint ? `${feature} (${hint})` : feature;
      features[feature] = await askYesNo(
        `Enable ${label}?`,
        FEATURE_DEFAULTS[feature]
      );
    }
  }
  if (features.deepResearch) {
    features.webSearch = true;
  }

  const auth = { ...AUTH_DEFAULTS };
  if (!parsed.yes) {
    console.log("\nAuth providers:");
    for (const provider of Object.keys(authEnvRequirements) as AuthProvider[]) {
      auth[provider] = await askYesNo(
        `Enable ${provider} (${authEnvRequirements[provider].description})?`,
        AUTH_DEFAULTS[provider]
      );
    }
  }

  await ensureTargetEmpty(targetDir);

  if (parsed.fromGit) {
    await scaffoldFromGit(parsed.fromGit, targetDir);
  } else {
    await scaffoldFromTemplate(targetDir);
  }

  const packageJsonPath = join(targetDir, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    name?: string;
  };
  packageJson.name = projectName;
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  const configSource = buildConfigTs({
    appName,
    appPrefix,
    appUrl,
    githubUrl,
    gateway,
    features,
    auth,
  });
  await writeFile(join(targetDir, "chat.config.ts"), configSource);

  const installNow = parsed.noInstall
    ? false
    : parsed.yes
      ? true
      : await askYesNo(`Install dependencies with ${packageManager}?`, true);
  if (installNow) {
    await runCommand(packageManager, ["install"], targetDir);
  }

  const envChecklist = collectEnvChecklist({ gateway, features, auth });
  console.log("\nDone.");
  console.log(`\nNext:\n  cd ${projectName}\n  ${packageManager} run dev`);
  console.log("\nRequired env vars based on your selections:");
  for (const item of envChecklist) {
    console.log(`  - ${item}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => {
    rl.close();
  });

