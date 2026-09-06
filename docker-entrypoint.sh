#!/bin/sh
set -e

echo "Starting Chat by Mason James..."

# Run database migrations if DATABASE_URL is set and SKIP_DB_MIGRATE is not set
if [ "$SKIP_DB_MIGRATE" != "1" ]; then
  echo "Running database migrations..."
  node apps/chat/scripts/docker-migrate.cjs
fi

# Start the Next.js server
exec node apps/chat/server.js
