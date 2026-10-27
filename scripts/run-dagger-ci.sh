#!/usr/bin/env bash
# Use the reviewed repository CLI and local engine instead of an ambient version.
set -euo pipefail

# All Mac callers, including local shells, share the installed admission lease.
if [[ "$(uname -s)" == "Darwin" ]]; then
  mac_ci_guard=/Users/masonjames/.local/libexec/dagger-ci-host-guard
  [[ -x "$mac_ci_guard" ]] || { echo "Mac CI admission guard is not installed" >&2; exit 69; }
  if ! "$mac_ci_guard" --check-lease >/dev/null 2>&1; then
    exec "$mac_ci_guard" -- /bin/bash "$0" "$@"
  fi
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
dagger_bin="$("$ROOT/scripts/bootstrap-dagger.sh")"
if [[ "$#" -eq 0 ]]; then
  set -- call check
fi
export DAGGER_ENGINE="image+docker://registry.dagger.io/engine:v1.0.0-beta.21"
if [[ "$(uname -s)" == "Darwin" ]]; then
  export DAGGER_CI_BIN="$dagger_bin"
  exec "$mac_ci_guard" -- "$dagger_bin" "$@"
fi
exec "$dagger_bin" "$@"
