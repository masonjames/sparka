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
  vars: string;
  description: string;
  isAlternative: boolean;
};

/**
 * Extract descriptions from the server env Zod schema.
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
 * Expand an EnvRequirement into one or more EnvVarEntries,
 * marking the second+ option as an alternative.
 */
function requirementToEntries(requirement: EnvRequirement): EnvVarEntry[] {
  return requirement.options.map((group, i) => ({
    vars: group.map(String).join(" + "),
    description: envDescriptions.get(String(group[0])) ?? String(group[0]),
    isAlternative: i > 0,
  }));
}

export function collectEnvChecklist(input: {
  gateway: Gateway;
  features: Record<FeatureKey, boolean>;
  auth: Record<AuthProvider, boolean>;
}): EnvVarEntry[] {
  const entries: EnvVarEntry[] = [];

  // Core (always required)
  entries.push({
    vars: "AUTH_SECRET",
    description: envDescriptions.get("AUTH_SECRET") ?? "AUTH_SECRET",
    isAlternative: false,
  });
  entries.push({
    vars: "DATABASE_URL",
    description: envDescriptions.get("DATABASE_URL") ?? "DATABASE_URL",
    isAlternative: false,
  });

  // AI Gateway
  const gwReq = gatewayEnvRequirements[input.gateway];
  entries.push(...requirementToEntries(gwReq));

  // Features
  const seen = new Set<string>();

  for (const feature of FEATURE_KEYS) {
    if (!input.features[feature]) continue;
    const requirement =
      featureEnvRequirements[feature as keyof typeof featureEnvRequirements];
    if (!requirement) continue;

    if (seen.has(requirement.description)) continue;
    seen.add(requirement.description);

    entries.push(...requirementToEntries(requirement));
  }

  // Authentication
  for (const provider of Object.keys(authEnvRequirements) as AuthProvider[]) {
    if (!input.auth[provider]) continue;
    entries.push(...requirementToEntries(authEnvRequirements[provider]));
  }

  return entries;
}
