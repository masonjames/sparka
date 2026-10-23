#!/usr/bin/env bash
# Use the reviewed repository CLI and local engine instead of an ambient version.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
dagger_bin="$("$ROOT/scripts/bootstrap-dagger.sh")"
if [[ "$#" -eq 0 ]]; then
  set -- call check
fi
export DAGGER_ENGINE="image+docker://registry.dagger.io/engine:v1.0.0-beta.21"
exec "$dagger_bin" "$@"
