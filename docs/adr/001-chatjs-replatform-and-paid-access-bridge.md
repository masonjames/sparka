# ADR 001: Re-platform chat.masonjames.com onto current chat-js with a Paid Access bridge

- Status: accepted on 2026-10-28, when Mason accepted every recommendation as written (see "Decisions for Mason" at the end for the recorded answers). Amended the same day after the phase 0 review, and the amended text is proposed, pending Mason's approval, in these places: decision 2 (the token travels by POST form and is bound to a state cookie), decision 4 (the allowance table is an allowlist that grants nothing for unknown slugs and ships empty until Mason states the amounts; a paid plan means an allowlisted slug, so an empty allowlist means nobody can spend; the monthly grant runs inside `canSpend` before the balance check; with several plans the largest allowance wins and a plan change grants again only when its allowance exceeds the largest already granted that period; the grant for an unpaid month is an open point), decision 5 (the ledger records the cents credited, a repeated slug in a period is skipped, and nonce rows outlive every token), decision 7 (the membership balance defaults to 0 cents instead of upstream's 50, and `canSpend` requires an allowlisted, unexpired membership), decision 12 (upstream-only workflows are kept and disabled; the file list names every path the plan touches; the sync repair writes the conflict list to the step summary and an artifact, keeps issue creation best-effort, lives in `scripts/upstream-sync.sh` and is proven by a forced-conflict dispatch), the Consequences line on conflicts, and answers 3 and 4 in the decisions section. Phases 1 to 4 do not start until Mason approves these amendments.
- Date: 2026-10-28
- Scope: `masonjames/sparka` (the app), with one small companion change in `masonjames/masonjames.com`
- Companion document: [docs/replatform-plan.md](../replatform-plan.md)

## Context

chat.masonjames.com is a fork of `FranciscoMoretti/chat-js`. The fork's merge base with upstream is `18db694b` (2026-09-05, 754 commits behind upstream `76fedbed` on 2026-10-28). Since then upstream removed its old runtime in favour of an "EVE-only" layout, reset the Drizzle migrations to a new baseline that rejects earlier histories, moved credits into an optional plugin, dropped magic-link and email-and-password sign-in, and ships no Dockerfile.

The fork's subscription bridge is built on Ghost and Stripe webhooks that no longer match how masonjames.com sells memberships. The site now runs the `emdash-paid-access` plugin (Mason's own plugin, GPL, `github.com/masonjames/emdash-paid-access`), which keeps the member's identity in a plugin-owned session and reads entitlement live from Stripe.

Mason decided on 2026-10-28 to re-platform onto current chat-js, build a new bridge to Paid Access memberships, and carry no legacy data: fresh database, no chat history, no old credits, no Ghost or Stripe bridge. Production today is an old security-patched image run by a manual Compose file on platform-core; platform-infra records it as `sparka-ai-chat` with promotion blocked until a pinned digest and a governed manifest exist.

This is a proof of concept with low priority against Q4 goals. It must still be maintainable and track upstream, so every decision below prefers the thinnest fork surface.

## What was read, and the facts that drive the decisions

### Our fork's bridge (all under `apps/chat/`, all to be retired)

- `lib/entitlements/provisioning.ts`: Ghost and Stripe webhook provisioning, tier credits (`pro` 1000, `premium` 5000, `enterprise` 20000, default 500), `isChatEntitled`.
- `lib/db/credits.ts`: `grantCredits` sets the balance to an exact amount (not additive).
- `app/api/webhooks/{ghost,stripe}/route.ts`, `app/api/auth/{magic-link,validate}/route.ts`: webhook receivers and a cross-subdomain session validator for other `*.masonjames.com` apps.
- `lib/auth.ts`: Better Auth with Google, GitHub, Vercel, email-and-password, Resend magic-link and `crossSubDomainCookies`. `lib/app-url.ts`: cookie-domain and trusted-origin derivation. `lib/storage-provider.ts`: R2 through the S3 adapter (`files-sdk/s3`).
- Migrations `0032_entitlements_webhooks` and `0046_fork_entitlements` add `Entitlement` and `WebhookEvent` tables with unique `(source, externalId)` and `(source, eventId)` keys.
- `Dockerfile` (Node 22, standalone Next), `docker-entrypoint.sh` (runs migrations at start), `.dagger/src/sparka/main.py` (check, migrations, build, smoke, publish), `docs/deployment.md`, `scripts/check-fork.ts` (asserts the legacy contract: Stripe, Ghost, magic link, R2).

