import {
  auth,
  experimental_createMCPClient as createMCPClient,
} from "@ai-sdk/mcp";
import type { Tool } from "ai";
import { env } from "@/lib/env";
import { createModuleLogger } from "@/lib/logger";
import {
  McpOAuthClientProvider,
  OAuthAuthorizationRequiredError,
} from "./mcp-oauth-provider";

const log = createModuleLogger("mcp-client");

type McpClientInstance = Awaited<ReturnType<typeof createMCPClient>>;

type McpClientStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "authorizing"
  | "incompatible";

export type { McpClientStatus };

function getBaseUrl(): string {
  if (env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * MCP Client wrapper with OAuth support.
 * Uses @ai-sdk/mcp's createMCPClient with authProvider for OAuth flow.
 */
export class MCPClient {
  private client?: McpClientInstance;
  private oauthProvider: McpOAuthClientProvider;
  private authorizationUrl?: URL;
  private _status: McpClientStatus = "disconnected";

  constructor(
    private id: string,
    private name: string,
    private serverConfig: {
      url: string;
      type: "http" | "sse";
      headers?: Record<string, string>;
    }
  ) {
    const baseUrl = getBaseUrl();

    this.oauthProvider = new McpOAuthClientProvider({
      mcpConnectorId: this.id,
      serverUrl: this.serverConfig.url,
      clientMetadata: {
        client_name: `sparka-ai-${this.name}`,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none", // PKCE
        scope: "mcp:tools",
        redirect_uris: [`${baseUrl}/api/mcp/oauth/callback`],
        software_id: "sparka-ai",
        software_version: "1.0.0",
      },
      onRedirectToAuthorization: async (authorizationUrl: URL) => {
        this.authorizationUrl = authorizationUrl;
        throw new OAuthAuthorizationRequiredError(authorizationUrl);
      },
    });
  }

  get status(): McpClientStatus {
    if (this.authorizationUrl) {
      return "authorizing";
    }
    if (this.client) {
      return "connected";
    }
    return this._status;
  }

  getAuthorizationUrl(): URL | undefined {
    return this.authorizationUrl;
  }

  async connect(oauthState?: string): Promise<McpClientInstance | undefined> {
    if (this.status === "connected" && this.client) {
      return this.client;
    }

    this._status = "connecting";

    // Adopt state if provided (for callback reconciliation)
    if (oauthState) {
      await this.oauthProvider.adoptState(oauthState);
    }

    try {
      // AI SDK handles 401 internally and calls auth() with the provider
      this.client = await createMCPClient({
        transport: {
          type: this.serverConfig.type,
          url: this.serverConfig.url,
          headers: this.serverConfig.headers,
          authProvider: this.oauthProvider,
        },
      });

      this._status = "connected";
      return this.client;
    } catch (error) {
      // If OAuth required error, status becomes "authorizing"
      if (error instanceof OAuthAuthorizationRequiredError) {
        this._status = "authorizing";
        log.info(
          { connectorId: this.id, authUrl: error.authorizationUrl.toString() },
          "OAuth authorization required"
        );
        return;
      }

      this._status = "disconnected";
      throw error;
    }
  }

  /**
   * Lightweight connection test - just checks if we can connect without full discovery.
   * Returns connection status without fetching tools/resources/prompts.
   */
  async attemptConnection(): Promise<{
    status: McpClientStatus;
    needsAuth: boolean;
    error?: string;
  }> {
    // If already connected, return current status
    if (this.status === "connected" && this.client) {
      return { status: "connected", needsAuth: false };
    }

    // If already in authorizing state, return that
    if (this.authorizationUrl) {
      return { status: "authorizing", needsAuth: true };
    }

    try {
      await this.connect();
      // Check if OAuth is required (authorizationUrl gets set during connect)
      if (this.authorizationUrl) {
        return { status: "authorizing", needsAuth: true };
      }
      return {
        status: this.client ? "connected" : "disconnected",
        needsAuth: false,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(
        {
          connectorId: this.id,
          errorMessage,
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        "attemptConnection failed"
      );

      // Detect incompatible server errors
      if (
        errorMessage.includes("does not support dynamic client registration")
      ) {
        this._status = "incompatible";
        return {
          status: "incompatible",
          needsAuth: false,
          error:
            "Server requires pre-configured OAuth credentials (does not support dynamic client registration)",
        };
      }

      return { status: "disconnected", needsAuth: false, error: errorMessage };
    }
  }

  /**
   * Called after callback receives code to complete the OAuth flow.
   */
  async finishAuth(code: string, state: string): Promise<void> {
    // Always adopt the state from the callback to load the session with code verifier
    await this.oauthProvider.adoptState(state);

    // Use the auth function from @ai-sdk/mcp to complete the OAuth flow
    await auth(this.oauthProvider, {
      serverUrl: this.serverConfig.url,
      authorizationCode: code,
    });

    this.authorizationUrl = undefined;
    // Don't set to connected - tokens are saved, next connect() will use them
  }

  /**
   * Get tools from the MCP server, already in AI SDK format.
   */
  async tools(): Promise<Record<string, Tool>> {
    if (!this.client) {
      throw new Error("Client not connected");
    }
    return this.client.tools();
  }

  /**
   * List resources from the MCP server.
   */
  async listResources() {
    if (!this.client) {
      throw new Error("Client not connected");
    }
    return this.client.listResources();
  }

  /**
   * List prompts from the MCP server.
   */
  async listPrompts() {
    if (!this.client) {
      throw new Error("Client not connected");
    }
    return this.client.listPrompts();
  }

  /**
   * Close the connection to the MCP server.
   */
  async close(): Promise<void> {
    try {
      await this.client?.close();
    } catch (error) {
      log.error({ error, connectorId: this.id }, "Error closing MCP client");
    }
    this.client = undefined;
    this._status = "disconnected";
  }
}

// Map to store active MCP clients by connector ID
const clientsMap = new Map<string, MCPClient>();

/**
 * Get or create an MCP client for a connector.
 */
export async function getOrCreateMcpClient({
  id,
  name,
  url,
  type,
  headers,
}: {
  id: string;
  name: string;
  url: string;
  type: "http" | "sse";
  headers?: Record<string, string>;
}): Promise<MCPClient> {
  let client = clientsMap.get(id);

  if (!client) {
    client = new MCPClient(id, name, { url, type, headers });
    clientsMap.set(id, client);
  }

  return client;
}

/**
 * Remove an MCP client from the cache and close it.
 */
export async function removeMcpClient(id: string): Promise<void> {
  const client = clientsMap.get(id);
  if (client) {
    await client.close();
    clientsMap.delete(id);
  }
}

/**
 * Get an existing MCP client by ID.
 */
export function getMcpClient(id: string): MCPClient | undefined {
  return clientsMap.get(id);
}

/**
 * Create a fresh MCP client for OAuth callback handling.
 * Does NOT use the cache - creates a new instance to avoid state conflicts.
 */
export function createMcpClientForCallback({
  id,
  name,
  url,
  type,
  headers,
}: {
  id: string;
  name: string;
  url: string;
  type: "http" | "sse";
  headers?: Record<string, string>;
}): MCPClient {
  return new MCPClient(id, name, { url, type, headers });
}
