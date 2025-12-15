import { parseAsBoolean, parseAsString } from "nuqs";

export const mcpConnectorsDialogValues = [
  "config",
  "details",
  "connect",
] as const;

export type McpConnectorsDialog = (typeof mcpConnectorsDialogValues)[number];

/**
 * Query params for the /settings/connectors page.
 * Shared between the UI (nuqs hooks) and server redirects.
 */
export const mcpConnectorsSettingsSearchParams = {
  dialog: parseAsString,
  // TODO: Re-enable after nuqs fix non importable from server code.
  // dialog: parseAsStringLiteral(mcpConnectorsDialogValues),
  connectorId: parseAsString,
  connected: parseAsBoolean,
  error: parseAsString,
};

/**
 * Query params received by the OAuth provider callback route.
 */
export const mcpOAuthCallbackSearchParams = {
  code: parseAsString,
  state: parseAsString,
  error: parseAsString,
  error_description: parseAsString,
};
