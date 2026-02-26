import { createEnv } from "@t3-oss/env-nextjs";
import { serverEnvSchema } from "./env-schema";

// Clean Dokploy/Docker Swarm env var artifacts before validation.
// Dokploy appends trailing whitespace and "+" continuation markers to env values.
for (const [key, value] of Object.entries(process.env)) {
  if (typeof value === "string" && value !== value.replace(/[\s+]+$/, "")) {
    process.env[key] = value.replace(/[\s+]+$/, "");
  }
}

export const env = createEnv({
  server: serverEnvSchema,
  client: {},
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: {},
});
