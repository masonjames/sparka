#!/bin/bash
set -e

BRANCH_NAME="${1:-dev-local}"

echo "🔗 Fetching connection string for branch '$BRANCH_NAME'..."

# Get branch connection string (this also validates branch exists)
BRANCH_URL=$(bunx neonctl connection-string "$BRANCH_NAME" 2>&1) || {
  echo ""
  echo "❌ Failed to get connection string for '$BRANCH_NAME'"
  echo ""
  echo "$BRANCH_URL"
  echo ""
  echo "Make sure you're authenticated: bunx neonctl auth"
  echo "Then create branch with: bun db:branch:create"
  exit 1
}

# Mask password in URL for display
MASKED_URL=$(echo "$BRANCH_URL" | sed 's/:[^:@]*@/:****@/')

echo "✓ DATABASE_URL=$MASKED_URL"
echo ""
echo "🚀 Starting dev server with branch database..."
echo ""

# Start dev server with branch DATABASE_URL
DATABASE_URL="$BRANCH_URL" bun run next dev

