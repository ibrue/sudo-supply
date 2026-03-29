#!/bin/bash
# Run all tests across the sudo.supply ecosystem
set -e

echo "============================================"
echo "  sudo.supply — Full Test Suite"
echo "============================================"
echo ""

# 1. Design token consistency
echo "[1/3] Design Tokens"
echo "---"
node packages/design-tokens/build.js
node packages/design-tokens/test.js
echo ""

# 2. Web tests (if node_modules exist)
echo "[2/3] Web Tests (sudo-supply-web)"
echo "---"
if [ -d "web/node_modules" ]; then
  cd web && npx vitest run && cd ..
else
  echo "⚠ Skipped: run 'cd web && npm install' first"
fi
echo ""

# 3. Swift tests (macOS only)
echo "[3/3] App Tests (sudo-app)"
echo "---"
if command -v swift &> /dev/null; then
  cd app/Sudo && swift test && cd ../..
else
  echo "⚠ Skipped: Swift not available (macOS only)"
fi

echo ""
echo "============================================"
echo "  All tests complete"
echo "============================================"
