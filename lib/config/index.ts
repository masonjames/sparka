import userConfig from "@/chat.config";
import { configSchema } from "./schema";

/**
 * Parsed configuration with defaults applied.
 * Import this for runtime access to config values.
 *
 * @example
 * import { config } from "@/lib/config/index";
 * console.log(config.appName);
 */
export const config = configSchema.parse(userConfig);

// Re-export types for convenience
export type {
  AnonymousConfig,
  AttachmentsConfig,
  AuthenticationConfig,
  Config,
  ConfigInput,
  IntegrationsConfig,
  ModelsConfig,
  PricingConfig,
} from "./schema";
