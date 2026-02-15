import {
  authEnvRequirements,
  featureEnvRequirements,
  gatewayEnvRequirements,
} from "../../../../apps/chat/lib/config-requirements";
import { FEATURE_KEYS, type AuthProvider, type FeatureKey, type Gateway } from "../types";

export function collectEnvChecklist(input: {
  gateway: Gateway;
  features: Record<FeatureKey, boolean>;
  auth: Record<AuthProvider, boolean>;
}): string[] {
  const requirements = new Set<string>();
  requirements.add(gatewayEnvRequirements[input.gateway].description);

  for (const feature of FEATURE_KEYS) {
    if (!input.features[feature]) continue;
    const requirement =
      featureEnvRequirements[feature as keyof typeof featureEnvRequirements];
    if (requirement) {
      requirements.add(requirement.description);
    }
  }

  for (const provider of Object.keys(
    authEnvRequirements
  ) as AuthProvider[]) {
    if (!input.auth[provider]) continue;
    requirements.add(authEnvRequirements[provider].description);
  }

  return [...requirements].sort();
}
