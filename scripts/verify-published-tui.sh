#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${TUI_PACKAGE:-}" || -z "${VERSION:-}" ]]; then
  echo "TUI_PACKAGE and VERSION are required" >&2
  exit 1
fi

bash "${GITHUB_WORKSPACE}/scripts/wait-for-npm.sh" "${TUI_PACKAGE}@${VERSION}"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
npm init -y >/dev/null
installed=0
for attempt in $(seq 1 5); do
  npm cache clean --force >/dev/null 2>&1 || true
  if npm install --prefer-online --no-package-lock --no-audit --no-fund "${TUI_PACKAGE}@${VERSION}"; then
    installed=1
    break
  fi
  echo "install of ${TUI_PACKAGE}@${VERSION} failed (${attempt}/5)"
  sleep 10
done
if [[ "$installed" -ne 1 ]]; then
  echo "could not install ${TUI_PACKAGE}@${VERSION}" >&2
  exit 1
fi

node --check "node_modules/${TUI_PACKAGE}/index.mjs"
test -x node_modules/.bin/halstead-tui
echo "published ${TUI_PACKAGE}@${VERSION} provides halstead-tui"