### emdash-paid-access (what a membership is, and what can be verified from outside)

- A member is an email address. Sign-in is a magic link; the browser gets an HTTP-only, SameSite=Lax `phb_session` cookie scoped to the site host (30 days). Members never become EmDash users (`src/handlers/auth.ts`, `docs/reference/architecture-and-security.md`).
- A plan is `{ slug, name, stripeProductId, grantsVisibility, labels }` configured in the plugin's admin settings, not in code (`src/plans.ts`, `docs/guides/stripe-memberships.md`). The plan slugs on masonjames.com therefore live in the site's runtime settings.
- Entitlement is computed live from Stripe on each restricted read: an active or trialing subscription containing the plan's product, or a paid standalone invoice with that product (`src/stripe.ts` `customerHasProduct`, `src/handlers/access.ts`). There is no webhook receiver and no stored "subscription" record: Stripe is the source of truth.
- The site consumes it through `Astro.locals.paidAccess` with `access()`, `session()`, `plans()` and `segments()` (`src/astro/runtime.ts`). `segments()` returns `member`, `plan:<slug>` and `entitled`; masonjames.com calls it on its pages and wraps the calls in `emdash-site/src/lib/paid-access/server.ts`.
- Server-to-server verification: none that works by email. Every core route that resolves a member (`access`, `auth/session`, `entitlements`) is keyed by the member's `sessionToken`. Private routes also require an EmDash user with `plugins:manage`, an `admin` token scope for bearer tokens, and the `X-EmDash-Request` header for session calls (`emdash/packages/core/src/plugins/http-route-dispatch.ts`). The plugin exposes no signed token and no webhook. Any lookup by email means adding a route to the plugin.
- `unionAccessDecisions` in `src/decisions.ts` is internal; the site keeps a copy. Not needed by the chat.
- The site already has a "Member chat" navigation link to `https://chat.masonjames.com/` (`emdash-site/src/lib/site.ts`).

### Current chat-js main (`76fedbed`, cloned read-only into `.build/chat-js`)

- Auth: `apps/chat/lib/auth.ts` wires Better Auth 1.5 with Google, GitHub and Vercel OAuth from env, `lastLoginMethod`, `nextCookies`, and an optional Electron plugin. No magic link, no password, no cookie-domain option.
- Plugins: `apps/chat/plugins/<id>/chatjs.json` descriptors; `chat-js sync` reads every directory under `plugins/` and regenerates `composition/generated/*`. The `credits` plugin owns the `UserCredit` table (balance in cents, default 50), a tRPC router, an account summary component, and the single `UsageBilling` export (`canSpend`, `debit`). Only one installed plugin may supply billing (`packages/cli/src/utils/sync-plugins.ts`). Core calls `canSpend` before a turn (`lib/eve/spending-admission.ts`) and `debit` inside the usage transaction (`lib/db/eve-billing.ts`).
- Storage: `lib/storage-provider.ts` is a one-line adapter selection. The registry ships an `s3-storage` item (`packages/registry/src/storage/s3`, `files-sdk/s3`) besides Vercel Blob, Supabase and many others; private access with short-lived signed URLs is the default.
- Database: `0000_eve_baseline.sql` through `0021_glorious_chameleon.sql`. The runner accepts only an empty database or this exact history. Migration 0021 is a coordinated, non-rolling change. `DATABASE_URL` (runtime), optional `DATABASE_MIGRATION_URL` (direct connection for schema work), `WORKFLOW_POSTGRES_URL` for the EVE workflow world (falls back to `DATABASE_URL`; transaction poolers are rejected; `graphile_worker` and `workflow` schemas are created by `eve:setup`). Upstream's own CI uses one database for both.
- Runtime: `next start` plus one EVE agent child on loopback port 4274 started by the pinned EVE integration, `/eve/chat/v1/*` rewritten to it. `/api/health` checks the database and the child within 4.5 s and answers 200 ready or 503. Secrets: `AUTH_SECRET`, `EVE_GATEWAY_SECRET` (32+ chars), `CRON_SECRET`, `AI_GATEWAY_API_KEY`. `EVE_INTERNAL_ORIGIN` must be HTTPS or loopback HTTP. No Redis anywhere.
- Deployment: only `deployment/render/` (source-clone profile, Node 24.20.0, Bun 1.3.1, explicit `setup` for migrations and `eve:setup`, hourly cron calling `/api/cron/cleanup` with a bearer `CRON_SECRET`). It states it is not a standalone Next image or a certified Docker layout. Guest (anonymous) admission requires `TRUSTED_CLIENT_IP_HEADER` with a verified single-IP proxy contract and fails closed otherwise; signed-in use is unaffected.
- Sandboxes: Vercel Sandbox or Daytona through registry items; without one, ordinary chat works and filesystem/code tools are disabled (`lib/eve/sandbox-environment.ts`).

