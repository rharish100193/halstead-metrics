#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${VERSION:-}" ]]; then
  echo "VERSION is required" >&2
  exit 1
fi

name=$(node -p "require('./package.json').name")
npm pkg set "version=${VERSION}"

if npm view "${name}@${VERSION}" version >/dev/null 2>&1; then
  echo "${name}@${VERSION} is already on the registry"
  exit 0
fi

npm publish --access public --provenance
