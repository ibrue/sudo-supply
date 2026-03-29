# sudo.supply — Monorepo

## Structure
- `web/` — submodule → ibrue/sudo-supply-web (Next.js 14, Tailwind, Clerk, Supabase)
- `app/` — submodule → ibrue/sudo-app (Swift/SwiftUI macOS menu bar app)
- `hardware/` — hardware source files (firmware, PCB, case, docs) — placeholder for now

## Known Issues

### App build error: `.onAppear` on Scene (MUST FIX FIRST)
`SudoApp.swift` has `.onAppear` on the `Scene` which doesn't compile. Fix: move `.onAppear` onto `MenuBarView` inside the `MenuBarExtra` content closure. Replace the `body` in `Sudo/Sources/Sudo/SudoApp.swift` with:

```swift
    var body: some Scene {
        MenuBarExtra {
            MenuBarView(engine: engine, updater: updater)
                .onAppear {
                    engine.start()
                    updater.startPeriodicChecks()
                    checkAccessibilityPermission()
                }
        } label: {
            Text("[sudo]")
                .font(.system(size: 9, weight: .medium, design: .monospaced))
        }
        .menuBarExtraStyle(.window)
    }
```

Also remove the `.onChange(of: engine.isConnected) { _, _ in }` line (unused).

## Pending Work

### 1. App design sync with website
MenuBarView.swift needs design tokens synced with the website's CSS variables:
- `--bg: #0a0a0a`, `--bg-secondary: #111111`, `--text: #f0f0f0`
- `--text-muted: #666666`, `--accent: #00ff41`, `--accent-dim: #00ff4120`
- `--border: #1e1e1e`, `--error: #ff3333`
- Buttons should use bracketed terminal style: `[ ACTION ]` with border, uppercase, tracking
- Section headers should use terminal prompt style: `> section_name`
- Use named Color extensions (e.g. `Color.sudoAccent`) instead of inline `Color(hex:)`

### 2. Hardware directory
`hardware/` has placeholder structure. Needs actual firmware (RP2040), PCB files, case designs, and docs.

### 3. Website updates
User wants to update the website with new features (specifics TBD).

### 4. Beta release
User wants a beta DMG release for testing. Requires building on macOS:
```bash
cd app && ./build.sh && ./create-dmg.sh
```
Then create a GitHub Release tagged `v1.1.0-beta`.

## GitHub Access Note
This session can only push to `ibrue/sudo-supply`. To push to `ibrue/sudo-app` or `ibrue/sudo-supply-web`, either:
- Push from a local Mac terminal
- Or configure GitHub MCP access for those repos

## Design Language (from website)
- Dark terminal/cyberpunk aesthetic
- Font: Geist Mono (body), Pixelated Elegance (logo/hero)
- No border-radius anywhere (sharp corners)
- Navigation uses file paths: `~/shop`, `~/about`, `~/download`
- Buttons: `btn-terminal` (bordered, uppercase, tracking) and `btn-terminal-accent` (accent border + fill)
- Section headers: `> section_name` terminal prompt style
- Status indicators: `●` filled / `○` empty
- Background: #0a0a0a, Accent: #00ff41 (neon green)