### platform-infra

- `apps/platform-catalog.yaml` row `sparka-ai-chat`: install admission blocked, data policy `empty-database-and-volumes`, dependencies Neon, R2, Vercel AI Gateway, GHCR; promotion evidence pending; `automation_mode: manual_only`.
- `infra/dokploy/apps/prod/sparka.dokploy.yaml`: classification manifest only; requires an immutable `SPARKA_IMAGE` digest, the legacy env contract (R2, Resend, APP_BASE_URL_OVERRIDE) and a root-path health check. It will be replaced, not edited, for the new layout.
- The latest attended record (`docs/plans/attended-evidence/2026-10-23-sparka-production-release-retry-5/closeout.md`) shows the current production image runs from a manual Compose file on platform-core with the legacy Dokploy source left untouched. No directory named `2026-10-29-sparka-source-capture` exists yet in platform-infra main `0971629e`.

### The broken upstream sync workflow

`.github/workflows/upstream-sync-pr.yml` has 53 failures and 4 successes in the last 100 runs; every run since 2026-09-06 failed. Two causes, both visible in the run logs:

1. The direct `git merge upstream/main` conflicts (dozens of files on 2026-10-21, two files on 2026-10-28) because the fork and upstream diverged across the re-platform. This is the real signal and is unfixable without this ADR.
2. The failure reporter then crashes on `gh issue create` with `GraphQL: Resource not accessible by integration (createIssue)` even though the job asks for `issues: write` and the repository's default workflow permission is `write`. The report step therefore masks the conflict list. Issues are enabled on the fork (checked with the GitHub API on 2026-10-28), so the cause is not the usual "Issues disabled" one and is not yet proven; decision 12 therefore makes the conflict report independent of issue creation.

## Decisions

Each decision gives one recommendation, a confidence, and the alternatives considered. Anything under 85 percent is marked **Mason decides**.

### 1. How the repository moves onto upstream: a new root, not a merge

