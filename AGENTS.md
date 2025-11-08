# Repository Guidelines

## Onboarding & Required References
Read `CLAUDE.md` before contributing; it documents upstream sync rules, database guidance, and bd task policies. Treat the bd CLI (`bd list`, `bd show <id>`) as the canonical task tracker. You have preinstalled GitHub CLI, Vercel CLI, Neon CLI, and the project id `prj_KsD9kDHclSMwZgZ5CUmMaopTtm1r`; prefer these tools for auth, deploys, and status checks.

## Project Structure & Module Organization
Routes, layouts, and server actions sit in `app/` (use `app/api/*` for handlers). Shared UI resides in `components/`, hooks in `hooks/`, context/state providers in `providers/`, and reusable logic in `lib/`. Drizzle schemas plus migrations are under `lib/db/` with config in `drizzle.config.ts`. RPC routers live in `trpc/`, long-form docs in `docs/`, and static assets in `public/`.

## Build, Test, and Development Commands
- `bun dev` — Next.js dev server with streaming previews.
- `bun run build` — runs `tsx lib/db/migrate` then `next build`.
- `bun run lint` / `bun run format` — Ultracite/Biome lint + fix.
- `bun run db:migrate` — apply schema changes post `lib/db/schema.ts` edits.
- `bun run test`, `test:unit`, `test:playwright`, `test:types` — aggregate, Vitest, Playwright (install browsers once via `bunx playwright install`), and TS checks.
- `bun run storybook` — component sandbox on :6006.

## Coding Style & Naming Conventions
All code is TypeScript. Prefer React Server Components in `app/`; mark interactive files with `"use client"`. Follow Biome defaults (2 spaces, double quotes, trailing commas) and Tailwind utilities. Components use PascalCase, hooks camelCase with `use`, Drizzle columns snake_case, and tRPC routers mirror features (e.g., `chatRouter`). Access secrets solely through `lib/env.ts`.

## Testing Guidelines
Co-locate `<name>.test.ts(x)` beside the code they cover and run via `bun run test:unit`. Place Playwright specs in `tests/e2e/` for onboarding, entitlement, and Ghost/Stripe coverage; export `PLAYWRIGHT=True` before `bun run test:playwright`. Always finish a PR check with `bun run test:types` to guard shared contracts.

## Git, Upstream, & Deployment
This fork tracks `upstream=https://github.com/FranciscoMoretti/sparka.git`; sync by fetching upstream, branching from `upstream/main`, reapplying branding, then running the full test suite (see `CLAUDE.md` for step-by-step). Use `gh` for status/PRs and `vercel link && vercel deploy --project prj_KsD9kDHclSMwZgZ5CUmMaopTtm1r` for previews after `vercel env pull .env.local`. Never skip `CLAUDE.md` when onboarding new agents or planning deployments.

## Security & Configuration Tips
Mirror `.env.example` into `.env.local`, populate secrets, and sync with `vercel env pull` before running `bun dev`. Set `APP_BASE_URL_OVERRIDE` + `NEXT_PUBLIC_APP_BASE_URL` to the canonical domain (e.g., `https://chat.masonjames.com`), `AUTH_COOKIE_DOMAIN_OVERRIDE` to `.masonjames.com` to share Better Auth cookies across subdomains, and keep `AUTH_TRUSTED_ORIGINS` updated for every future app host. `proxy.ts` assumes HTTPS headers, so configure preview deployments accordingly. Run migrations against a disposable database (`bun run db:migrate && bunx drizzle-kit studio`) before production pushes, and never commit AI keys, Better Auth secrets, or Ghost/Stripe credentials.
