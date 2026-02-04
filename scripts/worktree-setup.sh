#!/usr/bin/env bash
# Setup a worktree with .env.local and deps
# Usage: worktree-setup.sh [branch-name]
#   No args: setup current worktree
#   With arg: create worktree + setup
set -e

MAIN_REPO=$(git worktree list | head -1 | awk '{print $1}')
REPO_NAME=$(basename "$MAIN_REPO")

if [ -n "$1" ]; then
  WORKTREE_PATH="../$REPO_NAME-$1"
  git worktree add -b "$1" "$WORKTREE_PATH" 2>/dev/null || git worktree add "$WORKTREE_PATH" "$1"
  cd "$WORKTREE_PATH"
fi

cp "$MAIN_REPO/.env.local" .env.local 2>/dev/null && echo "✓ .env.local" || echo "⚠ No .env.local"
bun i
echo "✓ Ready: $(pwd)"
