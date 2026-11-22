#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${VERSION:-}" || -z "${CORE_PACKAGE:-}" || -z "${CLI_PACKAGE:-}" || -z "${TUI_PACKAGE:-}" || -z "${GITHUB_SHA:-}" ]]; then
  echo "VERSION, CORE_PACKAGE, CLI_PACKAGE, TUI_PACKAGE, and GITHUB_SHA are required" >&2
  exit 1
fi

tag="v${VERSION}"
shopt -s nullglob
assets=(release-assets/*)
if [[ ${#assets[@]} -eq 0 ]]; then
  echo "No desktop installers to publish" >&2
  exit 1
fi

notes=$(mktemp)
cat > "$notes" <<EOF
## Packages

- [\`${CORE_PACKAGE}@${VERSION}\`](https://www.npmjs.com/package/${CORE_PACKAGE}/v/${VERSION})
- [\`${CLI_PACKAGE}@${VERSION}\`](https://www.npmjs.com/package/${CLI_PACKAGE}/v/${VERSION})
- [\`${TUI_PACKAGE}@${VERSION}\`](https://www.npmjs.com/package/${TUI_PACKAGE}/v/${VERSION})

Desktop installers for Linux, macOS, and Windows are built from the published \`${CORE_PACKAGE}@${VERSION}\` package. The desktop jobs start only after \`${CLI_PACKAGE}@${VERSION}\` is on the registry and \`halstead\` runs against that release.

The terminal UI is \`${TUI_PACKAGE}@${VERSION}\`. Install it with \`npm install -g ${TUI_PACKAGE}\` and run \`halstead-tui\`.
EOF

if gh release view "$tag" >/dev/null 2>&1; then
  gh release upload "$tag" "${assets[@]}" --clobber
  gh release edit "$tag" --notes-file "$notes"
else
  gh release create "$tag" "${assets[@]}" --target "$GITHUB_SHA" --title "$tag" --notes-file "$notes"
fi
