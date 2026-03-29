import SwiftUI
import Cocoa

/// SudoPad — macOS menu bar daemon for the sudo macro pad.
///
/// Listens for Ctrl+Shift+F13–F16 hotkeys from the RP2040 macro pad
/// and translates them into approve/reject actions on AI apps.
///
/// Detection: AX accessibility tree (primary) + Vision OCR (fallback)
/// Execution: AXUIElement.performAction (preferred) → CGEvent click (fallback)
///
/// Requires: Accessibility permission in System Settings
@main
struct SudoPadApp: App {
    @StateObject private var engine = SudoPadEngine()

    var body: some Scene {
        MenuBarExtra {
            MenuBarView(engine: engine)
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "keyboard.badge.ellipsis")
                Text("[sudo]")
                    .font(.system(size: 10, design: .monospaced))
            }
        }
        .menuBarExtraStyle(.window)
        .onChange(of: engine.isConnected) { _, _ in }
        .onAppear {
            engine.start()
            checkAccessibilityPermission()
        }
    }

    private func checkAccessibilityPermission() {
        let trusted = AXIsProcessTrusted()
        if !trusted {
            print("[SudoPad] ⚠ Accessibility permission not granted.")
            print("[SudoPad]   System Settings → Privacy & Security → Accessibility → Enable SudoPad")

            // Prompt the system dialog
            let options = [kAXTrustedCheckOptionPrompt.takeRetainedValue(): true] as CFDictionary
            AXIsProcessTrustedWithOptions(options)
        } else {
            print("[SudoPad] ✓ Accessibility permission granted")
        }
    }
}
