import { createLoader, createSerializer } from "nuqs/server";
import {
  mcpConnectorsSettingsSearchParams,
  mcpOAuthCallbackSearchParams,
} from "./mcp-search-params";

export const serializeMcpConnectorsSettingsSearchParams = createSerializer(
  mcpConnectorsSettingsSearchParams
);

export const loadMcpOAuthCallbackSearchParams = createLoader(
  mcpOAuthCallbackSearchParams
);
