# Current deployment and source layout

Production is Hetzner/Dokploy at `chat.masonjames.com`. Use [docs/deployment.md](docs/deployment.md) for Dagger builds, upstream sync and production promotion. The legacy Vercel deployment instructions below are historical and do not authorize deploying this production app. Source paths below are relative to `apps/chat/` unless they name a root workspace file. Never pull production environment files for image builds or tests; Dagger supplies isolated fixtures.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chat by Mason James is a production-ready AI chat application built with Next.js 16, supporting 120+ AI models through Vercel AI Gateway. Features include multi-model chat, authentication, document generation, code execution, web search, and advanced chat capabilities like branching and resumable streams.

**Fork Information**:

- Upstream: `https://github.com/FranciscoMoretti/chat-js` (actively maintained)
- This fork adds: Custom branding, Stripe subscription system
- Sync regularly with upstream to get latest features

## Package Manager & Development

You have access to the github cli, vercel cli, and neon cli. Track work in GitHub issues and pull requests.

This project VERCEL_ID: `prj_KsD9kDHclSMwZgZ5CUmMaopTtm1r`

- **Package Manager**: Bun (v1.1.34+)
- **Development**: `bun dev` (uses Next.js Turbo mode)
- **Build**: `bun build`
- **Type Checking**: `bun test:types` (use this to verify changes, NOT `bun build`)
- **Linting**: `bun lint` or `bun lint:fix` (ESLint + Biome)
- **Formatting**: `bun format` (Biome)
- **Testing**: `bun test` (Playwright), `bun test:unit` (Vitest)

## Upstream Sync Workflow

This repository is a fork with custom modifications. Regular syncing with upstream ensures we get the latest features and fixes while preserving our Stripe/Ghost subscription integrations.

### Git Remote Configuration

```bash
# Verify remotes are configured
git remote -v

# Should show:
# origin: git@github.com:masonjames/sparka.git
# upstream: https://github.com/FranciscoMoretti/chat-js.git
```

### Syncing with Upstream (Merge Method)

**Recommended**: Direct merge preserves git history and is easier to manage than rebasing custom changes.

#### Step-by-Step Merge Process

1. **Fetch latest upstream changes**

```bash
git fetch upstream
```

2. **Create safety backup** (always!)

```bash
git branch backup-before-upstream-merge-$(date +%Y%m%d)
```

3. **Merge upstream into local main**

```bash
git checkout main
git merge upstream/main
```

4. **Resolve conflicts** (see Conflict Resolution Guide below)

   - Most conflicts will be in files we've customized
   - Follow the patterns in the guide to preserve custom features
   - When in doubt, prefer upstream's refactoring but preserve our features

5. **Post-merge fixes**

```bash
# Regenerate lockfile with our dependencies
bun install

# Fix any type errors
bun test:types

# Run linter
bun lint
```

6. **Test locally**

```bash
bun dev
# Test authentication, chat, and subscription flows
```

7. **Commit merge and fixes**

```bash
git add -A
git commit -m "merge: sync with upstream and fix conflicts"
```

8. **Build a candidate for isolated testing**

```bash
dagger call check
dagger call build export --path=artifacts/sparka.tar
# Follow docs/deployment.md for Dockhand review and promotion.
```

### Conflict Resolution Guide

Common conflicts and how to resolve them:

#### 1. **package.json**

- **Keep**: Stripe dependency, custom package name
- **Take upstream**: Version updates for other dependencies
- **Add**: React version overrides if not present

```json
{
  "dependencies": {
    "stripe": "^19.3.0", // Keep our addition
    "streamdown": "1.5.0" // Take upstream version
  },
  "overrides": {
    "react": "19.2.0", // Force matching versions
    "react-dom": "19.2.0" // Prevents hydration errors
  }
}
```

#### 2. **lib/env.ts**

- **Keep**: Custom environment validators (hostname, cookie domain, subdomain)
- **Keep**: Stripe/Ghost environment variables
- **Take upstream**: New optional features

```typescript
// Keep these custom validators
const optionalHostname = z.string()...
const optionalCookieDomain = z.string()...
const optionalSubdomain = z.string()...

// Keep Stripe/Ghost env vars
STRIPE_SECRET_KEY: z.string().optional(),
GHOST_ADMIN_URL: z.string().optional(),
// ... etc
```

