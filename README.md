# sudo.supply

Monorepo for the [sudo](https://sudo.supply) macro pad ecosystem.

## Projects

### [`web/`](https://github.com/ibrue/sudo-supply-web) — Storefront

E-commerce storefront built with Next.js 14, Tailwind CSS, Clerk, and Supabase.

### [`app/`](https://github.com/ibrue/sudo-app) — macOS Companion App

Menu bar daemon that translates physical button presses from the sudo macro pad into AI agent actions. Built with Swift/SwiftUI.

### `hardware/` — Hardware Source

Open-source hardware files for the sudo macro pad: RP2040 firmware, PCB schematics, enclosure designs, and build docs.

## Getting started

Clone with submodules:

```bash
git clone --recurse-submodules https://github.com/ibrue/sudo-supply.git
```

Or, if you've already cloned:

```bash
git submodule update --init --recursive
```
