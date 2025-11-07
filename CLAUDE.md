# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chat by Mason James is a production-ready AI chat application built with Next.js 15, supporting 120+ AI models through Vercel AI Gateway. Features include multi-model chat, authentication, document generation, code execution, web search, and advanced chat capabilities like branching and resumable streams.

**Fork Information**:
- Upstream: `https://github.com/FranciscoMoretti/sparka` (actively maintained)
- This fork adds: Custom branding, Stripe subscription system
- Sync regularly with upstream to get latest features

## Package Manager & Development

You have access to the github cli, vercel cli, and neon cli. Inspect and update tasks with the `bd` CLI; treat beads as the single source of truth for work tracking.

This project VERCEL_ID: `prj_KsD9kDHclSMwZgZ5CUmMaopTtm1r`

- **Package Manager**: Bun (v1.1.34+)
- **Development**: `bun dev` (uses Next.js Turbo mode)
- **Build**: `bun build`
- **Type Checking**: `bun test:types` (use this to verify changes, NOT `bun build`)
- **Linting**: `bun lint` or `bun lint:fix` (ESLint + Biome)
- **Formatting**: `bun format` (Biome)
- **Testing**: `bun test` (Playwright), `bun test:unit` (Vitest)

## Task Management with BD CLI

This project uses the `bd` (beads) CLI for issue tracking with first-class dependency support.

### Quick Start
```bash
# List all tasks
bd list

# Create a new task
bd create "Task title" -t task -p 1 -d "Optional description"

# Show task details
bd show <task-id>

# Update task status
bd update <task-id> --title "New title"

# Close a task
bd close <task-id> --reason "Completion reason"

# Show ready work (no blockers)
bd ready

# Show blocked issues
bd blocked
```

### Task Types & Priorities
- **Types**: `task`, `bug`, `feature`, `epic`, `chore`
- **Priorities**: `0` (P0 - highest) to `4` (P4 - lowest)

### Working with Dependencies
```bash
# Create task with dependencies
bd create "Implement feature" --deps "blocks:sparka-abc,discovered-from:sparka-xyz"

# Add dependency to existing task
bd dep add <task-id> blocks:<other-task-id>

# List dependencies
bd dep list <task-id>
```

### Best Practices
- Use `bd list` to see all open tasks before starting work
- Create tasks for significant features/bugs to track progress
- Close tasks with `--reason` to document completion
- Use dependencies to model task relationships
- BD tasks are stored in `.beads/` directory (committed to git)

## Upstream Sync Workflow

This repository is a fork with custom modifications. Regular syncing with upstream ensures we get the latest features and fixes.

### Git Remote Configuration
```bash
# Verify remotes are configured
git remote -v

# Should show:
# origin: git@github.com:masonjames/sparka.git
# upstream: https://github.com/FranciscoMoretti/sparka.git
```

### Syncing with Upstream (Recommended Method)

**Context**: This fork has "unrelated histories" with upstream. The cleanest approach is to reapply custom changes onto fresh upstream code.

#### Step-by-Step Sync Process

1. **Fetch latest upstream changes**
```bash
git fetch upstream
```

2. **Create backup branch** (safety first!)
```bash
git branch backup-before-sync-$(date +%Y%m%d)
```

3. **Create fresh branch from upstream**
```bash
git checkout -b sync-upstream upstream/main
```

4. **Apply custom branding**
   - Update `lib/config.ts`: Change `appName`, `githubUrl`, `appPrefix`, organization details
   - Update `package.json`: Change `name` field
   - Update `app/manifest.webmanifest`: Change app name and description
   - Commit: `git commit -m "chore: Apply custom branding"`

5. **Re-apply custom features** (e.g., Stripe subscription system)
   - Use documentation from previous implementation
   - Adapt to any upstream changes
   - Test thoroughly before committing

6. **Test the sync branch**
```bash
bun install
bun test:types
bun dev  # Manual testing
```

7. **Replace main branch** (once tested)
```bash
git checkout main
git reset --hard sync-upstream
git push origin main --force-with-lease
```

8. **Deploy to Vercel**
```bash
vercel --prod
```

### Custom Modifications to Preserve

When syncing, ensure these customizations are reapplied:

#### Branding Changes
- `lib/config.ts`: App name, GitHub URL, organization details
- `package.json`: Package name
- `app/manifest.webmanifest`: PWA manifest details

#### Custom Features
- **Stripe Subscription System** (if implemented):
  - Database schema: `Subscription` table
  - API routes: `/api/stripe/*`
  - Components: `components/subscription/*`
  - tRPC router: `trpc/routers/subscription.router.ts`
  - Documentation: `STRIPE_SETUP.md`, `STRIPE_IMPLEMENTATION_SUMMARY.md`

### Sync Frequency
- **Recommended**: Monthly or when major upstream features are released
- **Monitor**: Watch upstream repository for important updates
- **Before major features**: Sync first to avoid conflicts with new work

### Troubleshooting Sync Issues

**If upstream has breaking changes**:
1. Check upstream CHANGELOG or commit messages
2. Review migration guides in upstream repository
3. Test thoroughly in staging before production deploy

**If custom features conflict**:
1. Review upstream changes to related files
2. Adapt custom code to work with upstream changes
3. Consider contributing generic features back to upstream

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

All routers must be registered in `trpc/routers/_app.ts`.

**Backend Pattern**:
```typescript
export const featureRouter = createTRPCRouter({
  queryName: protectedProcedure.query(async ({ ctx }) => {
    return await dbFunction({ userId: ctx.user.id });
  }),

  mutationName: protectedProcedure
    .input(z.object({ /* schema */ }))
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
  }): Result { }
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
