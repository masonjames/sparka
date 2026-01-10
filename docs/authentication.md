# Authentication

This document explains how authentication is implemented in the codebase using [Better Auth](https://www.better-auth.com/).

## Overview

The application uses Better Auth for authentication with the following features:

- **Social OAuth Providers**: Google, GitHub, and Vercel
- **Database**: PostgreSQL with Drizzle ORM adapter
- **Session Management**: Cookie-based sessions with optional caching
- **Next.js Integration**: Full support for App Router, RSC, and Server Actions

## Architecture

```
lib/
├── auth.ts              # Server-side auth configuration
├── auth-client.ts       # Client-side auth configuration
├── db/
│   └── schema.ts        # Database schema (includes auth tables)
│
providers/
├── session-provider.tsx # React context for session state
│
app/
├── api/auth/[...all]/
│   └── route.ts         # Auth API route handler
├── (auth)/
│   ├── login/           # Login page
│   └── register/        # Registration page
│
proxy.ts                 # Middleware for route protection
```

## Configuration Files

### Server Configuration (`lib/auth.ts`)

The main auth configuration exports:

- `auth`: The Better Auth instance with all configuration
- `Session`: TypeScript type inferred from the auth instance

Key configuration options:

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  trustedOrigins: [...],
  secret: env.AUTH_SECRET,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  socialProviders: { google, github, vercel },
  plugins: [nextCookies()],
});
```

### Client Configuration (`lib/auth-client.ts`)

The client uses Better Auth's React integration:

```typescript
import { createAuthClient } from "better-auth/react";
import { nextCookies } from "better-auth/next-js";

const authClient = createAuthClient({
  plugins: [nextCookies()],
});
```

The `nextCookies()` plugin is required on both server and client for proper cookie handling in Next.js Server Actions.

## Session Handling

### Server-Side (RSC, API Routes, Server Actions)

Use `auth.api.getSession()` with the request headers:

```typescript
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const session = await auth.api.getSession({
  headers: await headers()
});

if (session?.user) {
  // User is authenticated
  const userId = session.user.id;
}
```

### Client-Side (React Components)

Use the `useSession` hook from the session provider:

```typescript
import { useSession } from "@/providers/session-provider";

function MyComponent() {
  const { data: session, isPending } = useSession();

  if (isPending) return <Loading />;
  if (!session?.user) return <LoginPrompt />;

  return <div>Welcome, {session.user.name}</div>;
}
```

### Session Provider

The `SessionProvider` accepts an `initialSession` prop for SSR hydration:

```typescript
// In a server component (layout.tsx)
const session = await auth.api.getSession({ headers: await headers() });

return (
  <SessionProvider initialSession={session}>
    {children}
  </SessionProvider>
);
```

## Route Protection

### Middleware (`proxy.ts`)

The proxy middleware protects routes using full database session validation:

```typescript
export async function proxy(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const isLoggedIn = !!session?.user;

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isPublicPage(pathname)) {
    return NextResponse.redirect(new URL("/login", url));
  }

  // Redirect authenticated users away from auth pages
  if (isLoggedIn && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL("/", url));
  }
}
```

Public routes that don't require authentication:
- `/` (home)
- `/models`, `/compare`
- `/share/*`
- `/privacy`, `/terms`
- `/api/auth/*`, `/api/trpc/*`, `/api/chat/*`

### tRPC Protection

For tRPC procedures, use `protectedProcedure`:

```typescript
// trpc/init.ts
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { user: ctx.user } });
});

// Usage in a router
export const myRouter = createTRPCRouter({
  secretData: protectedProcedure.query(({ ctx }) => {
    // ctx.user is guaranteed to exist
    return getDataForUser(ctx.user.id);
  }),
});
```

## Authentication Flow

### Sign In

```typescript
import authClient from "@/lib/auth-client";

// Social sign-in
await authClient.signIn.social({
  provider: "google" // or "github", "vercel"
});
```

### Sign Out

```typescript
import authClient from "@/lib/auth-client";

await authClient.signOut();
window.location.href = "/"; // Redirect after sign out
```

## Database Schema

Better Auth uses these tables (defined in `lib/db/schema.ts`):

| Table | Purpose |
|-------|---------|
| `user` | User accounts (id, name, email, image, etc.) |
| `session` | Active sessions (token, userId, expiresAt, etc.) |
| `account` | OAuth provider links (providerId, accessToken, etc.) |
| `verification` | Email/phone verification tokens |

## Environment Variables

Required variables for authentication:

```env
# Required
AUTH_SECRET=         # Generate with: openssl rand -base64 32
DATABASE_URL=        # PostgreSQL connection string

# OAuth Providers (at least one required)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

VERCEL_APP_CLIENT_ID=
VERCEL_APP_CLIENT_SECRET=
```

## Session Type

The `Session` type is inferred from the auth instance:

```typescript
// lib/auth.ts
export type Session = typeof auth.$Infer.Session;

// Structure:
// {
//   session: { id, expiresAt, token, userId, ... },
//   user: { id, name, email, image, ... }
// }
```

For tools that only need user identification, use the minimal `ToolSession` type:

```typescript
// lib/ai/tools/types.ts
import type { Session } from "@/lib/auth";

type SessionUser = NonNullable<Session["user"]>;

export type ToolSession = {
  user?: Pick<SessionUser, "id">;
};
```

## Performance Optimization

### Cookie Caching

Session cookie caching reduces database queries:

```typescript
session: {
  cookieCache: {
    enabled: true,
    maxAge: 60 * 5, // Cache for 5 minutes
  },
}
```

**Trade-off**: Revoked sessions may persist for up to `maxAge` seconds on other devices.

## Security Considerations

1. **Full Session Validation**: The middleware uses `auth.api.getSession()` for database validation, not just cookie presence checks.

2. **Trusted Origins**: Only configured origins can make authenticated requests.

3. **HTTPS**: Production deployments should always use HTTPS (enforced by Better Auth).

4. **Secret Key**: The `AUTH_SECRET` should be a strong, random value and kept secure.

## Adding New OAuth Providers

1. Add environment variables to `lib/env.ts`
2. Configure the provider in `lib/auth.ts` socialProviders
3. Add the provider toggle in `lib/config.ts`
4. Update `components/social-auth-providers.tsx` to show the button

## References

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Better Auth Next.js Integration](https://www.better-auth.com/docs/integrations/next)
- [Better Auth Session Management](https://www.better-auth.com/docs/concepts/session-management)
