# sudo.supply — Monorepo

## Structure
- `web/` — submodule → ibrue/sudo-supply-web (Next.js 14, Tailwind, Clerk, Supabase)
- `app/` — submodule → ibrue/sudo-app (Swift/SwiftUI macOS menu bar app)
- `hardware/` — hardware source files (firmware, PCB, case, docs) — placeholder for now
- `packages/design-tokens/` — shared design language (source of truth)

## Design Token System

**Source of truth:** `packages/design-tokens/tokens.json`

Run `node packages/design-tokens/build.js` to regenerate:
- `css/tokens.css` — CSS variables for web
- `swift/Theme.swift` — `SudoTheme` enum for Swift app
- `js/tokens.js` — JS exports

Run `./scripts/sync-tokens.sh` to copy generated files into submodules.

**IMPORTANT:** When adding new colors or tokens:
1. Edit `tokens.json`
2. Run `build.js`
3. Run `test.js` to validate
4. Run `sync-tokens.sh` to push to submodules
5. The Swift app uses `SudoTheme.accent`, `SudoTheme.bg`, etc. instead of hardcoded hex

## Resolved Issues

### App build error: `.onAppear` on Scene — FIXED
Moved `.onAppear` from Scene to MenuBarView content closure. Removed unused `.onChange`.

### App design sync — FIXED
MenuBarView.swift now uses `SudoTheme` enum with all design tokens from the website. No more hardcoded hex values.

## Pending Work

### 1. Hardware directory
`hardware/` has placeholder structure. Needs actual firmware (RP2040), PCB files, case designs, and docs.

### 2. Website updates
Keep website in sync with app features. When new app features are added, update the download page and relevant website sections.

### 3. Beta release
Build beta DMG on macOS:
```bash
cd app && ./build.sh && ./create-dmg.sh
```
Then create a GitHub Release tagged `v1.1.0-beta`.

## Testing

```bash
./scripts/test-all.sh          # Run everything
node packages/design-tokens/test.js  # Token consistency (32 tests)
cd web && npm test             # Web tests (20 tests: cart, products, design tokens)
cd app/Sudo && swift test      # Swift tests (models, theme — macOS only)
```

## Design Language (from website — this is the standard)
- Dark terminal/cyberpunk aesthetic
- Font: Geist Mono (body), Pixelated Elegance (logo/hero)
- No border-radius anywhere (sharp corners)
- Navigation uses file paths: `~/shop`, `~/about`, `~/download`
- Buttons: `btn-terminal` (bordered, uppercase, tracking) and `btn-terminal-accent` (accent border + fill)
- Section headers: `> section_name` terminal prompt style
- Status indicators: `●` filled / `○` empty
- Background: #0a0a0a, Accent: #00ff41 (neon green)

## Colors
| Token | Value | CSS Variable |
|-------|-------|-------------|
| bg | #0a0a0a | `--bg` |
| bg-secondary | #111111 | `--bg-secondary` |
| text | #f0f0f0 | `--text` |
| text-muted | #666666 | `--text-muted` |
| accent | #00ff41 | `--accent` |
| accent-dim | #00ff4120 | `--accent-dim` |
| border | #1e1e1e | `--border` |
| error | #ff3333 | `--error` |
| surface | #333333 | `--surface` |
