# Shared by local Dagger and CI; runtime secrets come from Dokploy.
FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g bun@1.3.1
ENV NEXT_TELEMETRY_DISABLED=1 ELECTRON_SKIP_BINARY_DOWNLOAD=1 TURBO_TELEMETRY_DISABLED=1
COPY package.json bun.lock turbo.json ./
COPY apps/chat/package.json ./apps/chat/
COPY apps/docs/package.json ./apps/docs/
COPY apps/site/package.json ./apps/site/
COPY apps/electron/package.json ./apps/electron/
COPY packages/cli/package.json ./packages/cli/
COPY packages/thread/package.json ./packages/thread/
COPY packages/registry/package.json ./packages/registry/
RUN bun install --frozen-lockfile

FROM deps AS source
COPY . .

FROM source AS check
RUN node scripts/check-fork.mjs
RUN bun run --cwd packages/cli test:unit
RUN bun run --cwd packages/thread test:unit
RUN bun run --cwd apps/chat test:unit
RUN bun run test:types

FROM source AS builder
ENV NODE_ENV=production SKIP_DB_MIGRATE=1
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV AUTH_SECRET=build-placeholder-never-use-in-production
RUN bun run --cwd packages/thread build
RUN cd apps/chat && bun run next build
RUN bun build apps/chat/scripts/docker-migrate.cjs --target=node --format=cjs \
    --external=postgres --outfile=/app/docker-migrate.cjs
RUN cp -RL apps/chat/node_modules/postgres /app/postgres-runtime

FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/chat/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/chat/public ./apps/chat/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/chat/.next/static ./apps/chat/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/chat/lib/db/migrations ./apps/chat/lib/db/migrations
COPY --from=builder --chown=nextjs:nodejs /app/docker-migrate.cjs ./apps/chat/scripts/docker-migrate.cjs
COPY --from=builder --chown=nextjs:nodejs /app/postgres-runtime ./node_modules/postgres
COPY --chown=nextjs:nodejs --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
