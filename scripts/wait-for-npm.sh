#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: wait-for-npm.sh package@version ..." >&2
  exit 1
fi

for spec in "$@"; do
  name="${spec%@*}"
  version="${spec#*@}"
  found=0
  for attempt in $(seq 1 30); do
    npm cache clean --force >/dev/null 2>&1 || true
    body=$(curl -fsS \
      -H "Accept: application/vnd.npm.install-v1+json" \
      -H "Cache-Control: no-cache" \
      "https://registry.npmjs.org/${name}" || true)
    if [[ -n "$body" ]] && printf '%s' "$body" | node -e '
      let raw = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => { raw += chunk; });
      process.stdin.on("end", () => {
        try {
          const packument = JSON.parse(raw);
          if (!packument.versions || !packument.versions[process.argv[1]]) process.exit(1);
        } catch (err) {
          process.exit(1);
        }
      });
    ' "$version"; then
      echo "registry has ${spec}"
      found=1
      break
    fi
    echo "waiting for ${spec} (${attempt}/30)"
    sleep 10
  done
  if [[ "$found" -ne 1 ]]; then
    echo "timed out waiting for ${spec}" >&2
    exit 1
  fi
done