#### 3. **trpc/routers/\_app.ts**

- **Merge both**: Include both upstream's new routers and our entitlements router

```typescript
export const appRouter = createTRPCRouter({
  // ... upstream routers
  project: projectRouter, // Upstream addition
  entitlements: entitlementsRouter, // Our custom router
});
```

#### 4. **Database Migrations**

- **Conflict**: Both branches created migration 0031
- **Resolution**: Renumber ours to next available (0032)

```bash
# Rename our migration file
mv lib/db/migrations/0031_our_migration.sql lib/db/migrations/0032_our_migration.sql

# Update _journal.json to include both migrations in order
```

#### 5. **Chat Routes** (`app/(chat)/api/chat/route.ts`)

- **Take upstream**: Session refactoring (cleaner architecture)
- **Note for later**: Re-implement entitlement checks after testing
- Upstream's `validateAndSetupSession()` provides better structure
- Can add entitlement checks as a follow-up enhancement

#### 6. **UI Components** (React 19 SSR Issues)

- **Button components**: Must handle `disabled` properly

```typescript
// In components/ui/button.tsx
const buttonProps = {
  ...(disabled && { disabled: true }), // Only add if truthy
  ...props,
};
```

- **Fix duplicate props**: Check that props aren't passed both explicitly and via spread

#### 7. **API Routes** (Next.js 15+ Dynamic Rendering)

- Add `export const dynamic = "force-dynamic"` to routes using `request.headers`

```typescript
// In app/api/cron/cleanup/route.ts
export const dynamic = "force-dynamic"; // Required for SSR
```

### Custom Modifications to Preserve

Track these customizations during merges:

#### Branding Changes (Auto-merge Usually Works)

- ✅ `lib/config.ts`: App name, GitHub URL, organization details
- ✅ `package.json`: Package name (`chat-by-mason-james`)
- ✅ `app/manifest.webmanifest`: PWA manifest details

#### Custom Features (Require Manual Attention)

**Stripe/Ghost Integration**:

- 📦 `package.json`: `stripe` dependency
- 🗄️ Database: `Entitlement`, `WebhookEvent` tables (migration 0032)
- 🔧 `lib/env.ts`: Stripe/Ghost environment variables + custom validators
- 🛣️ `trpc/routers/_app.ts`: `entitlementsRouter` registration
- 📂 `trpc/routers/entitlements.router.ts`: Full router implementation
- 📂 `lib/entitlements/`: Provisioning logic, Ghost sync
- 📂 `app/api/stripe/`: Webhook handlers
- 📂 `app/api/ghost/`: Webhook handlers

**Environment Validators**:

- ✅ `lib/env.ts`: Custom hostname, cookie domain, subdomain validators
- Needed for multi-domain setup and Better Auth cookie sharing

**Database Schema**:

```sql
-- Custom tables to preserve
CREATE TABLE "Entitlement" (...);
CREATE TABLE "WebhookEvent" (...);
```

### Post-Merge Checklist

After completing a merge:

- [ ] `bun install` - Regenerate lockfile
- [ ] `bun test:types` - Verify TypeScript compilation
- [ ] `bun lint` - Check code quality
- [ ] `bun dev` - Test locally
  - [ ] Anonymous chat works
  - [ ] Authenticated chat works
  - [ ] Model selection works
  - [ ] File uploads work
- [ ] `vercel` - Deploy preview
  - [ ] No build warnings/errors
  - [ ] Test all features in preview
- [ ] `vercel --prod` - Deploy to production (after validation)

### Common Post-Merge Issues

**React Version Mismatch**:

```json
// Add to package.json if missing
"overrides": {
  "react": "19.2.0",
  "react-dom": "19.2.0"
}
```

Then `rm -rf node_modules && bun install`

**Hydration Errors**:

- Check Button components for proper `disabled` handling
- Ensure boolean attributes use conditional spread: `...(prop && { prop: true })`
- Remove duplicate prop declarations

**Build Warnings (Dynamic Routes)**:

