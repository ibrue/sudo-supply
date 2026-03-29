#!/bin/bash
set -euo pipefail

echo "[sudo] Building SudoPad..."
cd "$(dirname "$0")/SudoPad"

swift build -c release 2>&1

BINARY=".build/release/SudoPad"

if [ -f "$BINARY" ]; then
    echo ""
    echo "[sudo] Build successful: $BINARY"
    echo "[sudo] To run: $BINARY"
    echo "[sudo] Grant Accessibility permission when prompted."
else
    echo "[sudo] Build failed."
    exit 1
fi
