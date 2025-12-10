import type { NextRequest } from "next/server";
import { getOrCreateMcpClient } from "@/lib/ai/mcp/mcp-client";
import { getMcpConnectorById, getSessionByState } from "@/lib/db/queries";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("mcp-oauth-callback");

function createOAuthResponsePage({
  type,
  title,
  heading,
  message,
  postMessageType,
  postMessageData,
}: {
  type: "success" | "error";
  title: string;
  heading: string;
  message: string;
  postMessageType: string;
  postMessageData: Record<string, string>;
}): Response {
  const color = type === "success" ? "#22c55e" : "#ef4444";
  const dataEntries = Object.entries(postMessageData)
    .map(([k, v]) => `${k}: '${v.replace(/'/g, "\\'")}'`)
    .join(", ");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 2rem; background: #0a0a0a; color: #fafafa;">
  <script>
    try {
      window.opener?.postMessage({
        type: '${postMessageType}',
        ${dataEntries}
      }, window.location.origin);
    } catch (e) { console.error('postMessage error:', e); }
    setTimeout(() => window.close(), 1500);
  </script>
  <div style="max-width: 400px; margin: 0 auto; padding: 2rem; border-radius: 12px; background: #171717;">
    <div style="color: ${color}; margin-bottom: 1rem;">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${
          type === "success"
            ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
            : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
        }
      </svg>
    </div>
    <h2 style="margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 600;">${heading}</h2>
    <p style="margin: 0 0 1rem; color: #a1a1aa; font-size: 0.875rem;">${message}</p>
    <p style="margin: 0; color: #71717a; font-size: 0.75rem;">This window will close automatically.</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  log.info(
    { hasCode: !!code, hasState: !!state, error },
    "OAuth callback received"
  );

  if (error) {
    log.error({ error, errorDesc }, "OAuth error from provider");
    return createOAuthResponsePage({
      type: "error",
      title: "OAuth Error",
      heading: "Authentication Failed",
      message: `${error}: ${errorDesc ?? "Unknown error"}`,
      postMessageType: "MCP_OAUTH_ERROR",
      postMessageData: { error, error_description: errorDesc ?? "" },
    });
  }

  if (!(code && state)) {
    log.error({ code: !!code, state: !!state }, "Missing code or state");
    return createOAuthResponsePage({
      type: "error",
      title: "OAuth Error",
      heading: "Authentication Failed",
      message: "Missing authorization code or state parameter",
      postMessageType: "MCP_OAUTH_ERROR",
      postMessageData: {
        error: "invalid_request",
        error_description: "Missing parameters",
      },
    });
  }

  // Look up the session by state
  const session = await getSessionByState({ state });
  if (!session) {
    log.error({ state }, "Session not found for state");
    return createOAuthResponsePage({
      type: "error",
      title: "OAuth Error",
      heading: "Authentication Failed",
      message: "Invalid or expired session. Please try again.",
      postMessageType: "MCP_OAUTH_ERROR",
      postMessageData: {
        error: "invalid_state",
        error_description: "Session not found",
      },
    });
  }

  // Get the connector to get its configuration
  const connector = await getMcpConnectorById({ id: session.mcpConnectorId });
  if (!connector) {
    log.error({ connectorId: session.mcpConnectorId }, "Connector not found");
    return createOAuthResponsePage({
      type: "error",
      title: "OAuth Error",
      heading: "Authentication Failed",
      message: "MCP connector not found",
      postMessageType: "MCP_OAUTH_ERROR",
      postMessageData: {
        error: "not_found",
        error_description: "Connector not found",
      },
    });
  }

  try {
    // Get or create the MCP client
    const mcpClient = await getOrCreateMcpClient({
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

    return createOAuthResponsePage({
      type: "success",
      title: "OAuth Success",
      heading: "Authentication Successful!",
      message: "You can now use this MCP connector.",
      postMessageType: "MCP_OAUTH_SUCCESS",
      postMessageData: { success: "true", connectorId: connector.id },
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

    return createOAuthResponsePage({
      type: "error",
      title: "OAuth Error",
      heading: "Authentication Failed",
      message: errorMessage,
      postMessageType: "MCP_OAUTH_ERROR",
      postMessageData: {
        error: "auth_failed",
        error_description: errorMessage,
      },
    });
  }
}
