#!/bin/bash
set -e

BRANCH_NAME="${1:-dev-local}"

echo "Creating branch '$BRANCH_NAME'..."
bunx neonctl branches create --name "$BRANCH_NAME" 2>/dev/null || echo "Branch may already exist, continuing..."

echo "Getting connection string..."
BRANCH_URL=$(bunx neonctl connection-string "$BRANCH_NAME")

if [ -z "$BRANCH_URL" ]; then
  echo "Failed to get connection string"
  exit 1
fi

# Backup current .env.local if not already backed up
if [ ! -f .env.local.backup ]; then
  cp .env.local .env.local.backup
  echo "Backed up .env.local to .env.local.backup"
fi

# Replace DATABASE_URL in .env.local
if grep -q "^DATABASE_URL=" .env.local; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$BRANCH_URL\"|" .env.local
else
  echo "DATABASE_URL=\"$BRANCH_URL\"" >> .env.local
fi

echo ""
echo "✓ Branch '$BRANCH_NAME' ready"
echo "✓ DATABASE_URL updated in .env.local"
echo ""
echo "Run 'bun db:branch:stop' when done to restore production URL"

