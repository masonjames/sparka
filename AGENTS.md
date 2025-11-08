# Repository Guidelines

## Project Structure & Module Organization
Next.js routes, layouts, and server actions live in `app/` (use `app/api/*` for route handlers). Reusable UI is in `components/`, feature hooks in `hooks/`, and shared state wiring in `providers/`. Utilities and env helpers stay in `lib/` (Drizzle schema + migrations under `lib/db/` with config in `drizzle.config.ts`), RPC routers in `trpc/`, docs/specs in `docs/`, and static assets in `public/`.

## Build, Test, and Development Commands
- `bun dev` — hot-reload app at http://localhost:3000.
- `bun run build` — runs `tsx lib/db/migrate` then `next build`; must pass before deploys.
- `bun run lint` / `bun run format` — Ultracite/Biome linting and autofix.
- `bun run db:migrate` — apply schema updates after editing `lib/db/schema.ts`.
- `bun run test`, `bun run test:unit`, `bun run test:playwright`, `bun run test:types` — aggregate, Vitest, Playwright (install browsers once with `bunx playwright install`), and TS/Next type checks.
- `bun run storybook` — component sandbox on port 6006.

## Coding Style & Naming Conventions
Ship everything in TypeScript. Prefer React Server Components inside `app/`; mark interactive modules with `"use client"`. Follow Biome defaults (2 spaces, double quotes, trailing commas) and rely on Tailwind utilities instead of bespoke CSS. Components use PascalCase, hooks camelCase with a `use` prefix, Drizzle schemas snake_case columns, and tRPC routers match each feature (`chatRouter`). Read secrets only via `lib/env.ts`.

## Testing Guidelines
Create `<name>.test.ts(x)` files next to the code they cover and run them with `bun run test:unit`. Keep Playwright specs under `tests/e2e/` (create if missing) for onboarding, entitlement, and Ghost/Stripe flows; export `PLAYWRIGHT=True` before running `bun run test:playwright`. Finish every PR check with `bun run test:types` to guard server/client contracts.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat:`, `fix:`, `chore:`) as in `git log`; keep subjects imperative and under 72 characters. PRs summarize intent, link issues, list test commands with pass/fail emojis, and share screenshots or Looms for UI updates. Call out schema changes, env deltas, and rollout steps; request reviewers early for auth, billing, or gateway changes.

## Security & Configuration Tips
Mirror `.env.example` into `.env.local`, populate secrets, and sync with `vercel env pull` before running `bun dev`. `proxy.ts` and edge logic assume HTTPS headers, so set `NEXT_PUBLIC_BASE_URL` in preview environments. Run migrations against a disposable database (`bun run db:migrate && bunx drizzle-kit studio`) before production pushes, and never commit AI keys, Better Auth secrets, or Ghost/Stripe credentials.
