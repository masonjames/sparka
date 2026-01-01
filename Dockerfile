# Dockerfile for Sparka AI Chat
# Multi-stage build optimized for Next.js standalone output
# Uses Bun for fast dependency installation and builds
#
# NOTE: Uses official Bun image (Debian-based) throughout.
# better-sqlite3 requires native compilation, handled by Bun.

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM oven/bun:1 AS deps
WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy lockfile and package.json
COPY package.json bun.lock* ./

# Install dependencies with bun
RUN bun install --frozen-lockfile

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM oven/bun:1 AS builder
WORKDIR /app

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
ENV R2_ACCESS_KEY_ID="placeholder-r2-access-key"
ENV R2_SECRET_ACCESS_KEY="placeholder-r2-secret-key"
ENV R2_BUCKET="placeholder-bucket"
ENV R2_ENDPOINT="https://placeholder.r2.cloudflarestorage.com"
ENV R2_PUBLIC_URL="https://placeholder.example.com"

# Build the application using bun
RUN bun run build

# =============================================================================
# Stage 3: Production Runner
# =============================================================================
# Use Node.js slim for production (Next.js server.js runs on Node)
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
