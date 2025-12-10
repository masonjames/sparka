import { randomUUID } from "node:crypto";
import type {
  OAuthClientMetadata,
  OAuthClientProvider,
  OAuthTokens,
} from "@ai-sdk/mcp";
import {
  createOAuthSession,
  deleteSessionByState,
  getAuthenticatedSession,
  getSessionByState,
  type OAuthClientInformationFull,
  saveTokensAndCleanup,
  updateSessionByState,
} from "@/lib/db/queries";
import type { McpOAuthSession } from "@/lib/db/schema";

/**
 * Custom error thrown when OAuth authorization is required.
 * The client should catch this and redirect the user to the authorization URL.
 */
export class OAuthAuthorizationRequiredError extends Error {
  constructor(public authorizationUrl: URL) {
    super("OAuth user authorization required");
    this.name = "OAuthAuthorizationRequiredError";
  }
}

/**
 * PostgreSQL-backed OAuth client provider for MCP.
 * Implements the OAuthClientProvider interface from the AI SDK.
 * Persists OAuth state, PKCE verifier, client info, and tokens to the database.
 */
export class McpOAuthClientProvider implements OAuthClientProvider {
  private currentOAuthState = "";
  private cachedAuthData: McpOAuthSession | undefined;
  private initialized = false;

  constructor(
    private config: {
      mcpConnectorId: string;
      serverUrl: string;
      clientMetadata: OAuthClientMetadata;
      onRedirectToAuthorization: (authUrl: URL) => Promise<void>;
      state?: string; // Optional: adopt existing state (for callback reconciliation)
    }
  ) {}

  private async initializeOAuth() {
    if (this.initialized) {
      return;
    }

    // If state was provided (e.g., from callback), adopt it
    if (this.config.state) {
      const session = await getSessionByState({ state: this.config.state });
      if (session && session.mcpConnectorId === this.config.mcpConnectorId) {
        this.currentOAuthState = session.state ?? "";
        this.cachedAuthData = session;
        this.initialized = true;
        return;
      }
    }

    // Check for existing authenticated session
    const authenticated = await getAuthenticatedSession({
      mcpConnectorId: this.config.mcpConnectorId,
    });
    if (authenticated) {
      this.currentOAuthState = authenticated.state ?? "";
      this.cachedAuthData = authenticated;
      this.initialized = true;
      return;
    }

    // Create new in-progress session
    this.currentOAuthState = randomUUID();
    this.cachedAuthData = await createOAuthSession({
      mcpConnectorId: this.config.mcpConnectorId,
      serverUrl: this.config.serverUrl,
      state: this.currentOAuthState,
    });
    this.initialized = true;
  }

  private async getAuthData() {
    await this.initializeOAuth();
    return this.cachedAuthData;
  }

  private async updateAuthData(data: {
    codeVerifier?: string;
    clientInfo?: OAuthClientInformationFull;
    tokens?: OAuthTokens;
  }) {
    if (!this.currentOAuthState) {
      throw new Error("OAuth not initialized");
    }
    this.cachedAuthData = await updateSessionByState({
      state: this.currentOAuthState,
      updates: data,
    });
    return this.cachedAuthData;
  }

  get redirectUrl(): string {
    return this.config.clientMetadata.redirect_uris[0];
  }

  get clientMetadata(): OAuthClientMetadata {
    return this.config.clientMetadata;
  }

  state(): string {
    return this.currentOAuthState;
  }

  async clientInformation(): Promise<OAuthClientInformationFull | undefined> {
    const authData = await this.getAuthData();
    if (authData?.clientInfo) {
      const clientInfo = authData.clientInfo as OAuthClientInformationFull;
      // Security: if redirect URI changed and no tokens yet, invalidate
      if (
        !authData.tokens &&
        clientInfo.redirect_uris[0] !== this.redirectUrl
      ) {
        if (authData.state) {
          await deleteSessionByState({ state: authData.state });
        }
        this.cachedAuthData = undefined;
        this.initialized = false;
        return;
      }
      return clientInfo;
    }
    return;
  }

  async saveClientInformation(
    clientCredentials: OAuthClientInformationFull
  ): Promise<void> {
    await this.updateAuthData({ clientInfo: clientCredentials });
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const authData = await this.getAuthData();
    return authData?.tokens as OAuthTokens | undefined;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    this.cachedAuthData = await saveTokensAndCleanup({
      state: this.currentOAuthState,
      mcpConnectorId: this.config.mcpConnectorId,
      tokens,
    });
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    authorizationUrl.searchParams.set("state", this.state());
    await this.config.onRedirectToAuthorization(authorizationUrl);
  }

  async saveCodeVerifier(pkceVerifier: string): Promise<void> {
    await this.updateAuthData({ codeVerifier: pkceVerifier });
  }

  async codeVerifier(): Promise<string> {
    const authData = await this.getAuthData();
    if (!authData?.codeVerifier) {
      throw new Error("OAuth code verifier not found");
    }
    return authData.codeVerifier;
  }

  /**
   * Adopt state from another instance (multi-instance support).
   * Used when the callback needs to reconcile with an existing session.
   */
  async adoptState(state: string): Promise<void> {
    if (!state) {
      return;
    }
    const session = await getSessionByState({ state });
    if (!session || session.mcpConnectorId !== this.config.mcpConnectorId) {
      return;
    }
    this.currentOAuthState = state;
    this.cachedAuthData = session;
    this.initialized = true;
  }

  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier"
  ): Promise<void> {
    if (scope === "all") {
      await deleteSessionByState({ state: this.currentOAuthState });
      this.cachedAuthData = undefined;
      this.initialized = false;
      this.currentOAuthState = "";
    } else if (scope === "tokens") {
      await this.updateAuthData({ tokens: undefined });
    }
  }
}
