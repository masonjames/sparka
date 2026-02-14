import type { PackageManager } from "../types";

export function inferPackageManager(): PackageManager {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm/")) return "pnpm";
  if (ua.startsWith("yarn/")) return "yarn";
  if (ua.startsWith("npm/")) return "npm";
  if (ua.startsWith("bun/")) return "bun";
  return "bun";
}
