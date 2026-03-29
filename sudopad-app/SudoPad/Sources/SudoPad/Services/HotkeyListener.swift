import Cocoa
import Carbon

/// Listens for global Ctrl+Shift+F13–F16 hotkey events from the macro pad.
/// Uses CGEvent tap which is the standard macOS approach — fully compatible
/// with accessibility frameworks and does not trigger anti-cheat detection.
final class HotkeyListener {
    typealias ActionHandler = (PadAction) -> Void

    private var eventTap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var handler: ActionHandler?

    /// Required modifier flags: Control + Shift
    private static let requiredModifiers: CGEventFlags = [.maskControl, .maskShift]

    /// Map of keyCode → PadAction
    private static let keyMap: [UInt16: PadAction] = {
        var map = [UInt16: PadAction]()
        for action in PadAction.allCases {
            map[action.keyCode] = action
        }
        return map
    }()

    func start(handler: @escaping ActionHandler) {
        self.handler = handler

        let eventMask: CGEventMask = (1 << CGEventType.keyDown.rawValue)

        // Store self in a pointer so the C callback can reach us
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()

        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: eventMask,
            callback: { _, _, event, userInfo in
                guard let userInfo = userInfo else { return Unmanaged.passUnretained(event) }
                let listener = Unmanaged<HotkeyListener>.fromOpaque(userInfo).takeUnretainedValue()
                return listener.handleEvent(event)
            },
            userInfo: selfPtr
        ) else {
            print("[SudoPad] ERROR: Failed to create event tap.")
            print("[SudoPad] Grant Accessibility permission in System Settings → Privacy & Security → Accessibility")
            return
        }

        eventTap = tap
        runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)

        print("[SudoPad] Hotkey listener active — waiting for macro pad input")
    }

    func stop() {
        if let tap = eventTap {
            CGEvent.tapEnable(tap: tap, enable: false)
        }
        if let source = runLoopSource {
            CFRunLoopRemoveSource(CFRunLoopGetCurrent(), source, .commonModes)
        }
        eventTap = nil
        runLoopSource = nil
        handler = nil
    }

    private func handleEvent(_ event: CGEvent) -> Unmanaged<CGEvent>? {
        let keyCode = UInt16(event.getIntegerValueField(.keyboardEventKeycode))
        let flags = event.flags

        // Check for Ctrl+Shift
        let hasCtrl = flags.contains(.maskControl)
        let hasShift = flags.contains(.maskShift)

        guard hasCtrl, hasShift, let action = Self.keyMap[keyCode] else {
            // Not our hotkey — pass through
            return Unmanaged.passUnretained(event)
        }

        print("[SudoPad] Received: \(action.displayName) (F\(keyCode == 105 ? 13 : keyCode == 107 ? 14 : keyCode == 113 ? 15 : 16))")

        // Dispatch on main thread
        DispatchQueue.main.async { [weak self] in
            self?.handler?(action)
        }

        // Consume the event so it doesn't propagate
        return nil
    }
}
