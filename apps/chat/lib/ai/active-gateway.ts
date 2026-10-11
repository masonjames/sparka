import { Gateway } from "./gateway";
import type { GatewayProvider } from "./gateways/registry";
import type { ReadonlyNativeSurface } from "@/lib/readonly-native-surface";
import { config } from "@/lib/config";
import { createModuleLogger } from "@/lib/logger";
import { gatewayEnv } from "@/lib/env";
import { getFallbackModels } from "./gateways/fallback-models";

let activeGateway: GatewayProvider | null = null;

export const getActiveGateway = (): GatewayProvider => {
  activeGateway ??= new Gateway({
    env: gatewayEnv,
    // oxlint-disable-next-line typescript/promise-function-async -- Forward the original native Request and RequestInit objects; readonly header tuples are not assignable to HeadersInit without conversion. Return the original fetch promise without async adoption.
    fetch: (
      input: string | ReadonlyNativeSurface<URL | Request>,

      init
    ): Promise<Response> =>
      fetch(input, { ...init, next: { revalidate: 3600 } }),
    getFallbackModels,
    logger: createModuleLogger(`ai/gateways/${config.ai.gateway}`),
  });
  return activeGateway;
};
