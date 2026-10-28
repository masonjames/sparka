# Deployment

## Layout

The app lives in `apps/chat` on the EVE-only chat-js layout. One container runs `next start --hostname 0.0.0.0 --port 3000` and the EVE agent child started by the pinned integration on loopback `127.0.0.1:4274`. Keep the full source-clone build output, including Next `.next`, the child's `.output`, and `node_modules`. `/api/health` checks the database and child; readiness requires HTTP 200, with a 90-second start period. The initial deployment has no code execution sandbox. An hourly cleanup service uses the same image and calls `node apps/chat/scripts/cleanup.ts` (an upstream script, present at that path on this root) with `CRON_SECRET`; the script calls `/api/cron/cleanup` with a bearer token and exits non-zero on partial work.

## Environment contract

All values are set in the Dokploy managed environment, never the repository. The table covers ADR decision 10 and plan phase 2. Required means required by this deployment contract, even where upstream offers a fallback.

| Variable | Required / optional | Value or purpose | Where set |
| --- | --- | --- | --- |
| `APP_URL` | Required | `https://chat.masonjames.com` | Dokploy managed environment |
| `DATABASE_URL` | Required | Fresh Neon database, pooled endpoint for app queries | Dokploy managed environment |
| `DATABASE_MIGRATION_URL` | Required | Same database, direct unpooled endpoint for schema work | Dokploy managed environment |
| `WORKFLOW_POSTGRES_URL` | Required | Same database, direct unpooled endpoint for workflow `LISTEN/NOTIFY` | Dokploy managed environment |
| `AUTH_SECRET` | Required | Authentication secret | Dokploy managed environment |
| `EVE_GATEWAY_SECRET` | Required | EVE gateway secret, at least 32 characters | Dokploy managed environment |
| `CRON_SECRET` | Required | Cleanup authentication secret | Dokploy managed environment |
| `AI_GATEWAY_API_KEY` | Required | Vercel AI Gateway credential | Dokploy managed environment |
| `EVE_NEXT_PRODUCTION_PORT` | Required | `4274` | Dokploy managed environment |
| `EVE_INTERNAL_ORIGIN` | Required | `http://127.0.0.1:3000` | Dokploy managed environment |
| `PORT` | Required | `3000` | Dokploy managed environment |
| `TRUSTED_CLIENT_IP_HEADER` | Optional; leave unset initially | Enable only after verifying Caddy's single-IP header contract | Dokploy managed environment |
| `TAVILY_API_KEY` | Optional | Search integration | Dokploy managed environment |
| `FIRECRAWL_API_KEY` | Optional | Web extraction integration | Dokploy managed environment |
| `MCP_ENCRYPTION_KEY` | Optional | MCP credential encryption | Dokploy managed environment |

The S3 adapter's variable names for the private R2 bucket and credentials are filled in by phase 2 after installing the registry item. Those values also belong in the Dokploy managed environment. Anonymous guests are refused while `TRUSTED_CLIENT_IP_HEADER` is unset; signed-in use is unaffected.

What `bun run --cwd apps/chat check-env` reports on this root with an empty environment (phase 0, 2026-10-28), and what resolves each line:

- `Eve: EVE_GATEWAY_SECRET, WORKFLOW_POSTGRES_URL`: set in the table above.
- `sandbox (vercel): VERCEL_OIDC_TOKEN or VERCEL_TEAM_ID + VERCEL_PROJECT_ID + VERCEL_TOKEN`: phase 2 uninstalls the sandbox (ADR decision 11).
- `aiGateway (vercel): AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN`: set in the table above.
- `fileStorage (vercel-blob)`: phase 2 replaces Vercel Blob with the S3 adapter for R2.
- `authentication: At least one auth provider must be enabled and configured`: upstream's check-env, which `prebuild` runs, requires one enabled OAuth provider with credentials. With every provider off (ADR decision 6) the fork's phase 1 build must run `eve:build` and `next build` directly instead of `bun run build`, which skips all of check-env (the EVE, gateway and storage checks too, so the Dagger gate must then validate those variables itself), or Mason keeps one provider on. Mason decides in the phase 1 report. Until phase 3 lands the handoff, this branch has no sign-in path and must not be deployed.
- `tools.tavily-search: TAVILY_API_KEY`, `tools.retrieve-url: FIRECRAWL_API_KEY`: optional, as in the table.
- `plugins.langfuse: LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY`: phase 2 removes the Langfuse plugin unless Mason wants it.
- `plugins.mcp: MCP_ENCRYPTION_KEY`: optional, as in the table.

