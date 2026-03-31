# sudo.supply

Monorepo for the [sudo](https://sudo.supply) macro pad ecosystem.

## Projects

### [`web/`](https://github.com/ibrue/sudo-supply-web) — Storefront

E-commerce storefront built with Next.js 14, Tailwind CSS, Clerk, and Supabase.

### [`app/`](https://github.com/ibrue/sudo-app) — macOS Companion App

Menu bar daemon that translates physical button presses from the sudo macro pad into AI agent actions. Built with Swift/SwiftUI. Features include:
- Menu bar daemon with animated status (`[sudo]`, `[····]`, `[okay]`, `[fail]`)
- 3-strategy button finding: AX accessibility tree → Vision OCR → keyboard fallback
- Detects AI apps: Claude, ChatGPT, VS Code, Cursor, Windsurf, terminals (iTerm2, Warp, Ghostty, etc.), browsers (Safari, Chrome, Firefox, etc.)
- Action modes: AI search (default), keyboard shortcuts, media keys, macro sequences
- Quick presets: AI Agent, Plan Mode, Claude Code, System Shortcuts, Media Controls, Web Browsing, Discord Soundboard
- Per-app profiles with auto-switching and button remapping
- Auto-approve rules engine with safety exclusions and context preview
- MCP server mode (POST /mcp/request-approval blocks until physical button press)
- Local developer API on port 7483 with webhooks
- Plugin system (drop .json files in ~/Library/Application Support/Sudo/Plugins/)
- LED feedback protocol for RP2040 USB serial
- Usage streaks, gamification, anonymous telemetry (opt-in) with public analytics dashboard
- Action history log, bug reporting from menu bar, OTA updates from GitHub Releases
- Sound feedback, launch at login, auto-retry permission checker, 100ms debounce

### `hardware/` — Hardware Source

Open-source hardware files for the sudo macro pad: RP2040 firmware, PCB schematics, enclosure designs, and build docs.

### `packages/design-tokens/` — Shared Design Language

Single source of truth for the sudo.supply design system. Generates platform-specific outputs:
- `css/tokens.css` — CSS custom properties for the web
- `swift/Theme.swift` — SwiftUI `SudoTheme` enum for the macOS app
- `js/tokens.js` — JavaScript exports for tooling

## Getting started

Clone with submodules:

```bash
git clone --recurse-submodules https://github.com/ibrue/sudo-supply.git
```

Or, if you've already cloned:

```bash
git submodule update --init --recursive
```

## Design Language

Terminal/cyberpunk aesthetic. Dark theme only. Sharp corners everywhere.

| Token | Value | Purpose |
|-------|-------|---------|
| `--bg` | `#0a0a0a` | Primary background |
| `--accent` | `#00ff41` | Terminal neon green |
| `--text` | `#f0f0f0` | Primary text |
| `--text-muted` | `#666666` | Secondary text |
| `--border` | `#1e1e1e` | Border color |
| `--error` | `#ff3333` | Error/disconnect |

Edit `packages/design-tokens/tokens.json` and run `node packages/design-tokens/build.js` to regenerate all platform files. Then sync to submodules with `./scripts/sync-tokens.sh`.

## Testing

```bash
# All tests
./scripts/test-all.sh

# Design tokens only
node packages/design-tokens/test.js

# Web only
cd web && npm test

# App only (macOS)
cd app/Sudo && swift test
```
