#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { cp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  authEnvRequirements,
  featureEnvRequirements,
  gatewayEnvRequirements,
} from "../../../apps/chat/lib/config-requirements";
import { GATEWAY_MODEL_DEFAULTS } from "../../../apps/chat/lib/ai/gateway-model-defaults";
import { configSchema } from "../../../apps/chat/lib/config-schema";

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

function extractDescriptions(
  schema: z.ZodType,
  prefix = "",
  result: Map<string, string> = new Map()
): Map<string, string> {
  // Unwrap wrappers (default, optional, etc.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unwrapped: any = schema;
  while (
    unwrapped instanceof z.ZodDefault ||
    unwrapped instanceof z.ZodOptional
  ) {
    unwrapped = unwrapped._zod.def.innerType;
  }

  if (unwrapped.description && prefix) {
    result.set(prefix, unwrapped.description);
  }

  if (unwrapped instanceof z.ZodObject) {
    const shape = unwrapped._zod.def.shape;
    for (const [key, propSchema] of Object.entries(shape)) {
      const path = prefix ? `${prefix}.${key}` : key;
      extractDescriptions(propSchema as z.ZodType, path, result);
    }
  }

  return result;
}

const descriptions = extractDescriptions(configSchema);

const VALID_KEY_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const formatKey = (key: string) =>
  VALID_KEY_REGEX.test(key) ? key : JSON.stringify(key);

function formatValue(value: unknown, indent: number): string {
  const spaces = "  ".repeat(indent);
  const inner = "  ".repeat(indent + 1);

  if (value === null || value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    if (value.every((v) => typeof v === "string")) {
      return `[${value.map((v) => JSON.stringify(v)).join(", ")}]`;
    }
    return `[\n${value.map((v) => `${inner}${formatValue(v, indent + 1)}`).join(",\n")}\n${spaces}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return "{}";
    }
    return `{\n${entries.map(([k, v]) => `${inner}${formatKey(k)}: ${formatValue(v, indent + 1)}`).join(",\n")},\n${spaces}}`;
  }

  return String(value);
}

function generateConfig(
  obj: Record<string, unknown>,
  indent: number,
  pathPrefix: string,
  descriptions: Map<string, string>
): string {
  const spaces = "  ".repeat(indent);

  return Object.entries(obj)
    .map(([key, value]) => {
      const path = pathPrefix ? `${pathPrefix}.${key}` : key;
      const desc = descriptions.get(path);
      const comment = desc ? ` // ${desc}` : "";

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const nested = generateConfig(
          value as Record<string, unknown>,
          indent + 1,
          path,
          descriptions
        );
        return `${spaces}${formatKey(key)}: {\n${nested}\n${spaces}},`;
      }

      return `${spaces}${formatKey(key)}: ${formatValue(value, indent)},${comment}`;
    })
    .join("\n");
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
  const modelDefaults = GATEWAY_MODEL_DEFAULTS[input.gateway];
  const fullConfig: Record<string, unknown> = {
    githubUrl: input.githubUrl,
    appPrefix: input.appPrefix,
    appName: input.appName,
    appDescription: "AI chat powered by ChatJS",
    appUrl: input.appUrl,
    organization: {
      name: "Your Organization",
      contact: {
        privacyEmail: "privacy@your-domain.com",
        legalEmail: "legal@your-domain.com",
      },
    },
    services: {
      hosting: "Vercel",
      aiProviders: ["OpenAI", "Anthropic", "Google"],
      paymentProcessors: [],
    },
    features: input.features,
    legal: {
      minimumAge: 13,
      governingLaw: "United States",
      refundPolicy: "no-refunds",
    },
    policies: {
      privacy: { title: "Privacy Policy" },
      terms: { title: "Terms of Service" },
    },
    authentication: input.auth,
    models: { gateway: input.gateway, ...modelDefaults },
    anonymous: {
      credits: 10,
      availableTools: [],
      rateLimit: {
        requestsPerMinute: 5,
        requestsPerMonth: 10,
      },
    },
    attachments: {
      maxBytes: 1048576,
      maxDimension: 2048,
      acceptedTypes: {
        "image/png": [".png"],
        "image/jpeg": [".jpg", ".jpeg"],
        "application/pdf": [".pdf"],
      },
    },
    deepResearch: {
      allowClarification: true,
      maxResearcherIterations: 1,
      maxConcurrentResearchUnits: 2,
      maxSearchQueries: 2,
    },
  };

  return `import type { ConfigInput } from "@/lib/config-schema";

/**
 * ChatJS Configuration
 *
 * Edit this file to customize your app.
 * @see https://chatjs.dev/docs/reference/config
 */
const config: ConfigInput = {
${generateConfig(fullConfig, 1, "", descriptions)}
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

