import { writeFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { siteConfigSchema } from "../lib/config.schema";

// Get defaults by parsing empty object
const defaults = siteConfigSchema.parse({});

// Extract descriptions by walking the zod schema
function extractDescriptions(
  schema: z.ZodType,
  prefix = "",
  result: Map<string, string> = new Map()
): Map<string, string> {
  // Unwrap wrappers (default, optional, etc.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unwrapped: any = schema;
  while (unwrapped instanceof z.ZodDefault || unwrapped instanceof z.ZodOptional) {
    unwrapped = unwrapped._zod.def.innerType;
  }

  // Get description (zod v4 uses getter property)
  if (unwrapped.description && prefix) {
    result.set(prefix, unwrapped.description);
  }

  // Recurse into object properties
  if (unwrapped instanceof z.ZodObject) {
    const shape = unwrapped._zod.def.shape;
    for (const [key, propSchema] of Object.entries(shape)) {
      const path = prefix ? `${prefix}.${key}` : key;
      extractDescriptions(propSchema as z.ZodType, path, result);
    }
  }

  return result;
}

const descriptions = extractDescriptions(siteConfigSchema);

// Check if a key needs quoting
const needsQuotes = (key: string) => !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
const formatKey = (key: string) => (needsQuotes(key) ? JSON.stringify(key) : key);

// Format a value as TypeScript literal
function formatValue(value: unknown, indent: number): string {
  const spaces = "  ".repeat(indent);
  const inner = "  ".repeat(indent + 1);

  if (value === null || value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((v) => typeof v === "string")) {
      return `[${value.map((v) => JSON.stringify(v)).join(", ")}]`;
    }
    return `[\n${value.map((v) => `${inner}${formatValue(v, indent + 1)}`).join(",\n")}\n${spaces}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    return `{\n${entries.map(([k, v]) => `${inner}${formatKey(k)}: ${formatValue(v, indent + 1)}`).join(",\n")},\n${spaces}}`;
  }

  return String(value);
}

// Generate config object with description comments
function generateConfig(
  obj: Record<string, unknown>,
  indent: number,
  pathPrefix: string
): string {
  const spaces = "  ".repeat(indent);

  return Object.entries(obj)
    .map(([key, value]) => {
      const path = pathPrefix ? `${pathPrefix}.${key}` : key;
      const desc = descriptions.get(path);
      const comment = desc ? ` // ${desc}` : "";

      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const nested = generateConfig(value as Record<string, unknown>, indent + 1, path);
        return `${spaces}${formatKey(key)}: {\n${nested}\n${spaces}},`;
      }

      return `${spaces}${formatKey(key)}: ${formatValue(value, indent)},${comment}`;
    })
    .join("\n");
}

const template = `import type { SiteConfigInput } from "./config.schema";

/**
 * Site configuration - edit values below to customize your app.
 * Generated from lib/config.schema.ts - run \`bun chatjs:init\` to regenerate.
 *
 * @see https://chatjs.dev/docs/reference/config
 */
const config: SiteConfigInput = {
${generateConfig(defaults, 1, "")}
};

export default config;
`;

writeFileSync(join(process.cwd(), "lib", "config.ts"), template);
console.log("✓ Config reset to defaults (lib/config.ts)");
