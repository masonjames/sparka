# Re-platform plan: chat.masonjames.com on current chat-js

Companion to [ADR 001](adr/001-chatjs-replatform-and-paid-access-bridge.md). Mason answered the decisions listed at the end of the ADR on 2026-10-28 (every recommendation accepted); the answers are recorded in the ADR's status and decisions sections.

## Ground rules for every phase

- Each phase runs in its own git worktree cut from the branch it targets, with the model the phase names. Mechanical phases go to Codex (`codex exec -m gpt-6.1-sol -c model_reasoning_effort=high` for medium work, `-m gpt-6-astra -c model_reasoning_effort=medium` for the hard parts). The orchestrating session reads every delegated diff, reruns the gate itself, and requests a tool-disabled Opus 5.5 review of the packet before the PR is opened. The review context names this ADR and the phase's done criteria; the review's model, revision and verdict line go in the PR body.
- Commits are GitHub-signed through the GraphQL commit helper; nothing is pushed with a local signature. One PR per phase; Mason merges. No phase deploys, provisions, reads production environment files, or contacts a customer.
- The gate is the fork's Dagger module (`dagger call check`, then `dagger call smoke` once the image exists), adapted in phase 1 to the new layout. Until phase 1 lands, the gate is upstream's own commands run in the worktree: `bun install --frozen-lockfile`, `bun run test:types`, `bun run --cwd apps/chat test:unit`, and the native lifecycle steps from upstream's `native.yml` against a disposable PostgreSQL 17.
- Sizes: S is under half a day of build time, M is one to two days, L is three or more.

## Phase 0: new root and fork skeleton

