# Deployment

## Layout

The app lives in `apps/chat` on the EVE-only chat-js layout. One container runs `next start --hostname 0.0.0.0 --port 3000` and the EVE agent child started by the pinned integration on loopback `127.0.0.1:4274`. Keep the full source-clone build output, including Next `.next`, the child's `.output`, and `node_modules`. `/api/health` checks the database and child; readiness requires HTTP 200, with a 90-second start period. The initial deployment has no code execution sandbox. An hourly cleanup service uses the same image and calls `node apps/chat/scripts/cleanup.ts` with `CRON_SECRET`.

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

The workflow listener keeps a persistent connection. Configure Neon's autosuspend accordingly during attended provisioning. The role must be able to create the `workflow`, `workflow_drizzle`, and `graphile_worker` schemas; if it cannot, use a second database in the same Neon project for `WORKFLOW_POSTGRES_URL`, as the ADR describes.

## Build and gate

Use Dagger `v1.0.0-beta.21` via `scripts/bootstrap-dagger.sh`. Phase 1 supplies the Dockerfile and Dagger module, so these commands are not yet runnable on this root: `dagger call check`, `dagger call smoke`, `dagger call build export --path=artifacts/sparka.tar`, and `dagger call publish`. Check covers the fork contract, types, unit tests, and a native lifecycle rehearsal against disposable PostgreSQL 17, including migration rerun idempotency. Smoke boots the image and checks health, login, an empty session, and forged handoff rejection once the bridge exists. Publish uses the exact GitHub revision and returns an immutable image digest.

## Migrations

Use a fresh database; legacy chat data and migration histories are not imported. Before a rollout with pending migrations, explicitly run the one-shot `bun run --cwd apps/chat setup` in the target image. It runs migrations and `eve:setup`; never run it at container start. Use a single replica and `stop-first` updates in the governed manifest.

Upstream's `0021_glorious_chameleon` rule requires a coordinated rollout for an existing database that has not applied it. Back up, stop traffic, drain older app and worker processes, then explicitly run `bun db:migrate --coordinated` from `apps/chat` before setup and deployment of the matching revision. Do not resume an older revision against the migrated schema. Empty databases initialize normally. See the [upstream migration runbook](../apps/chat/lib/db/migrations/README.md).

## Upstream updates

The intended daily `upstream-sync-pr.yml` workflow opens a draft PR on `codex/upstream-chat-js` after the adapted check and smoke gates pass; Mason merges it. Phase 1 supplies the workflow repair. ADR decision 12 defines the fork-owned surface:

- `apps/chat/chat.config.ts` and `apps/chat/plugins/membership/**`.
- `apps/chat/lib/storage-provider.ts` and `apps/chat/lib/storage-options.ts`, as installed by the registry item.
- `Dockerfile`, `deployment/dokploy/**`, `.dagger/**`, and `dagger.json`.
- `.github/workflows/upstream-sync-pr.yml` and `.github/workflows/build-push-ghcr.yml`.
- `docs/deployment.md`, `docs/adr/**`, `docs/replatform-plan.md`, the `README.md` fork notice, and `scripts/check-fork.mjs`.
- One migration file and journal entry per bridge schema change.

Phase 0 preserves every upstream workspace and workflow. The optional deletions in the original proposal are not part of this skeleton.

## Production approval

`platform-infra` owns the governed manifest and catalog row, including the environment contract, `/api/health` check, cleanup service, `stop-first` updates, and the approved image digest. Mason approves operational changes and Dockhand executes them. There is no deployment from this repository. Provisioning, migration execution, installation, and cutover require separate exact approval.
