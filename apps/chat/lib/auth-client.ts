import { createAuthClient } from "better-auth/react";

// Better Auth auto-detects the base URL from window.location.origin on client
// and uses relative URLs for SSR, so we don't need to specify baseURL
// Note: nextCookies() is server-only (imports node:async_hooks) and is
// already registered in lib/auth.ts — do NOT import it here.
const authClient = createAuthClient({});

export default authClient;
