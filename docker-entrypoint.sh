#!/bin/sh
set -e

echo "Starting Chat by Mason James..."

# Run database migrations if DATABASE_URL is set and SKIP_DB_MIGRATE is not set
if [ -n "$DATABASE_URL" ] && [ "$SKIP_DB_MIGRATE" != "1" ]; then
  echo "Running database migrations..."
  node apps/chat/docker-migrate.mjs || echo "Warning: migrations failed, continuing startup..."
fi

# Start the Next.js server
exec node apps/chat/server.js