- Add `export const dynamic = "force-dynamic"` to API routes using request data
- Especially cron routes, webhooks, or auth-dependent endpoints

### Sync Frequency

- **Recommended**: Monthly or when major upstream features are released
- **Monitor**: Watch https://github.com/FranciscoMoretti/chat-js for updates
- **Before major features**: Sync first to avoid conflicts with new work
- **After sync**: Test thoroughly in preview before production deploy

### Troubleshooting Sync Issues

**Merge conflicts in multiple files**:

1. Use the Conflict Resolution Guide above
2. Resolve one file at a time
3. Test after each resolution
4. Commit incrementally if helpful

**Tests fail after merge**:

1. Check for missing dependencies: `bun install`
2. Verify environment variables are set
3. Check database migrations are applied
4. Review upstream CHANGELOG for breaking changes

**Features broken after merge**:

1. Check if upstream refactored related code
2. Review our customizations in that area
3. Adapt custom code to new patterns
4. Consider if feature should be re-implemented differently

**Entitlement/subscription logic needs updating**:

1. Review upstream session/auth changes
2. Check if `validateAndSetupSession` can incorporate our checks
3. Update entitlement logic to work with new patterns
4. Test both free and paid user flows

## Database Commands

Drizzle ORM with PostgreSQL. Schema at `lib/db/schema.ts`, queries at `lib/db/queries.ts`.

- **Generate Migration**: `bun db:generate` (after editing schema)
- **Run Migration**: `bun db:migrate`
- **Studio**: `bun db:studio` (visual database browser)
- **Push Schema**: `bun db:push` (direct schema push without migration)
- **Pull Schema**: `bun db:pull` (pull schema from database)
- **Check**: `bun db:check` (verify migration files)

### Migration Workflow

1. Edit `lib/db/schema.ts`
2. Run `bun db:generate` to create migration file
3. Run `bun db:migrate` to apply migration

## Model Management

Model definitions are dynamically generated and managed through scripts:

- **Fetch Base Models**: `bun models:base` (fetch base model list)
- **Fetch Endpoints**: `bun models:endpoints` (fetch API endpoints)
- **Fetch Extra**: `bun models:extra` (fetch additional metadata)
- **Sync Models**: `bun models:sync` (sync without overwriting existing)
- **Sync All**: `bun models:sync:all` (force overwrite all models)

Generated model files are in `lib/models/`:

- `models.generated.ts` - Base model definitions
- `model-features.generated.ts` - Feature flags per model
- `model-extra.generated.ts` - Additional metadata

## Architecture

### Core Chat Flow

1. **Entry Point**: Users send messages via `app/(chat)/api/chat/route.ts`
2. **AI Integration**: Uses Vercel AI SDK with streaming responses
3. **Tools System**: AI can invoke tools defined in `lib/ai/tools/`
4. **State Management**: Zustand for client state, tRPC for server state
5. **Database**: PostgreSQL via Drizzle ORM for persistence
6. **Caching**: Redis for resumable streams (optional)
7. **Storage**: Vercel Blob for file attachments

### tRPC Architecture

Backend routers are in `trpc/routers/`:

- `_app.ts` - Main router registration
- `chat.router.ts` - Chat operations
- `credits.router.ts` - Credit management
- `vote.router.ts` - Message voting
- `document.router.ts` - Document operations
- `project.router.ts` - Project management (upstream)
- `entitlements.router.ts` - **Custom**: Stripe/Ghost subscription management

All routers must be registered in `trpc/routers/_app.ts`.

**Backend Pattern**:

```typescript
export const featureRouter = createTRPCRouter({
  queryName: protectedProcedure.query(async ({ ctx }) => {
    return await dbFunction({ userId: ctx.user.id });
  }),

  mutationName: protectedProcedure
    .input(
      z.object({
        /* schema */
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership/permissions
      return await dbFunction(input);
    }),
});
```

**Frontend Pattern**:

```typescript
const trpc = useTRPC();
const queryClient = useQueryClient();

// Query
const { data } = useQuery({
  ...trpc.router.procedure.queryOptions(),
  enabled: !!condition,
});

// Mutation
const mutation = useMutation(
  trpc.router.procedure.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.router.relatedQuery.queryKey(),
      });
    },
  })
);
```

