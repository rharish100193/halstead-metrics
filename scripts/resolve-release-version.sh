#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${GITHUB_ENV:-}" ]]; then
  echo "GITHUB_ENV is required" >&2
  exit 1
fi

raw=$(node -p "require('./packages/halstead-metrics/package.json').version")
if [[ ! "$raw" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?$ ]]; then
  echo "packages/halstead-metrics/package.json version must look like 1.2.0 (got: ${raw})" >&2
  exit 1
fi

core=$(node -p "require('./packages/halstead-metrics/package.json').name")
cli=$(node -p "require('./packages/halstead-metrics-core/package.json').name")
cli_version=$(node -p "require('./packages/halstead-metrics-core/package.json').version")
cli_dependency=$(node -p "require('./packages/halstead-metrics-core/package.json').dependencies['halstead-metrics']")
tui=$(node -p "require('./packages/halstead-metrics-tui/package.json').name")
tui_version=$(node -p "require('./packages/halstead-metrics-tui/package.json').version")
tui_dependency=$(node -p "require('./packages/halstead-metrics-tui/package.json').dependencies['halstead-metrics']")

if [[ "$cli_version" != "$raw" || "$cli_dependency" != "$raw" ]]; then
  echo "${cli} must be version ${raw} and depend on ${core}@${raw}" >&2
  exit 1
fi

if [[ "$tui_version" != "$raw" || "$tui_dependency" != "$raw" ]]; then
  echo "${tui} must be version ${raw} and depend on ${core}@${raw}" >&2
  exit 1
fi

{
  echo "VERSION=${raw}"
  echo "CORE_PACKAGE=${core}"
  echo "CLI_PACKAGE=${cli}"
  echo "TUI_PACKAGE=${tui}"
} >> "$GITHUB_ENV"

echo "Releasing ${core}@${raw}, ${cli}@${raw}, and ${tui}@${raw} from package.json"
