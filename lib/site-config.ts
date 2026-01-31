import config from "./config";
import { applyDefaults, type SiteConfig } from "./config.schema";

export const siteConfig: SiteConfig = applyDefaults(config);
