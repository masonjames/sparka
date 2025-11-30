#!/bin/bash
set -e

BRANCH_NAME="${1:-dev-local}"

# Restore .env.local from backup
if [ -f .env.local.backup ]; then
  cp .env.local.backup .env.local
  rm .env.local.backup
  echo "✓ Restored .env.local from backup"
else
  echo "No .env.local.backup found, skipping restore"
fi

# Delete the branch
echo "Deleting branch '$BRANCH_NAME'..."
bunx neonctl branches delete "$BRANCH_NAME" --force 2>/dev/null || echo "Branch may not exist"

echo ""
echo "✓ Branch '$BRANCH_NAME' deleted"
echo "✓ DATABASE_URL restored to production"