The workflow listener keeps a persistent connection. Configure Neon's autosuspend accordingly during attended provisioning. The role must be able to create the `workflow`, `workflow_drizzle`, and `graphile_worker` schemas; if it cannot, use a second database in the same Neon project for `WORKFLOW_POSTGRES_URL`, as the ADR describes.

## Build and gate

The gate is Dagger `v1.0.0-beta.21`, installed by `scripts/bootstrap-dagger.sh`. Phase 1 supplies that script, the Dockerfile and the Dagger module, so these commands are not yet runnable on this root: `dagger call check`, `dagger call smoke`, `dagger call build export --path=artifacts/sparka.tar`, and `dagger call publish`. Check covers the fork contract, types, unit tests, and a native lifecycle rehearsal against disposable PostgreSQL 17, including migration rerun idempotency. Smoke boots the image and checks health, login, an empty session, and forged handoff rejection once the bridge exists. Publish uses the exact GitHub revision and returns an immutable image digest.

## Migrations

Use a fresh database; legacy chat data and migration histories are not imported. Before a rollout with pending migrations, explicitly run the one-shot `bun run --cwd apps/chat setup` in the target image. It runs migrations and `eve:setup`; never run it at container start. Use a single replica and `stop-first` updates in the governed manifest. `stop-first` only guarantees that two app revisions never run at once; it does not make a schema change safe for the old revision, so run `setup` for a backward-compatible migration before the rollout and, for a breaking one such as upstream's 0021, follow the coordinated procedure below.

Upstream's `0021_glorious_chameleon` rule requires a coordinated rollout for an existing database that has not applied it. Back up, stop traffic, drain older app and worker processes, then explicitly run `bun db:migrate --coordinated` from `apps/chat` before setup and deployment of the matching revision. Do not resume an older revision against the migrated schema. Empty databases initialize normally. See the [upstream migration runbook](../apps/chat/lib/db/migrations/README.md).

## Upstream updates

The intended daily `upstream-sync-pr.yml` workflow opens a draft PR on `codex/upstream-chat-js` after the adapted check and smoke gates pass; Mason merges it. Phase 1 supplies the workflow repair. ADR decision 12 defines the fork-owned surface:

- `apps/chat/chat.config.ts` and `apps/chat/plugins/membership/**`.
- `apps/chat/lib/storage-provider.ts` and `apps/chat/lib/storage-options.ts`, as installed by the registry item.
- `Dockerfile`, `deployment/dokploy/**`, `.dagger/**`, and `dagger.json`.
- `.github/workflows/upstream-sync-pr.yml` and `.github/workflows/build-push-ghcr.yml`.
- `docs/deployment.md`, `docs/adr/**`, `docs/replatform-plan.md`, the `README.md` fork notice, `scripts/check-fork.ts`, and `scripts/bootstrap-dagger.sh` (phase 1).
- One migration file and journal entry per bridge schema change.

Every upstream workspace and workflow stays in the tree. The upstream-only workflows `release.yml`, `electron-release.yml`, `docs.yml`, `preview-database-cleanup.yml`, `uiverify-chat.yml`, `uiverify-create.yml`, `uiverify-docs.yml`, `uiverify-registry.yml` and `uiverify-upload.yml` must be disabled in the repository's Actions settings before the first phase PR is merged. Their triggers on this root: `release.yml` and `electron-release.yml` run on push to `main`; `docs.yml`, `uiverify-chat.yml`, `uiverify-create.yml`, `uiverify-docs.yml` and `uiverify-registry.yml` run on every pull request (the UI Verify ones only for matching paths), `uiverify-upload.yml` runs after them, and `preview-database-cleanup.yml` runs on `pull_request_target` when a PR closes. The fork repository holds no Actions secrets or variables (checked 2026-10-28 with the GitHub API), so these jobs can only fail or skip; disabling them removes the noise and the standing risk that a later secret under an upstream name would give them something to act on. That step is part of the attended promotion in the plan.

## Production approval

`platform-infra` owns the governed manifest and catalog row, including the environment contract, `/api/health` check, cleanup service, `stop-first` updates, and the approved image digest. Mason approves operational changes and Dockhand executes them. There is no deployment from this repository. Provisioning, migration execution, installation, and cutover require separate exact approval.
