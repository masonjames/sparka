import { config } from "@/lib/config";
import {
  type GatewayProvider,
  type GatewayType,
  gatewayRegistry,
} from "./gateways/registry";

let activeGateway: GatewayProvider | null = null;

export function getActiveGateway(): GatewayProvider {
  if (activeGateway) {
    return activeGateway;
  }

  const gatewayType: GatewayType = config.models.gateway ?? "vercel";

  const factory = gatewayRegistry[gatewayType];
  if (!factory) {
    throw new Error(
      `Unknown gateway type: ${gatewayType}. Supported: ${Object.keys(gatewayRegistry).join(", ")}`
    );
  }

  activeGateway = factory();
  return activeGateway;
}
