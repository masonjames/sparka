# Dockerfile for Sparka AI Chat
# Multi-stage build optimized for Next.js with Bun
# Used by GitHub Actions to build and push to GHCR

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM oven/bun:1-debian AS deps
WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM oven/bun:1-debian AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Skip database migrations during Docker build
# Migrations should run at container startup or via separate job
ENV SKIP_DB_MIGRATE=1

# Provide placeholder values for build-time env validation
# These are server-only and will be replaced at runtime by Dokploy
# The @t3-oss/env-nextjs package validates at build time, requiring these
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV AUTH_SECRET="placeholder-auth-secret-will-be-replaced-at-runtime"
ENV BLOB_READ_WRITE_TOKEN="vercel_blob_placeholder_token"

# Build the application (skip migrations by modifying build command)
RUN bun run next build

# =============================================================================
# Stage 3: Production Runner
# =============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
