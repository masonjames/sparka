import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";
import { siteConfig } from "@/lib/config";
import { validateConfig } from "@/lib/config.server";

export function register() {
  validateConfig();

  registerOTel({
    serviceName: siteConfig.appPrefix,
    traceExporter: new LangfuseExporter(),
  });
}
