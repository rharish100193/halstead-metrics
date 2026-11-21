#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${VERSION:-}" ]]; then
  echo "VERSION is required" >&2
  exit 1
fi

name=$(node -p "require('./package.json').name")
npm pkg set "version=${VERSION}"

state=$(NAME="$name" VERSION="$VERSION" node <<'EOF'
const { spawnSync } = require("child_process");
const name = process.env.NAME;
const version = process.env.VERSION;
const result = spawnSync("curl", [
  "-sS",
  "-H", "Accept: application/json",
  "-H", "Cache-Control: no-cache",
  "-w", "\n%{http_code}",
  `https://registry.npmjs.org/${encodeURIComponent(name)}`,
], { encoding: "utf8" });
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(2);
}
const lines = result.stdout.trimEnd().split("\n");
const status = lines.pop();
if (status === "404") {
  process.stdout.write("missing");
  process.exit(0);
}
const packument = JSON.parse(lines.join("\n"));
if (packument.versions && packument.versions[version]) {
  process.stdout.write("installable");
} else if (packument.time && packument.time[version]) {
  process.stdout.write("removed");
} else {
  process.stdout.write("available");
}
EOF
)

if [[ "$state" == "installable" ]]; then
  echo "${name}@${VERSION} is already on the registry"
  exit 0
fi

if [[ "$state" == "removed" ]]; then
  echo "${name}@${VERSION} was published before and removed. npm will not accept that version again." >&2
  exit 1
fi

npm publish --access public --provenance
