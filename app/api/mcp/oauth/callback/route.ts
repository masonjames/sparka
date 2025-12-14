import { type NextRequest, NextResponse } from "next/server";
import {
  createMcpClientForCallback,
  removeMcpClient,
} from "@/lib/ai/mcp/mcp-client";
import { getMcpConnectorById, getSessionByState } from "@/lib/db/mcp-queries";
import { createModuleLogger } from "@/lib/logger";
import type { McpConnectorsDialog } from "@/lib/nuqs/mcp-search-params";
import {
  loadMcpOAuthCallbackSearchParams,
  serializeMcpConnectorsSettingsSearchParams,
} from "@/lib/nuqs/mcp-search-params.server";

const log = createModuleLogger("mcp-oauth-callback");

export async function GET(request: NextRequest) {
  const {
    code,
    state,
    error,
    error_description: errorDesc,
  } = await loadMcpOAuthCallbackSearchParams(request);

  const redirectToSettings = ({
    connectorId,
    dialog,
    connected,
    errorMessage,
  }: {
    connectorId?: string;
    dialog?: McpConnectorsDialog;
    connected?: boolean;
    errorMessage?: string;
  }) => {
    const url = new URL("/settings/connectors", request.nextUrl.origin);
    url.search = serializeMcpConnectorsSettingsSearchParams({
      dialog: dialog ?? null,
      connectorId: connectorId ?? null,
      connected: connected ? true : null,
      error: errorMessage ?? null,
    });
    return NextResponse.redirect(url);
  };

  log.info(
    { hasCode: !!code, hasState: !!state, error },
    "OAuth callback received"
  );

  if (error) {
    log.error({ error, errorDesc }, "OAuth error from provider");
    const message = `${error}: ${errorDesc ?? "Unknown error"}`;
    return redirectToSettings({ dialog: "details", errorMessage: message });
  }

  if (!(code && state)) {
    log.error({ code: !!code, state: !!state }, "Missing code or state");
    return redirectToSettings({
      errorMessage: "Missing authorization code or state parameter",
    });
  }

  // Look up the session by state
  const session = await getSessionByState({ state });

  if (!session) {
    log.error({ state }, "Session not found for state");
    return redirectToSettings({
      errorMessage: "Invalid or expired session. Please try again.",
    });
  }

  // Get the connector to get its configuration
  const connector = await getMcpConnectorById({ id: session.mcpConnectorId });
  if (!connector) {
    log.error({ connectorId: session.mcpConnectorId }, "Connector not found");
    return redirectToSettings({ errorMessage: "MCP connector not found" });
  }

  try {
    // Create a fresh MCP client for callback handling
    // Don't use cached client - it might have stale/different state
    const mcpClient = createMcpClientForCallback({
      id: connector.id,
      name: connector.name,
      url: connector.url,
      type: connector.type,
    });

    // Complete the OAuth flow (don't connect first - just exchange the code)
    await mcpClient.finishAuth(code, state);

    log.info(
      { connectorId: connector.id },
      "OAuth flow completed successfully"
    );

    // Important: clear any cached MCP client that might be stuck in `authorizing`
    // from a pre-auth discovery attempt. Tokens are saved by finishAuth, but
    // cached clients may still keep an authorization URL in memory.
    await removeMcpClient(connector.id);

    return redirectToSettings({
      dialog: "details",
      connectorId: connector.id,
      connected: true,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Token exchange failed";
    log.error(
      {
        error: err,
        errorMessage,
        errorStack: err instanceof Error ? err.stack : undefined,
        connectorId: connector.id,
      },
      "OAuth token exchange failed"
    );

    return redirectToSettings({
      dialog: "details",
      connectorId: connector.id,
      errorMessage,
    });
  }
}
