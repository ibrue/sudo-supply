#!/bin/bash
set -euo pipefail

# =============================================================================
# split-repos.sh — Split sudo-supply monorepo into two separate repos
#
# Creates:
#   ../sudo-supply-web/  — Next.js storefront
#   ../sudo-app/         — macOS companion app
#
# Prerequisites:
#   - gh CLI authenticated (for repo creation)
#   - Run from the root of the sudo-supply monorepo
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GITHUB_USER="ibrue"

echo ""
echo "  ┌─────────────────────────────────────┐"
echo "  │  [sudo] repo splitter               │"
echo "  └─────────────────────────────────────┘"
echo ""

# --- 1. Create GitHub repos ---
echo "[1/6] Creating GitHub repositories..."

gh repo create "$GITHUB_USER/sudo-supply-web" \
  --public \
  --description "sudo.supply — e-commerce storefront. Next.js 14, Tailwind, Clerk, Shopify, Supabase." \
  2>/dev/null || echo "  sudo-supply-web already exists, skipping"

gh repo create "$GITHUB_USER/sudo-app" \
  --public \
  --description "[sudo] — macOS companion app for the sudo macro pad. Swift/SwiftUI." \
  2>/dev/null || echo "  sudo-app already exists, skipping"

# --- 2. Prepare website repo ---
echo "[2/6] Preparing sudo-supply-web..."

WEB_DIR="$SCRIPT_DIR/../sudo-supply-web"
rm -rf "$WEB_DIR"
mkdir -p "$WEB_DIR"

# Copy website files
cp "$SCRIPT_DIR"/.env.example "$WEB_DIR/"
cp "$SCRIPT_DIR"/.eslintrc.json "$WEB_DIR/"
cp "$SCRIPT_DIR"/.gitignore "$WEB_DIR/"
cp "$SCRIPT_DIR"/next.config.mjs "$WEB_DIR/"
cp "$SCRIPT_DIR"/package.json "$WEB_DIR/"
cp "$SCRIPT_DIR"/package-lock.json "$WEB_DIR/"
cp "$SCRIPT_DIR"/postcss.config.mjs "$WEB_DIR/"
cp "$SCRIPT_DIR"/tailwind.config.ts "$WEB_DIR/"
cp "$SCRIPT_DIR"/tsconfig.json "$WEB_DIR/"
cp -r "$SCRIPT_DIR"/src "$WEB_DIR/"
cp -r "$SCRIPT_DIR"/public "$WEB_DIR/"
cp -r "$SCRIPT_DIR"/supabase "$WEB_DIR/"

# --- 3. Prepare app repo ---
echo "[3/6] Preparing sudo-app..."

APP_DIR="$SCRIPT_DIR/../sudo-app"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"

# Copy app files (flatten from sudopad-app/)
cp "$SCRIPT_DIR"/sudopad-app/README.md "$APP_DIR/"
cp "$SCRIPT_DIR"/sudopad-app/build.sh "$APP_DIR/"
cp "$SCRIPT_DIR"/sudopad-app/create-dmg.sh "$APP_DIR/"
cp "$SCRIPT_DIR"/sudopad-app/install.sh "$APP_DIR/"
cp -r "$SCRIPT_DIR"/sudopad-app/Sudo "$APP_DIR/"
cp "$SCRIPT_DIR"/public/images/logo.svg "$APP_DIR/Sudo/AppIcon.svg"

# Create .gitignore for app repo
cat > "$APP_DIR/.gitignore" << 'GITIGNORE'
.DS_Store
.build/
dist/
*.dmg
GITIGNORE

# --- 4. Initialize and push website repo ---
echo "[4/6] Pushing sudo-supply-web..."

cd "$WEB_DIR"
git init -b main
git add -A
git commit -m "feat: sudo.supply e-commerce storefront

Next.js 14 + Tailwind CSS storefront for the [sudo] macro pad.
Clerk auth, Shopify checkout, Supabase order tracking.
Terminal brutalism aesthetic with pixel font + monospace."

git remote add origin "https://github.com/$GITHUB_USER/sudo-supply-web.git"
git push -u origin main --force

# --- 5. Initialize and push app repo ---
echo "[5/6] Pushing sudo-app..."

cd "$APP_DIR"
git init -b main
git add -A
git commit -m "feat: [sudo] macOS companion app

Swift/SwiftUI menu bar daemon for the sudo macro pad.
Dual detection (AX tree + Vision OCR), OTA updater via GitHub Releases.
Anti-cheat safe — uses AXUIElement.performAction, no synthetic input."

git remote add origin "https://github.com/$GITHUB_USER/sudo-app.git"
git push -u origin main --force

# --- 6. Done ---
echo ""
echo "[6/6] Done!"
echo ""
echo "  Repos created:"
echo "    https://github.com/$GITHUB_USER/sudo-supply-web"
echo "    https://github.com/$GITHUB_USER/sudo-app"
echo ""
echo "  Next steps:"
echo "    1. cd ../sudo-supply-web && npm install"
echo "    2. Copy .env.local with your Clerk/Shopify/Supabase keys"
echo "    3. cd ../sudo-app && ./build.sh"
echo ""
