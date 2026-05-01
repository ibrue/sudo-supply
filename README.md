# sudo.supply

Monorepo for the [sudo](https://sudo.supply) macropad ecosystem. Hardware in `hardware/`, macOS app in `app/` (submodule), website in `web/` (submodule), shared design tokens in `packages/`.

## Projects

### [`hardware/firmware/`](hardware/firmware) — CircuitPython firmware

Pure CircuitPython, ~200 lines. Runs on a Raspberry Pi Pico (RP2040) wired to 4 buttons (GP0–GP3) and an under-glow LED on GP24.

- **Transport:** HID keyboard (and HID consumer-control for media keys). No serial protocol — the macOS app catches the keystrokes via a global event tap.
- **Press semantics:** key-down on press, key-up on release. Holding the spacebar button while a YouTube tab is focused engages YouTube's hold-for-2x feature.
- **Defaults:** `Ctrl+Shift+F13/F18/F17/F16` — F14/F15 are intentionally skipped because macOS treats them as display-brightness keys.
- **Per-button modes** read from `/config.json`: `keycombo` (HID keystroke), `mediakey` (consumer-control code), `passthrough` (the F-key passthrough used in dynamic mode).
- **LED:** 120 ms tap on every press, on both GP24 and GP25 under-glow pins. Each is claimed independently inside try/except so a failure to grab GP25 (e.g. CircuitPython holding it for its status indicator) just leaves GP24 lit on its own — the firmware never crashes over an LED.

### [`app/`](https://github.com/ibrue/sudo-app) — macOS Companion App

Menu bar daemon (Swift/SwiftUI, macOS 13+). Two operating modes:

- **dynamic** — auto-switches preset by frontmost-app category (AI tools, browsers, YouTube, Spotify, Fusion 360, etc.); the app dispatches per-app actions in real time.
- **simple** — fixed preset; firmware sends keystrokes natively, pad works without the app running.

Action pipeline for AI-search bindings: AX accessibility tree → System Events / AppleScript → Vision OCR → keyboard fallback for editors.

Highlights:
- Auto-detected categories: AI apps, browsers (with YouTube tab match), media, CAD, video editing, writing, communication, design.
- Built-in presets including a YouTube preset (space / j / l / f) and a Media preset with Spotify's `Opt+Shift+B` "save to liked" shortcut.
- App-specific quirks handled — Fusion 360 save dialog auto-dismisses with `Return`, F14/F15 user bindings auto-migrate to F17/F18.
- Edit-preset wizard (per-button mode + keystroke recorder + name).
- Failure toast surfaces silent no-match presses; menu bar label transient (`[✓ approve]` / `[✗ reject]`) holds 2.5–4 s.
- Embedded firmware — the app writes `code.py` + `config.json` to CIRCUITPY directly on flash; no boot.py, no serial dance.
- CGEvent-tap recovery — listens for `tapDisabledByTimeout` / `tapDisabledByUserInput` and re-enables, fixing the "doesn't work for a few minutes" issue caused by macOS auto-disabling slow taps.

Latest beta: **1.5.1**. See `app/README.md` for the full changelog.

### [`web/`](https://github.com/ibrue/sudo-supply-web) — Storefront

Next.js 14 + Tailwind + Clerk + Supabase. Lives in its own repo as a submodule.

### [`packages/design-tokens/`](packages/design-tokens) — Shared design language

Single source of truth for the design system. Generates:
- `css/tokens.css` — CSS custom properties for the web
- `swift/Theme.swift` — `SudoTheme` enum for the macOS app
- `js/tokens.js` — JS exports for tooling

Edit `tokens.json` → `node packages/design-tokens/build.js` → `./scripts/sync-tokens.sh` to push generated files into submodules.

## Getting started

```bash
git clone --recurse-submodules https://github.com/ibrue/sudo-supply.git
# or, if already cloned:
git submodule update --init --recursive
```

## Design language

Terminal / cyberpunk. Dark only. Sharp corners.

| Token | Value | Purpose |
|-------|-------|---------|
| `--bg` | `#0a0a0a` | Primary background |
| `--accent` | `#00ff41` | Terminal neon green |
| `--text` | `#f0f0f0` | Primary text |
| `--text-muted` | `#666666` | Secondary text |
| `--border` | `#1e1e1e` | Border colour |
| `--error` | `#ff3333` | Error / disconnect |

The macOS app deliberately diverges in its own popover — it uses native SF Pro + system materials there, with `[sudo]` brand-mark and shortcut indicators in mono. The cyberpunk palette stays for the storefront.

## Testing

```bash
./scripts/test-all.sh                  # everything
node packages/design-tokens/test.js    # token consistency (32 tests)
cd web && npm test                     # web (cart, products, design tokens)
cd app/Sudo && swift test              # Swift app (models, theme — macOS only)
```

## Build a beta DMG

On macOS:

```bash
cd app
./build.sh                  # version is read from OTAUpdater.currentVersion
./create-dmg.sh
```

Then tag + GitHub Release on `ibrue/sudo-app` with the DMG attached. The macOS app's OTA updater polls every 4 h and surfaces the **install** banner in its popover.
