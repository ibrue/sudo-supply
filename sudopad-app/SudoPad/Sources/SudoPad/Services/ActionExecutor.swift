import Cocoa

/// Executes the found action — either via AX press or by clicking a screen point.
///
/// Strategy:
/// 1. AX tree result → use AXUIElementPerformAction (preferred, no pointer movement)
/// 2. OCR result → use AXUIElement at point, or fall back to CGEvent click
///
/// AXUIElementPerformAction is the gold standard for anti-cheat compatibility.
/// It operates through the accessibility subsystem, not through synthetic HID events.
/// Screen readers and assistive tech use this exact same path.
final class ActionExecutor {

    enum ExecutionResult {
        case success(method: String)
        case failure(reason: String)
    }

    /// Execute an action from an AX tree search result
    func execute(result: ActionResult) -> ExecutionResult {
        switch result {
        case .found(let element, _):
            return performAXPress(element: element)

        case .foundOCR(let point, _):
            return performClickAtPoint(point)

        case .notFound(let reason):
            return .failure(reason: reason)
        }
    }

    /// Press a button via the Accessibility API — no synthetic input
    private func performAXPress(element: AXUIElement) -> ExecutionResult {
        // Try AXPress first
        let pressResult = AXUIElementPerformAction(element, "AXPress" as CFString)
        if pressResult == .success {
            return .success(method: "AXPress")
        }

        // Try AXConfirm as fallback
        let confirmResult = AXUIElementPerformAction(element, "AXConfirm" as CFString)
        if confirmResult == .success {
            return .success(method: "AXConfirm")
        }

        // Try AXShowMenu → navigate — last resort for some web elements
        let showMenuResult = AXUIElementPerformAction(element, "AXShowDefaultUI" as CFString)
        if showMenuResult == .success {
            return .success(method: "AXShowDefaultUI")
        }

        return .failure(reason: "AXPress failed with error: \(pressResult.rawValue)")
    }

    /// Click at a screen coordinate — used for OCR fallback.
    /// Uses CGEvent which goes through the standard HID path.
    /// This is the same as a real mouse click from the OS perspective.
    private func performClickAtPoint(_ point: CGPoint) -> ExecutionResult {
        // First try to find an AX element at this point and use AXPress
        let systemWide = AXUIElementCreateSystemWide()
        var elementAtPoint: AXUIElement?
        let hitTestResult = AXUIElementCopyElementAtPosition(systemWide, Float(point.x), Float(point.y), &elementAtPoint)

        if hitTestResult == .success, let element = elementAtPoint {
            let pressResult = AXUIElementPerformAction(element, "AXPress" as CFString)
            if pressResult == .success {
                return .success(method: "AXPress (via hit test)")
            }
        }

        // Last resort: synthetic click via CGEvent
        // This is standard macOS API, same as what AppleScript "click" uses
        let mouseDown = CGEvent(
            mouseEventSource: nil,
            mouseType: .leftMouseDown,
            mouseCursorPosition: point,
            mouseButton: .left
        )
        let mouseUp = CGEvent(
            mouseEventSource: nil,
            mouseType: .leftMouseUp,
            mouseCursorPosition: point,
            mouseButton: .left
        )

        mouseDown?.post(tap: .cghidEventTap)
        usleep(50_000) // 50ms between down and up
        mouseUp?.post(tap: .cghidEventTap)

        return .success(method: "CGEvent click at (\(Int(point.x)), \(Int(point.y)))")
    }
}
