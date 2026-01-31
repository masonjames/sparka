import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";
import { siteConfig } from "@/lib/site-config";

export function register() {
  registerOTel({
    serviceName: siteConfig.appPrefix,
    traceExporter: new LangfuseExporter(),
  });
}
