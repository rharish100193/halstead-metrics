#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CLI_PACKAGE:-}" || -z "${VERSION:-}" || -z "${GITHUB_WORKSPACE:-}" ]]; then
  echo "CLI_PACKAGE, VERSION, and GITHUB_WORKSPACE are required" >&2
  exit 1
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
npm init -y >/dev/null
installed=0
for attempt in $(seq 1 18); do
  if npm install --no-package-lock --no-audit --no-fund "${CLI_PACKAGE}@${VERSION}"; then
    installed=1
    break
  fi
  echo "install of ${CLI_PACKAGE}@${VERSION} failed (${attempt}/18)"
  sleep 10
done
if [[ "$installed" -ne 1 ]]; then
  echo "could not install ${CLI_PACKAGE}@${VERSION}" >&2
  exit 1
fi
npx --no-install halstead "${GITHUB_WORKSPACE}/examples/Sample.java" | node -e '
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  const report = JSON.parse(raw);
  if (!report.Halstead || !report.filename) {
    console.error("published CLI returned an unexpected report");
    process.exit(1);
  }
  console.log("published CLI reported " + report.filename);
});
'
