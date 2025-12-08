const UNDERSCORE_COLLAPSE_REGEX = /_+/g;
const UNDERSCORE_TRIM_REGEX = /^_|_$/g;
const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]/g;

/** Maximum length for connector names */
export const MCP_NAME_MAX_LENGTH = 20;

/** Reserved namespace prefix for global connectors (userId = null) */
export const GLOBAL_NAMESPACE_PREFIX = "global";

export type GenerateMcpNameIdResult =
  | { ok: true; nameId: string }
  | { ok: false; error: "empty" | "reserved" };

/**
 * Generates a namespace (nameId) from a connector name.
 * Rules:
 * - Lowercase, replace non-alphanumeric with underscores
 * - Collapse consecutive underscores, trim leading/trailing
 * - Cannot equal "global" exactly (reserved for global connectors)
 * - Cannot result in empty string
 */
export function generateMcpNameId(name: string): GenerateMcpNameIdResult {
  const nameId = name
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_REGEX, "_")
    .replace(UNDERSCORE_COLLAPSE_REGEX, "_")
    .replace(UNDERSCORE_TRIM_REGEX, "");

  if (!nameId) {
    return { ok: false, error: "empty" };
  }

  if (nameId === GLOBAL_NAMESPACE_PREFIX) {
    return { ok: false, error: "reserved" };
  }

  return { ok: true, nameId };
}

/**
 * Creates a fully qualified tool ID from namespace and tool name.
 * Format: `{namespace}.{toolName}`
 * For global connectors: `global.{nameId}.{toolName}`
 */
export function createToolId(
  namespace: string,
  toolName: string,
  isGlobal: boolean
): string {
  if (isGlobal) {
    return `${GLOBAL_NAMESPACE_PREFIX}.${namespace}.${toolName}`;
  }
  return `${namespace}.${toolName}`;
}

/**
 * Parses a tool ID back into its components.
 * Splits on the first `.` to get namespace, rest is tool name.
 * For global tools, returns { isGlobal: true, namespace, toolName }
 */
export function parseToolId(toolId: string): {
  isGlobal: boolean;
  namespace: string;
  toolName: string;
} | null {
  const firstDot = toolId.indexOf(".");
  if (firstDot === -1) {
    return null; // No namespace, not an MCP tool
  }

  const firstPart = toolId.slice(0, firstDot);
  const rest = toolId.slice(firstDot + 1);

  if (firstPart === GLOBAL_NAMESPACE_PREFIX) {
    // Global tool: global.{namespace}.{toolName}
    const secondDot = rest.indexOf(".");
    if (secondDot === -1) {
      return null; // Malformed
    }
    return {
      isGlobal: true,
      namespace: rest.slice(0, secondDot),
      toolName: rest.slice(secondDot + 1),
    };
  }

  // User tool: {namespace}.{toolName}
  return {
    isGlobal: false,
    namespace: firstPart,
    toolName: rest,
  };
}
