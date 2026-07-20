#!/usr/bin/env bash
# Build a Chrome Web Store zip from extension/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(python3 -c "import json; print(json.load(open('$ROOT/extension/manifest.json'))['version'])")"
OUT_DIR="$ROOT/dist"
NAME="x-search-recipes-${VERSION}"
ZIP="$OUT_DIR/${NAME}.zip"

mkdir -p "$OUT_DIR"
rm -f "$ZIP"

# Zip contents at archive root (manifest.json at top level — required by CWS)
(
  cd "$ROOT/extension"
  zip -r -X "$ZIP" . \
    -x "*.DS_Store" \
    -x "**/.DS_Store" \
    -x "**/__MACOSX/**"
)

echo "Packed: $ZIP"
unzip -l "$ZIP" | head -30
echo "Size: $(du -h "$ZIP" | awk '{print $1}')"