### Database Layer

- **Schema**: `lib/db/schema.ts` (Drizzle schema definitions)
- **Queries**: `lib/db/queries.ts` (all database operations)
- **Pattern**: All database logic should be in `queries.ts`, called from tRPC routers

Key tables:

- `user` - User accounts (Better Auth)
- `userCredit` - User credit balances
- `chat` - Chat sessions
- `message` - Chat messages
- `vote` - Message votes
- `document` - Generated documents
- `Entitlement` - **Custom**: User subscription/entitlement tracking
- `WebhookEvent` - **Custom**: Stripe/Ghost webhook event log

### AI Tools System

Tools are defined in `lib/ai/tools/`:

- `tools.ts` - Main getTools function
- `tools-definitions.ts` - Tool metadata and definitions
- Individual tool files (e.g., `code-interpreter.ts`, `web-search.ts`)

Each tool receives:

- `dataStream` - For streaming updates to client
- `session` - User session
- `messageId` - Current message ID
- `selectedModel` - Model being used

### Authentication

- **Library**: Better Auth
- **Config**: `lib/auth.ts` (server), `lib/auth-client.ts` (client)
- **Providers**: Google OAuth, GitHub OAuth
- **Anonymous Sessions**: Supported via `lib/anonymous-session-*.ts`
- **Guest Access**: Users can try without signup

### Styling

- **Framework**: Tailwind CSS 4
- **Components**: Shadcn/UI in `components/ui/`
- **Config**: `components.json` for Shadcn
- **Pattern**: All components use Tailwind classes

## Code Conventions

### TypeScript Rules

- Avoid `any`, `as any`, or `as unknown as` - types should work correctly
- Avoid type casting with `as` - indicates a type problem
- Use inline interfaces for function parameters:
  ```typescript
  export function processData({
    id,
    name,
  }: {
    id: string;
    name: string;
  }): Result {}
  ```
- No barrel files (`index.ts`) - use direct imports with named exports
- Always use named exports

### General Guidelines

- Be terse and direct in code
- Suggest solutions proactively
- Provide actual code, not high-level descriptions
- Give answers immediately, explain after if needed
- Split code changes into multiple blocks when appropriate
- Respect existing code style and prettier config

## Key Files & Locations

- **Routes**: `app/` directory (Next.js App Router)
  - `app/(chat)/` - Chat interface routes
  - `app/(auth)/` - Authentication routes
  - `app/(models)/` - Model browsing routes
  - `app/api/` - API routes
- **AI Logic**: `lib/ai/`
- **Database**: `lib/db/`
- **Components**: `components/` (shared), `app/` (route-specific)
- **tRPC**: `trpc/`
- **Config**: `lib/env.ts` (environment), `lib/config.ts` (app config)
- **Types**: `lib/types/`, `lib/ai/types.ts`

## Environment Requirements

**Required**:

- `POSTGRES_URL` - Database
- `AI_GATEWAY_API_KEY` - Vercel AI Gateway
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob
- `CRON_SECRET` - Cron authentication
- `AUTH_SECRET` - Better Auth
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` - GitHub OAuth

**Optional**:

- `REDIS_URL` - Resumable streams
- `OPENAI_API_KEY` - Direct OpenAI access
- `TAVILY_API_KEY` - Web search
- `EXA_API_KEY` - Web search
- `FIRECRAWL_API_KEY` - Web scraping
- `SANDBOX_TEMPLATE_ID` - Code execution (E2B)

## Features Configuration

Feature flags and configs in `lib/features-config.ts` control:

- Available AI tools
- Model capabilities
- Feature availability per environment

## State Management

- **Zustand**: Client-side state in `lib/stores/`
- **tRPC + React Query**: Server state synchronization
- **Local Storage**: Anonymous sessions, settings
- **Redis**: Server-side caching (optional)

## Resumable Streams

Uses `resumable-stream` library for interrupted stream recovery:

- Stream state stored in Redis (if configured) or memory
- Allows reconnection after network failures
- Managed in `app/(chat)/api/chat/route.ts`
