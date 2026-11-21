#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: wait-for-npm.sh package@version ..." >&2
  exit 1
fi

for spec in "$@"; do
  found=0
  for attempt in $(seq 1 18); do
    if npm view "$spec" version >/dev/null 2>&1; then
      echo "registry has ${spec}"
      found=1
      break
    fi
    echo "waiting for ${spec} (${attempt}/18)"
    sleep 10
  done
  if [[ "$found" -ne 1 ]]; then
    echo "timed out waiting for ${spec}" >&2
    exit 1
  fi
done