- Size: M. Builder: Codex Sol (high). Reviewer: Opus 5.5.
- Branch `replatform/main`, created on GitHub at upstream `76fedbed` (upstream's own commits, unmodified; the fork's old history stays on today's `main`).
- Adds, as signed commits: `apps/chat/chat.config.ts` branding (app name, URL `https://chat.masonjames.com`, organization and legal copy, `authentication` flags per decision 6, `desktopApp.enabled: false`, `services.hosting: "Hetzner"`); `README.md` fork notice; `docs/adr/001-...`, `docs/replatform-plan.md`, a rewritten `docs/deployment.md` skeleton; `scripts/check-fork.mjs` rewritten to assert the new contract (no Stripe, Resend or Ghost dependency, no magic link or password sign-in, providers off, documents present, migration journal consistent; the "membership plugin present" and "R2 adapter selected" assertions are added by phases 3 and 2 when those files exist). No upstream workspace or workflow is deleted: deleting an upstream file turns every later upstream edit of it into a modify/delete conflict. Upstream-only workflows (`release.yml`, `electron-release.yml`, `docs.yml`, `preview-database-cleanup.yml`, `uiverify-chat.yml`, `uiverify-create.yml`, `uiverify-docs.yml`, `uiverify-registry.yml`, `uiverify-upload.yml`) stay in the tree and are disabled in the repository's Actions settings instead.
- Tests and gate: upstream `test:types` and `apps/chat` unit tests pass in the worktree; `scripts/check-fork.mjs` and its `--self-test` pass; `bun run --cwd apps/chat check-env` is run and its output reconciled with the environment table in `docs/deployment.md` (on this root it reports the provider, storage and sandbox requirements that phases 1 to 3 change; see the deployment doc).
- Done when the PR is open with the gate lines in its body, and the ADR and plan live on the new root.
- Attended step after merge review (Mason): rename `main` to `legacy-main`, promote `replatform/main` to `main` and make it the default branch; disable the upstream-only workflows listed above in the Actions settings. Phases 1 to 4 target `replatform/main` until the rename, then `main`.

## Phase 1: container and Dagger gate

- Size: L. Builder: Codex Astra (medium), because the EVE child, the workflow bundle and the health probe make the image layout non-obvious. Reviewer: Opus 5.5.
- `Dockerfile` per ADR decision 10 (Node 24.20.0 slim by digest, Bun 1.3.1, full source-clone build output, non-root, `/api/health` healthcheck, no entrypoint migrations); `deployment/dokploy/start.sh` and `deployment/dokploy/cleanup-loop.sh`; `.dagger/src/sparka/main.py` rewritten per decision 13 (`check`, `build`, `smoke`, `publish`), `dagger.json` unchanged; `.github/workflows/build-push-ghcr.yml` kept; `.github/workflows/upstream-sync-pr.yml` fixed per decision 12 (REST issue reporting under `continue-on-error`, adapted gate calls, same schedule).
- Tests and gate: `dagger call check` and `dagger call smoke` pass locally on OrbStack; `dagger call build export --path=artifacts/sparka.tar` produces a Linux/AMD64 image; one `workflow_dispatch` of the sync workflow on the new `main` finishes without the `createIssue` error (it should report "up to date" or open a draft PR).
- Done when the PR is open with the Dagger output lines, the image size, and the sync run URL in its body.

## Phase 2: storage, sandbox and configuration

- Size: S. Builder: Codex Sol (high). Reviewer: Opus 5.5.
- Install the registry `s3-storage` item through the chat-js installer (so `lib/storage-provider.ts`, `lib/storage-options.ts` and the provider test are registry shaped), set the bucket option, leave the sandbox uninstalled (decision 11), keep the Vercel AI Gateway, drop the Vercel analytics, Speed Insights and Langfuse plugins unless Mason wants Langfuse. Regenerate composition with `chat-js sync`. Update `docs/deployment.md` with the full environment contract: `APP_URL`, `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `WORKFLOW_POSTGRES_URL`, `AUTH_SECRET`, `EVE_GATEWAY_SECRET`, `CRON_SECRET`, `AI_GATEWAY_API_KEY`, the S3 adapter's variable names for R2, `EVE_NEXT_PRODUCTION_PORT`, `EVE_INTERNAL_ORIGIN`, `PORT`, and the optional `TAVILY_API_KEY`, `FIRECRAWL_API_KEY`, `MCP_ENCRYPTION_KEY`.
- Tests and gate: `check-env` passes with placeholder values; `dagger call check` and `smoke` pass; the storage provider unit test passes.
- Done when the PR is open and the deployment doc lists every variable with where it is set.

## Phase 3: the membership bridge plugin

- Size: L. Builder: Codex Astra (medium). Reviewer: Opus 5.5, with the review context pointing at decisions 2, 4, 5 and 7 and asking specifically for replay, expiry, audience, clock-skew and double-grant failure paths.
- `apps/chat/plugins/membership/` with `chatjs.json` (billing export, router, account summary), `schema.ts` (balance, `Membership`, `MembershipHandoff`, `MembershipGrant`), `billing.ts` (`canSpend` gated on a current paid membership, `debit`), `handoff.ts` (Ed25519 verification, nonce single use, payload schema with Zod), `auth-plugin.ts` (Better Auth plugin endpoint `/paid-access/callback` that verifies the token, upserts the user and snapshot, creates the session and redirects), `allowances.ts` (plan slug to monthly cents, with the amounts Mason chooses), `grants.ts` (idempotent monthly grant on first request), `router.ts` (balance, membership status, expiry), `account-summary.tsx`, `cleanup.ts` (expired nonces), and a login-page button that links to `https://masonjames.com/account/chat/`. Uninstall the upstream `credits` plugin. Migration `0022_membership_bridge` and journal entry. One line in `lib/auth.ts` registering the auth plugin, and one line in `chat.config.ts` for the site handoff URL.
- Tests and gate: unit tests for every rejection path (bad signature, wrong audience, expired, future-dated beyond skew, reused nonce, unknown issuer), for the allowance ledger (two concurrent first requests grant once), for `canSpend` with expired and lapsed snapshots; the Dagger `check` migration rehearsal applies `0022` on an empty database and again as a no-op; `smoke` sends a forged token and expects 401.
- Done when the PR is open with the test counts, the gate lines and the Opus verdict line.

## Phase 4: site side (masonjames.com)

- Size: S. Builder: Codex Sol (high). Reviewer: Opus 5.5. Separate PR in `masonjames/masonjames.com`; starts only after Mason confirms that repository may be changed for this work.
- `emdash-site/src/pages/account/chat.astro`: requires a Paid Access session (redirects to sign-in otherwise), reads `Astro.locals.paidAccess.segments()`, mints the token with the Ed25519 private key from `CHAT_HANDOFF_PRIVATE_KEY`, redirects to the chat callback with `Cache-Control: private, no-store`. A test in `emdash-site/scripts/` for the token shape. The "Member chat" navigation link stays as it is.
- Tests and gate: the site's existing test and lint commands; a shared fixture token verified by the chat's phase 3 tests so both sides agree on the format.
- Done when the PR is open and the public key for the chat is recorded in the deployment doc (the private key never leaves the site's secrets).

## Phase 5: attended provisioning and cutover (Mason, with Dockhand where it applies)

Nothing here is done by an agent. Each item is one approval.

1. Neon: new project, one database, autosuspend set for the persistent workflow listener; record the pooled URL as `DATABASE_URL` and the direct URL as `DATABASE_MIGRATION_URL` and `WORKFLOW_POSTGRES_URL`.
2. R2: new bucket or prefix with private access; API token scoped to it.
3. Secrets: generate `AUTH_SECRET`, `EVE_GATEWAY_SECRET` (32+ chars), `CRON_SECRET`, the Ed25519 key pair (private to the site, public to the chat); reuse the Vercel AI Gateway key; store all in Dokploy's managed environment, never in the repository.
4. platform-infra: new governed manifest with the new environment contract, the `/api/health` check, `stop-first` update order, the cleanup service, and `SPARKA_IMAGE` pinned to the digest `dagger call publish` returns for the merged `main`; catalog row updated (`health_contract` HTTP check `/api/health`, dependencies drop Resend, `update_sources` unchanged). PR in platform-infra; Mason merges.
5. Dokploy: new project and Compose service from the manifest on a staging hostname first (for example `chat-next.masonjames.com`); run the one-shot `bun run --cwd apps/chat setup` in the image against the new database; verify `/api/health` 200, a handoff from the site, a streaming chat, an attachment upload and download, and the hourly cleanup call.
6. Cutover: point `chat.masonjames.com` at the new service in Dokploy and Caddy; keep the old manual Compose service running but unrouted for the rollback window. Rollback is repointing the route back; the databases are separate so no data step is involved.
7. Re-pointing webhooks: none to re-point. Delete the Stripe webhook endpoint that targeted `/api/webhooks/stripe` and the Ghost webhook that targeted `/api/webhooks/ghost` in their dashboards; revoke the Resend key and the legacy OAuth app callbacks that are no longer used.
8. After the rollback window: remove the legacy Compose service, delete the old Neon database after the retention period Mason chose, and update the platform-infra catalog evidence.

## Phase 6: after cutover

- Size: S. Builder: Codex Sol (high).
- `docs/deployment.md` final pass with the observed digest and the runbook for migrations with pending `--coordinated` changes; a dispatched run of `upstream-sync-pr.yml` to prove daily syncs work from the new root; a short note in platform-infra's runbook.

## What is explicitly not carried over

Listed in ADR decision 14: Ghost and Stripe bridges, magic link and password sign-in, cookie sharing and `/api/auth/validate`, the entitlement tables and router, all chat and credit data, existing R2 objects, the Node 22 standalone image and entrypoint migrations, Redis, and the legacy Compose source on platform-core.

## Risks to watch

- Upstream moves fast (902 merged PRs); phases 1 to 3 should each start by fast-forwarding the worktree to the latest upstream-rooted `main` so the bridge never targets a stale tree.
- The Better Auth internal session API is used by upstream's own magic-link plugin, but the exact helper names are verified at phase 3 build time against the installed version.
- Neon scale-to-zero and the workflow listener (ADR decision 9).
- Guest access stays off until the Caddy single-IP header contract is verified; this is a feature loss compared to today's anonymous mode and is accepted for the proof of concept.
