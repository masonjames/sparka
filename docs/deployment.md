# Sparka: chat-js updates and Dokploy delivery

The application remains `masonjames/sparka`, hosted at https://chat.masonjames.com.
Upstream is https://github.com/FranciscoMoretti/chat-js, branch `main`.
Application code is under `apps/chat/`; the fork keeps Stripe/Ghost entitlements,
R2 storage, email/password and Resend magic-link login, shared-domain cookies,
and Mason James branding. The upstream desktop/CLI publishing workflows are
restricted to upstream's repository.

## Local build

Install Docker and Dagger v0.21.9. Run from this repository:

```sh
dagger call check
dagger call smoke
dagger call build export --path=artifacts/sparka.tar
```

The check runs the fork contract, thread/chat unit tests, monorepo type checks,
and an upgrade/rerun test against disposable PostgreSQL. The image is
Linux/AMD64 even on Apple Silicon. Dagger and Docker exclude local environments,
credentials, dependencies, build output and image exports. Frozen Bun 1.3.1
installation and the same Dockerfile are used locally and in CI. Image creation
uses placeholder validation values; never pull production environments for it.
The `build` function does not run `check`; both must pass for release.

To publish a committed revision already pushed to the fork:

```sh
revision=$(git rev-parse HEAD)
dagger call publish --revision="$revision" \
  --registry-username=masonjames --registry-token=env:GHCR_TOKEN
```

Supply `GHCR_TOKEN` through managed secret injection. Publishing fetches the exact
revision from the fork, reruns checks and an image startup/auth/assets smoke test and returns
`ghcr.io/masonjames/sparka@sha256:...`. It does not update `latest` or call Dokploy.
The local archive can be transferred without a registry; Dockhand still needs
an exact image identity and the same approval/verification evidence.

## Regular upstream updates

`upstream-sync-check.yml` runs daily at 06:00 UTC and calls
`upstream-sync-pr.yml`. Dockhand or an operator can request the same preparation:

```sh
gh workflow run upstream-sync-check.yml --repo masonjames/sparka --ref main
```

The workflow fetches chat-js, checks ancestry, creates a backup branch and
attempts a direct merge. A single open `codex/upstream-chat-js` PR blocks another
candidate. Clean merges must pass Dagger checks and the image build before a
draft PR is opened. Conflicts or failed checks update one actionable issue.
Nothing is automatically merged or deployed. GitHub must allow Actions to create
pull requests; no repository-scoped self-hosted runner is currently registered.
The hosted workflow is a scheduling fallback; all build functions run locally.

A reviewed merge to `main` runs `build-push-ghcr.yml` to publish a candidate.
Manual dispatch runs the same path. The digest in its summary is candidate
evidence, not deployment approval. A PR created with `GITHUB_TOKEN` will not
trigger other PR workflows; the sync workflow explicitly validates its merge.

## Merge review

Run `node scripts/check-fork.mjs` after resolving conflicts. Review actual behavior
as well as that structural check: Stripe signature verification and subscription
updates, Ghost callbacks, email login, cookies, upload/download/cleanup, chat
streaming and credit limits. Existing public R2 attachment URLs remain usable;
new files use upstream's opaque `/api/files/content?key=...` URLs. Legacy object
names are intentionally excluded from upstream's cleanup until separately migrated.

Stripe integration is preserved, not a complete checkout product: it requires
`subscription.metadata.userId`, price-to-tier mapping is unfinished, and credit
grants/replayed or concurrent webhooks require a separate billing correctness
review before expanding paid access. Existing Ghost subscription links remain.

## Migrations and production approval

Startup runs the standard Drizzle migrator and stops on failure. Set
`SKIP_DB_MIGRATE=1` only for a verified pre-migrated database or image smoke test.
The old Docker ledger stored migration tags in `hash`; Drizzle selects pending
migrations using `created_at`, so applied SQL is not replayed merely to rewrite
hashes. Historical journal timestamps are preserved, including the old 0034
out-of-order timestamp. Migration 0046 journals the fork tables and adds the
unique keys required by entitlement upserts and webhook deduplication. Existing
duplicate keys stop the migration; never delete subscriber records automatically.

Upstream 0044 changes `Message.selectedModel` from text to JSON and adds parallel
response columns. 0045 adds generation cancellation. Treat rollback as a database
restore plus image rollback until old-image compatibility is proven. A fresh
production backup and a rehearsal on a restored copy are required in addition
to the synthetic Dagger test.

The platform contract is maintained in `masonjames/platform-infra`:
`apps/platform-catalog.yaml` (`sparka-ai-chat`),
`infra/dokploy/apps/prod/sparka.dokploy.yaml`, and
`docs/runbooks/workflows/sparka-upstream-sync.md`.
Dockhand must fresh-read the actual Dokploy target and running digest, bind the
candidate, previous image, environment contract, backup/restore and canary proof
to an exact human-approved PlanSpec, execute, and verify its deployment job,
Swarm convergence, image revision, TLS, auth, attachments, subscriptions and an
actual streaming chat. Public HTTP 200 alone does not prove those flows.
