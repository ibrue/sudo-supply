import Cocoa

/// Primary detection method: walks the accessibility tree of the frontmost app
/// to find buttons matching the target action's search terms.
///
/// Uses AXUIElement APIs — the standard macOS accessibility interface.
/// This is the same API used by VoiceOver, screen readers, and automation tools.
/// Fully sanctioned by Apple, no synthetic input injection.
final class AXButtonFinder {

    /// Search the AX tree of the given PID for a button matching the action
    func findButton(for action: PadAction, pid: pid_t) -> ActionResult {
        let appElement = AXUIElementCreateApplication(pid)

        // Get all windows
        var windowsValue: AnyObject?
        guard AXUIElementCopyAttributeValue(appElement, kAXWindowsAttribute as CFString, &windowsValue) == .success,
              let windows = windowsValue as? [AXUIElement] else {
            return .notFound(reason: "Could not access app windows")
        }

        let searchTerms = action.searchTerms.map { $0.lowercased() }

        // Search focused window first, then others
        var focusedWindow: AnyObject?
        AXUIElementCopyAttributeValue(appElement, kAXFocusedWindowAttribute as CFString, &focusedWindow)

        var orderedWindows = windows
        if let focused = focusedWindow as! AXUIElement? {
            // Move focused window to front of search
            orderedWindows.insert(focused, at: 0)
        }

        for window in orderedWindows {
            if let element = searchTree(element: window, searchTerms: searchTerms, depth: 0) {
                return .found(element: element, method: .accessibilityTree)
            }
        }

        return .notFound(reason: "No matching button found in AX tree")
    }

    /// Recursively search the AX tree for a clickable element with matching text
    private func searchTree(element: AXUIElement, searchTerms: [String], depth: Int) -> AXUIElement? {
        guard depth < 15 else { return nil } // prevent infinite recursion

        // Check if this element is a button or clickable
        var role: AnyObject?
        AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &role)
        let roleStr = role as? String ?? ""

        let clickableRoles: Set<String> = [
            "AXButton", "AXLink", "AXMenuItem", "AXMenuButton",
            "AXStaticText", "AXGroup", "AXCell",
        ]

        if clickableRoles.contains(roleStr) || hasClickAction(element) {
            if let title = getElementText(element), matchesSearchTerms(title, terms: searchTerms) {
                // Verify element is visible and enabled
                if isElementActionable(element) {
                    return element
                }
            }
        }

        // For groups/containers, also check if the combined text of children matches
        if roleStr == "AXGroup" || roleStr == "AXCell" {
            let combinedText = getCombinedChildText(element, maxDepth: 2)
            if let text = combinedText, matchesSearchTerms(text, terms: searchTerms) {
                if hasClickAction(element) && isElementActionable(element) {
                    return element
                }
            }
        }

        // Recurse into children
        var children: AnyObject?
        guard AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &children) == .success,
              let childArray = children as? [AXUIElement] else {
            return nil
        }

        for child in childArray {
            if let found = searchTree(element: child, searchTerms: searchTerms, depth: depth + 1) {
                return found
            }
        }

        return nil
    }

    /// Get the text content of an AX element (title, value, description)
    private func getElementText(_ element: AXUIElement) -> String? {
        let attributes: [String] = [
            kAXTitleAttribute as String,
            kAXValueAttribute as String,
            kAXDescriptionAttribute as String,
            kAXLabelValueAttribute as String,
        ]

        var parts: [String] = []
        for attr in attributes {
            var value: AnyObject?
            if AXUIElementCopyAttributeValue(element, attr as CFString, &value) == .success,
               let str = value as? String, !str.isEmpty {
                parts.append(str)
            }
        }

        return parts.isEmpty ? nil : parts.joined(separator: " ")
    }

    /// Get combined text from shallow children (for button groups with labels inside)
    private func getCombinedChildText(_ element: AXUIElement, maxDepth: Int) -> String? {
        guard maxDepth > 0 else { return getElementText(element) }

        var children: AnyObject?
        guard AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &children) == .success,
              let childArray = children as? [AXUIElement] else {
            return getElementText(element)
        }

        var parts: [String] = []
        if let text = getElementText(element) {
            parts.append(text)
        }
        for child in childArray.prefix(10) {
            if let text = getCombinedChildText(child, maxDepth: maxDepth - 1) {
                parts.append(text)
            }
        }

        return parts.isEmpty ? nil : parts.joined(separator: " ")
    }

    /// Check if text matches any search term
    private func matchesSearchTerms(_ text: String, terms: [String]) -> Bool {
        let lower = text.lowercased().trimmingCharacters(in: .whitespaces)
        return terms.contains { term in
            // Exact match or the element text contains the term as a word
            lower == term || lower.contains(term)
        }
    }

    /// Check if the element supports AXPress action
    private func hasClickAction(_ element: AXUIElement) -> Bool {
        var actions: AnyObject?
        guard AXUIElementCopyAttributeValue(element, "AXActionNames" as CFString, &actions) == .success,
              let actionArray = actions as? [String] else {
            // Elements without explicit actions might still be clickable
            // (e.g., web content buttons)
            return true
        }
        return actionArray.contains("AXPress") || actionArray.contains("AXConfirm")
    }

    /// Check element is visible and enabled
    private func isElementActionable(_ element: AXUIElement) -> Bool {
        // Check enabled
        var enabled: AnyObject?
        if AXUIElementCopyAttributeValue(element, kAXEnabledAttribute as CFString, &enabled) == .success,
           let isEnabled = enabled as? Bool, !isEnabled {
            return false
        }

        // Check it has a position (is on screen)
        var position: AnyObject?
        if AXUIElementCopyAttributeValue(element, kAXPositionAttribute as CFString, &position) == .success {
            return true
        }

        // If we can't determine position, still try (web elements may not report position)
        return true
    }
}
