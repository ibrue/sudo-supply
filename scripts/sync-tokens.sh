#!/bin/bash
# Sync design tokens to submodule projects
# Run from the root of sudo-supply

set -e

echo "Building design tokens..."
node packages/design-tokens/build.js

echo "Running token tests..."
node packages/design-tokens/test.js

# Sync Swift theme to app
if [ -d "app/Sudo/Sources/Sudo" ]; then
  cp packages/design-tokens/swift/Theme.swift app/Sudo/Sources/Sudo/Views/Theme.swift
  echo "✓ Synced Theme.swift → app/Sudo/Sources/Sudo/Views/Theme.swift"
fi

# Sync CSS tokens to web (for reference — web uses globals.css directly)
if [ -d "web/src" ]; then
  cp packages/design-tokens/css/tokens.css web/src/app/tokens.css
  echo "✓ Synced tokens.css → web/src/app/tokens.css"
fi

echo ""
echo "Done! Token sync complete."
echo "Remember to commit changes in each submodule separately."