**Recommendation.** Build a branch from upstream `76fedbed` itself (upstream's own commits, unmodified) and add the fork's files on top as GitHub-signed commits. When Mason approves it, rename the current `main` to `legacy-main` and make the new branch `main`. Nothing is force pushed and the old history stays reachable.

**Why.** Merging 754 upstream commits into the current `main` conflicts across hundreds of files whose fork-side content is being deleted anyway, and the only tool that produces signed commits here (`signed_commit.py`, GraphQL `createCommitOnBranch`) cannot create a merge commit. A `main` that descends from upstream makes every future `git merge upstream/main` a clean three-way merge, which is what the sync workflow needs.

**Confidence: 80 percent. Mason decides** (it changes the branch history of his repository).

**Alternatives.** (a) A locally made "tree-replacing" merge commit that keeps both histories: cleaner graph, but the merge commit would be unsigned. (b) Keep the current root and resolve conflicts file by file: days of work resolving code that is then deleted.

### 2. Identity handoff between masonjames.com and chat.masonjames.com

**Recommendation.** "Sign in with masonjames.com": a signed handoff token minted by the site for a signed-in member, consumed by a small Better Auth plugin in the chat.

- The site adds one route, `/account/chat/`, that requires a Paid Access session, calls `Astro.locals.paidAccess.segments()` to learn the member's plan slugs, and hands the token to `https://chat.masonjames.com/api/auth/paid-access/callback` with an auto-submitting POST form, so the token never appears in a URL, a log line or a Referer header.
- The token is `base64url(payload).base64url(signature)` with an Ed25519 signature (Node's built-in `crypto`, no dependency). Payload: `sub` (normalized member email), `plans` (slugs), `iat`, `exp` (5 minutes), `nonce`, `aud` (the chat origin, exactly `https://chat.masonjames.com`), `iss` (`https://masonjames.com`). The site holds the private key; the chat holds only the public key, so a compromised chat cannot mint memberships.
- The chat's Better Auth plugin verifies signature, audience, expiry (rejecting any token whose `exp - iat` exceeds 300 seconds, so the site cannot mint long-lived tokens) and single-use nonce, finds or creates the user by email, stores the membership snapshot (decision 5), creates the session with Better Auth's internal adapter and sets the cookie. A token is bound to the browser that started the handoff (a short-lived `__Host-` prefixed, host-only state cookie holding 32 random bytes in base64url, exactly 43 characters of `[A-Za-z0-9_-]`, set by the chat's login page and echoed in the token's `nonce`; both sides reject any other shape; the prefix stops a cookie set from another `*.masonjames.com` host from standing in for it), so a member cannot sign a victim into the member's own account by forwarding a link; phase 3 tests cover replay, expiry, audience, a GET request, a state mismatch and this login-CSRF path. Session creation uses the same internal API as Better Auth's own magic-link plugin; the state binding is the bridge's own. Because the callback is a cross-origin POST from masonjames.com, the site's origin is added to Better Auth's `trustedOrigins`.
- The site's existing "Member chat" link points at the chat; the chat's login page shows one button that sends the member to `/account/chat/` on the site.

**Why.** It is the only option that needs no change to the Paid Access plugin, keeps the member identity exactly as the site knows it (the email that owns the Stripe customer), and never exposes a broad credential to the chat. It also removes the email-mismatch problem that OAuth sign-in would have (a member whose Stripe email is not a Google or GitHub account).

**Confidence: 75 percent. Mason decides** between this and alternative (b).

**Alternatives.** (a) Shared Better Auth session over a `.masonjames.com` cookie: not applicable, the site does not run Better Auth and members are not EmDash users; the current fork's `crossSubDomainCookies` only ever served other consumer apps. (b) Server-to-server lookup by email: add a private route to `emdash-paid-access` that answers "which plans does this email own" (reusing the plugin's `ownedProducts` logic), with its own shared-secret HMAC instead of an admin token. The chat would then keep Google or GitHub OAuth for sign-in and poll the route at sign-in and daily. Stronger lapse handling (see decision 4) but it needs a plugin change, a plugin release, a site upgrade, and relies on the OAuth email equalling the member email. Good second step if the handoff proves insufficient. (c) Full OAuth or OIDC provider on the site: EmDash's OAuth is for staff tokens, not members; far too much for a proof of concept. (d) The chat reads Stripe directly with the old webhook bridge: duplicates the plugin's plan-to-product mapping and its access rules, which is the coupling Mason is removing.

### 3. Source of truth for the subscription

**Recommendation.** Stripe, as read by Paid Access. The chat never decides membership on its own; it stores a dated snapshot of the plan slugs the site asserted and treats it as valid for a bounded time.

**Confidence: 95 percent.**

**Alternatives.** Chat-owned subscription state fed by Stripe webhooks (the legacy design); rejected because it makes two systems disagree about the same customer.

### 4. Plans to chat credits, and renewal, lapse and refund

**Recommendation.**

- The bridge keeps a fork-owned table `plugins/membership/allowances.ts` mapping plan slug to a monthly allowance in cents (the credits plugin bills in cents). The table is an allowlist: a slug that is not in it grants nothing, and `free` is never in it. The amounts in cents per slug are Mason's to state in writing before the phase 3 PR merges; until he does, the table ships empty and no member receives credits.
- Renewal: each calendar month (UTC), the first chat request by an entitled member grants that month's allowance (a member receives at most one allowance per period: the first grant of a period sets the balance to `max(balance, allowance)`, never summed across months; with more than one allowlisted plan the allowance is the largest of them; a change to a plan with a larger allowance later in the same period credits only the difference between the new allowance and the largest allowance already granted that period, so a downgrade or a sideways change credits nothing even after the balance was spent. Worked example: plan A at 1000 cents is granted, 800 are spent, the member moves to plan B at 5000 in the same period: the balance goes from 200 to 4200 and the member has received 5000 that period, never 5800). Open point for Mason: a member who hands off on 27 to 31 October and cancels at once holds a snapshot valid into December and so can receive both the November and the December grants; the recommended rule is that a period's grant requires a handoff asserted within that period, which the chat prompts for when the month rolls over. Ordering: the plugin's `canSpend` first applies that idempotent grant for the current period, then checks the balance, so a freshly handed-off member with a 0-cent balance is admitted on the first request; core calls `canSpend` only for registered users, so guests never reach it (phase 3 confirms this against core and tests both cases). Grants are recorded in a ledger keyed `(userId, period, reason)` so a retried request cannot grant twice.
- Lapse: the snapshot carries `expiresAt` = 35 days after the token's `iat`, never after the time of receipt (one billing month plus grace). Spending requires a non-expired snapshot with at least one paid plan, where a paid plan means a slug present in the allowlist (so an empty allowlist means nobody can spend). When it expires the member is sent back through the site, which re-reads Stripe; a lapsed member simply does not get a new token with plans. Balance is not clawed back, but cannot be spent without a current membership.
- Refund or cancellation: Stripe ends the subscription, Paid Access stops asserting the plan, and the next handoff (at most 35 days later) lapses the chat membership. There is no instant revocation in this design.
- Non-members who reach the chat (anonymous guests) get upstream's guest policy, which is rate-limited and blocked until the proxy header contract is verified (decision 10).

**Confidence: 85 percent for the mechanism. Amounts and the 35-day grace: Mason decides.**

**Alternatives.** Daily server-to-server refresh (decision 2b) would cut lapse latency to one day. Instant revocation would need Stripe webhooks to the chat, which decision 3 rejects.

### 5. What the bridge stores, and idempotency

**Recommendation.** One Drizzle schema file in the plugin, one migration appended after upstream's `0021`:

- `Membership` (`userId` primary key referencing `user`, `email`, `planSlugs` json, `assertedAt`, `expiresAt`, `issuer`): the latest snapshot per user, replaced on each handoff.
- `MembershipHandoff` (`nonce` primary key, `userId`, `usedAt`): single-use tokens; a replay with a known nonce is rejected. Rows are kept for seven days, far longer than any token can live (five minutes plus skew), and then deleted by the cleanup hook.
- `MembershipGrant` (`id`, `userId`, `period` such as `2026-11`, `reason`, `cents`, `createdAt`, unique `(userId, period, reason)`): the allowance ledger. `cents` records the amount credited, and the grant for a plan change is decided against the sum of `cents` already recorded for `(userId, period)`; a slug already recorded in the period (for example after Mason raises its amount) is skipped, not an error.
- The balance itself lives in the membership plugin's own balance table (decision 7).

No webhook event log is needed because no webhooks arrive. The migration is named `0022_membership_bridge` and is renumbered if upstream ships a `0022` first, the same rule the fork already follows.

**Confidence: 90 percent.**

### 6. Auth providers to keep

**Recommendation.** Drop the fork's magic link, email-and-password, Resend, cookie-domain sharing and `/api/auth/validate`. Drop Vercel OAuth. Leave Google and GitHub wired (upstream code, zero fork cost) but turned off in `chat.config.ts` so the only sign-in is the handoff. A member who signs in through Google would otherwise create a second, unentitled account.

**Confidence: 80 percent. Mason decides** whether to keep Google and GitHub on as a convenience, accepting that such accounts are unentitled until the member also completes a handoff with the same email.

### 7. Credits: replace the upstream credits plugin with the fork's membership plugin

**Recommendation.** Uninstall upstream's `credits` plugin and install a fork-owned `plugins/membership` plugin that owns: the balance table (same columns as upstream's `UserCredit`, but the balance defaults to 0 cents, not upstream's 50, so a handoff never creates spendable credit by itself), the `UsageBilling` export (`canSpend` = balance above zero and a current paid membership; `debit` unchanged), the handoff auth plugin, the tRPC router (balance, membership status, "refresh membership" link), the account-summary component, and the allowance logic.

**Why.** chat-js allows exactly one billing plugin and generates composition from `plugins/*/chatjs.json`, so a fork-local directory composes with `chat-js sync` and touches no registry or upstream file. Wrapping upstream's credits plugin instead would require editing its registry-mirrored descriptor on every sync.

**Confidence: 85 percent.**

**Alternatives.** Keep upstream credits and add a second plugin without billing: not allowed by the composition rules. Edit the credits descriptor: fights the registry mirror.

### 8. Storage: R2 through the S3 adapter

**Recommendation.** Install the registry's `s3-storage` item and point it at a new R2 bucket (or a new prefix) with private access and signed download URLs, which is upstream's default. The old public R2 objects are not carried over.

**Confidence: 90 percent.**

**Alternatives.** Vercel Blob (ties the Hetzner deployment to Vercel billing); Supabase Storage (a new provider to operate for no gain).

### 9. Database: one fresh Neon project

**Recommendation.** A new Neon project with one database used for both the application and the EVE workflow world. `DATABASE_URL` uses the pooled endpoint; `DATABASE_MIGRATION_URL` and `WORKFLOW_POSTGRES_URL` use the direct (unpooled) endpoint, because the workflow world needs `LISTEN/NOTIFY` and rejects transaction poolers. Migrations and `eve:setup` run as an explicit operator step, never at container start.

**Confidence: 85 percent.**

**Attention.** The workflow worker keeps a persistent connection, so Neon's scale-to-zero will either never trigger or will drop the listener on suspend; the attended Neon step must set the compute's autosuspend to match. If the role cannot create the `workflow`, `workflow_drizzle` and `graphile_worker` schemas, the fallback is a second database in the same project for `WORKFLOW_POSTGRES_URL`, which upstream documents.

### 10. Docker layout for the EVE runtime on Dokploy and Swarm

**Recommendation.**

- A multi-stage `Dockerfile` on `node:24.20.0-bookworm-slim` pinned by digest, Bun 1.3.1 installed for `bun install --frozen-lockfile` and the build. The runner keeps the full source-clone build output (Next `.next`, the EVE child's `apps/chat/.output`, and `node_modules`), because upstream states the layout is not a standalone image. Non-root user, `EXPOSE 3000`.
- Entry: `next start --hostname 0.0.0.0 --port 3000`; the pinned EVE integration starts the agent child on `127.0.0.1:4274`. Container env: `EVE_NEXT_PRODUCTION_PORT=4274`, `EVE_INTERNAL_ORIGIN=http://127.0.0.1:3000`, `APP_URL=https://chat.masonjames.com`.
- `HEALTHCHECK` and the Swarm health check call `/api/health` and require 200; start period 90 s because the child boots after Next.
- No migrations in the entrypoint. A one-shot command in the same image (`bun run --cwd apps/chat setup`) runs migrations and `eve:setup` as an attended step before each rollout that has pending migrations; the manifest documents it. Single replica, `start-first` update order is unsafe when a migration is pending, so the manifest uses `stop-first`.
- Cleanup: a second service from the same image runs a tiny fork-owned loop that calls `node apps/chat/scripts/cleanup.ts` hourly with `CRON_SECRET`, because Swarm has no cron.
- `TRUSTED_CLIENT_IP_HEADER` stays unset until the Caddy header contract is verified; until then anonymous guests are refused and signed-in members work.
- The platform-infra manifest is a new file (`sparka-chatjs.dokploy.yaml` or a replacement of the current one) with the new env contract and a pinned digest; the catalog row's `health_contract` changes its HTTP check from `/` to `/api/health`.

**Confidence: 85 percent.**

**Alternatives.** A standalone Next image (smaller, but the EVE child and its workflow bundle are outside what `output: standalone` traces; upstream warns against it); running the EVE child as a separate Swarm service (upstream says not to for this layout).

### 11. Code execution sandbox

**Recommendation.** None at first. Ordinary chat, search and documents work without a sandbox; code and filesystem tools report as unavailable. Add the Vercel Sandbox registry item later if members want code execution.

**Confidence: 75 percent. Mason decides.**

**Alternatives.** Vercel Sandbox now (needs `VERCEL_TOKEN`, team and project IDs on Hetzner); Daytona (a new vendor).

### 12. Staying close to upstream

**Recommendation.** Keep the fork surface to this list and nothing else:

- `apps/chat/chat.config.ts` (branding, provider flags, legal copy) and `apps/chat/plugins/membership/**`
- `apps/chat/lib/auth.ts` (three lines: registering the handoff plugin, adding `https://masonjames.com` to `trustedOrigins`, and a Better Auth cookie prefix of `mjchat` so a stale legacy `better-auth` cookie on `.masonjames.com` cannot shadow the new host-only session cookie after cutover) and `apps/chat/components/auth-providers.tsx` (the sign-in button that sends members to masonjames.com)
- `apps/chat/package.json` and `bun.lock` (adapter and plugin dependencies), `apps/chat/composition/generated/*` (regenerated by `chat-js sync`)
- Deleted upstream plugins: `apps/chat/plugins/credits/**` (replaced by membership), `plugins/langfuse/**` (unless Mason keeps Langfuse), `plugins/vercel-analytics/**`, `plugins/vercel-speed-insights/**`, and the installed Vercel sandbox files under `apps/chat/lib/sandbox/**`. An upstream edit to a deleted plugin produces a modify/delete conflict on sync; the resolution rule is to keep the deletion.
- `apps/chat/lib/storage-provider.ts`, `lib/storage-options.ts` and `lib/storage-provider.test.ts` as installed by the registry item
- `Dockerfile`, `.dockerignore`, `deployment/dokploy/**` (entry and cleanup loop scripts), `.dagger/**`, `dagger.json`, and one `artifacts/` line in `.gitignore`
- `.github/workflows/upstream-sync-pr.yml` and `build-push-ghcr.yml`; upstream-only release and publishing workflows (`release.yml`, `electron-release.yml`, `docs.yml`, `preview-database-cleanup.yml`, the five `uiverify-*.yml`) stay in the tree untouched: the two push-to-main release workflows are disabled by Mason in the repository's Actions settings before the rename, the other seven are accepted to run where they can (the five `pull_request` workflows run on phase PRs; `uiverify-upload.yml` and `preview-database-cleanup.yml` use the default branch's copy and run only after the rename) on the evidence recorded in the deployment doc, and all are disabled after the rename, and none is deleted or guarded because that would conflict with every later upstream edit
- `docs/deployment.md`, `docs/adr/**`, `docs/replatform-plan.md`, `README.md` fork notice, `scripts/check-fork.ts` rewritten for the new contract, `scripts/bootstrap-dagger.sh`, `scripts/upstream-sync.sh` and `scripts/validate-env.ts` (phase 1)
- One migration file, its journal entry and its `meta/NNNN_snapshot.json` per bridge schema change (all three are renumbered together on an upstream collision)

Fix the sync workflow in the same change set: merge from a `main` that descends from upstream (decision 1), write the conflict list to the run's step summary and an uploaded artifact on every merge failure (neither needs issue permission), create or update the tracking issue as a best-effort step after that, open the draft PR only after the adapted Dagger `check` and `smoke` pass, and keep the daily schedule. Proof: the merge-and-report logic lives in `scripts/upstream-sync.sh` so phase 1 can run it locally against a deliberately conflicting ref and show the summary and artifact being written; the workflow itself gets a `workflow_dispatch` input `merge_ref` (default `upstream/main`) that the script merges for real (the value reaches the script only through an environment variable, is validated with `git check-ref-format`, the checkout fetches full history plus the upstream remote, and a run with a non-default `merge_ref` never opens the draft PR even when it merges cleanly), so a forced run points it at a ref known to conflict (for example `legacy-main`) and drives the same code as a daily failure. Phase 6's evidence is two dispatches once the workflow is on the default branch: a forced one that must end with conclusion failure, a step summary containing the conflict list, an uploaded `upstream-conflicts` artifact and the issue step's outcome recorded whether it succeeded or not; and a normal one that must report "up to date" or open the draft PR.

**Confidence: 85 percent.**

### 13. Gate: Dagger, adapted to the new layout

**Recommendation.** Keep the Python Dagger module and its functions with new contents: `check` = fork contract script and its `--self-test`, `turbo run test:types`, `apps/chat` unit tests, and a native lifecycle rehearsal against disposable PostgreSQL 17 (`db:migrate`, `eve:setup`, bridge migration applied twice to prove reruns are no-ops); `build` = the runner image; `smoke` = boot the image with disposable PostgreSQL and placeholder secrets, require `/api/health` 200, `/login` 200, `get-session` null, and a forged handoff token rejected with 401; `publish` unchanged (exact revision from GitHub, returns a digest). Dagger `v1.0.0-beta.21` as today.

**Confidence: 85 percent.**

### 14. Explicitly not carried over

- Ghost: webhook receiver, admin-API sync, and the Ghost tiers mapping.
- Stripe in the chat: webhook receiver, `stripe` dependency, `STRIPE_*` env.
- Magic link, Resend, email-and-password sign-in, cross-subdomain cookies, `APP_HOSTNAME`, `AUTH_COOKIE_DOMAIN*`, `APEX_DOMAIN`, `AUTH_TRUSTED_ORIGINS`, `/api/auth/validate` and every consumer app that relied on it (Cal.com, Open-Lovable, Autumn validation).
- `Entitlement` and `WebhookEvent` tables, migrations 0032 and 0046, the `entitlements` tRPC router, `TIER_CREDITS`.
- All chat history, documents, votes, user accounts and credit balances in the current database. The old Neon database is kept read-only for a retention period Mason sets, then deleted as an attended step.
- Existing R2 objects and their public URLs.
- The Node 22 standalone Dockerfile, entrypoint-time migrations, Redis, and the legacy Compose source on platform-core.

## Consequences

- Members sign in through masonjames.com; the chat has no account creation of its own.
- Membership changes reach the chat within one handoff, at most 35 days after a lapse.
- The fork can merge upstream daily again; conflicts are expected only in the files listed in decision 12, and the deleted upstream plugins there resolve by keeping the deletion.
- Two attended changes outside this repository are required: the site route and key (masonjames.com) and the new governed manifest and catalog row (platform-infra).
- The security-patched production image keeps running until cutover; rollback is "repoint Dokploy at the old service", since the databases are separate.

## Decisions for Mason

Answered by Mason on 2026-10-28: "Accept every recommendation in ADR 001 as written: new root for main, site-minted handoff, default allowance amounts and 35-day grace, Google and GitHub off, no sandbox, keep the old database 30 days."

1. New root for `main` (decision 1): rename today's `main` to `legacy-main` and promote the upstream-rooted branch, or insist on a merge commit (unsigned) that keeps one history. Answer: new root.
2. Identity handoff (decision 2): site-minted signed handoff (recommended) or a new lookup-by-email route in emdash-paid-access with OAuth sign-in. Answer: site-minted handoff.
3. Allowance amounts per plan slug and the 35-day grace window (decision 4). Answer: 35 days. The amounts remain open: Mason's words were "default allowance amounts", but no default exists until the membership plugin is written, so the phase 3 PR must carry the cents per slug that Mason states in writing, and the allowlist ships empty until then.
4. Google and GitHub sign-in off (recommended) or on (decision 6). Answer: off. Open point found in phase 0: upstream's `check-env` (run by `prebuild`) refuses a configuration with no enabled and credentialed provider, so phase 1 must either bypass that prebuild step in the fork's build or keep one provider on; see the deployment doc.
5. No code sandbox for the proof of concept (recommended) or Vercel Sandbox now (decision 11). Answer: none.
6. Retention period for the old database before deletion (decision 14). Answer: 30 days.
