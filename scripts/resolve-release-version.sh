#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RELEASE_VERSION:-}" ]]; then
  echo "RELEASE_VERSION is required" >&2
  exit 1
fi
if [[ -z "${GITHUB_ENV:-}" ]]; then
  echo "GITHUB_ENV is required" >&2
  exit 1
fi

raw="${RELEASE_VERSION#v}"
if [[ ! "$raw" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?$ ]]; then
  echo "Release version must look like 1.2.0 or v1.2.0 (got: ${RELEASE_VERSION})" >&2
  exit 1
fi

core=$(node -p "require('./packages/halstead-metrics/package.json').name")
cli=$(node -p "require('./packages/halstead-metrics-core/package.json').name")

{
  echo "VERSION=${raw}"
  echo "CORE_PACKAGE=${core}"
  echo "CLI_PACKAGE=${cli}"
} >> "$GITHUB_ENV"

echo "Releasing ${core}@${raw} and ${cli}@${raw}"
