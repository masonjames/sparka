import { siteConfig } from "@/lib/config";

const isProductionEnvironment = process.env.NODE_ENV === "production";

const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const BLOB_FILE_PREFIX = `${siteConfig.appPrefix}/files/`;

export const ANONYMOUS_SESSION_COOKIES_KEY = "anonymous-session";
