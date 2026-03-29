# SudoPad — macOS Companion App

Menu bar daemon for the [sudo macro pad](https://sudo.supply). Translates physical button presses into AI agent actions.

## How it works

1. **Hotkey interception** — Listens for `Ctrl+Shift+F13–F16` sent by the RP2040 macro pad
2. **App detection** — Identifies the frontmost AI app (Claude, ChatGPT, Grok) via bundle ID or browser tab
3. **Button discovery** — Searches for approve/reject buttons using:
   - **Primary:** macOS Accessibility tree (`AXUIElement`) — fast, precise
   - **Fallback:** Vision OCR — captures window screenshot, runs on-device text recognition
4. **Action execution** — Presses the button via `AXUIElement.performAction` (no synthetic input)

## Requirements

- macOS 13 Ventura or later
- Accessibility permission (System Settings → Privacy & Security → Accessibility)
- Screen Recording permission (for OCR fallback)

## Build

```bash
cd sudopad-app/SudoPad
swift build -c release
```

The binary will be at `.build/release/SudoPad`.

## Anti-cheat compatibility

SudoPad uses the official macOS Accessibility API — the same interface used by VoiceOver, screen readers, and Apple's own Shortcuts app. It does **not** inject synthetic HID events or patch application memory. This makes it fully compatible with application integrity checks.

## Button mapping

| Button | Hotkey | Default Action |
|--------|--------|---------------|
| 1 | `Ctrl+Shift+F13` | Approve / Yes |
| 2 | `Ctrl+Shift+F14` | Reject / No |
| 3 | `Ctrl+Shift+F15` | Action 3 (Continue) |
| 4 | `Ctrl+Shift+F16` | Action 4 (Stop) |
