# Dockerfile for Sparka AI Chat
# Multi-stage build optimized for Next.js standalone output
# Used by GitHub Actions to build and push to GHCR
#
# NOTE: Uses node:22-slim (Debian/glibc) throughout, NOT Alpine (musl).
# This ensures native modules like better-sqlite3 work correctly.
# Bun is not used because better-sqlite3 prebuild-install is unsupported.

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:25-slim AS deps
WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files (use package-lock.json for npm)
COPY package.json package-lock.json* ./

# Install dependencies with npm (includes devDependencies for build)
# --legacy-peer-deps required due to @ai-sdk beta version peer conflicts
# --ignore-scripts is NOT used since better-sqlite3 needs postinstall
RUN npm ci --legacy-peer-deps

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:25-slim AS builder
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

# Build the application using npm (not bun - see header note)
RUN npm run build

# =============================================================================
# Stage 3: Production Runner
# =============================================================================
# Use Debian slim, NOT Alpine - native modules (better-sqlite3) compiled on
# Debian (glibc) are incompatible with Alpine (musl)
FROM node:25-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security (Debian syntax)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Health check - verify port is listening
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => process.exit(r.statusCode === 200 || r.statusCode === 302 ? 0 : 1)).on('error', () => process.exit(1))"

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
