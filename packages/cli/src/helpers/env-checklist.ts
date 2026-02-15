import {
  authEnvRequirements,
  type EnvRequirement,
  featureEnvRequirements,
  gatewayEnvRequirements,
} from "../../../../apps/chat/lib/config-requirements";
import { serverEnvSchema } from "../../../../apps/chat/lib/env-schema";
import {
  FEATURE_KEYS,
  type AuthProvider,
  type FeatureKey,
  type Gateway,
} from "../types";

export type EnvVarEntry = {
  /** The env var name(s), e.g. "AI_GATEWAY_API_KEY" or "AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET" */
  vars: string;
  /** Human-readable description derived from the Zod schema */
  description: string;
};

export type EnvChecklistGroup = {
  category: string;
  items: EnvVarEntry[];
};

/**
 * Extract descriptions from the server env Zod schema.
 * Mirrors the approach used by config-builder.ts `extractDescriptions`.
 */
function extractEnvDescriptions(): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, schema] of Object.entries(serverEnvSchema)) {
    const desc = (schema as { description?: string }).description;
    if (desc) {
      result.set(key, desc);
    }
  }
  return result;
}

const envDescriptions = extractEnvDescriptions();

/**
 * Expand an EnvRequirement into one or more EnvVarEntries, pulling
 * descriptions from the Zod schema.
 */
function requirementToEntries(requirement: EnvRequirement): EnvVarEntry[] {
  return requirement.options.map((group) => ({
    vars: group.map(String).join(" + "),
    description: group
      .map((v) => {
        const varName = String(v);
        return envDescriptions.get(varName) ?? varName;
      })
      .join(", "),
  }));
}

export function collectEnvChecklist(input: {
  gateway: Gateway;
  features: Record<FeatureKey, boolean>;
  auth: Record<AuthProvider, boolean>;
}): EnvChecklistGroup[] {
  const groups: EnvChecklistGroup[] = [];

  // --- Core (always required) ---
  groups.push({
    category: "Core (always required)",
    items: [
      {
        vars: "AUTH_SECRET",
        description: envDescriptions.get("AUTH_SECRET") ?? "AUTH_SECRET",
      },
      {
        vars: "DATABASE_URL",
        description: envDescriptions.get("DATABASE_URL") ?? "DATABASE_URL",
      },
    ],
  });

  // --- AI Gateway ---
  const gwReq = gatewayEnvRequirements[input.gateway];
  const gwEntries = requirementToEntries(gwReq);

  groups.push({
    category: `AI Gateway (${input.gateway})`,
    items: gwEntries,
  });

  // --- Features ---
  const featureItems: EnvVarEntry[] = [];
  const seen = new Set<string>();

  for (const feature of FEATURE_KEYS) {
    if (!input.features[feature]) continue;
    const requirement =
      featureEnvRequirements[feature as keyof typeof featureEnvRequirements];
    if (!requirement) continue;

    // Deduplicate — e.g. webSearch and deepResearch both need TAVILY_API_KEY
    if (seen.has(requirement.description)) continue;
    seen.add(requirement.description);

    featureItems.push(...requirementToEntries(requirement));
  }

  if (featureItems.length > 0) {
    groups.push({ category: "Features", items: featureItems });
  }

  // --- Authentication ---
  const authItems: EnvVarEntry[] = [];

  for (const provider of Object.keys(authEnvRequirements) as AuthProvider[]) {
    if (!input.auth[provider]) continue;
    authItems.push(...requirementToEntries(authEnvRequirements[provider]));
  }

  if (authItems.length > 0) {
    groups.push({ category: "Authentication", items: authItems });
  }

  return groups;
}
