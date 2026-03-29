import Cocoa

/// Detects whether the frontmost application is a supported AI app.
/// For browser-based apps, checks the window title for known domains.
final class AppDetector {

    struct DetectedApp {
        let bundleID: String
        let name: String
        let pid: pid_t
        let isBrowser: Bool
        let matchedDomain: String?
    }

    /// Returns the frontmost supported AI app, or nil if none is active.
    func detectFrontmostApp() -> DetectedApp? {
        guard let frontApp = NSWorkspace.shared.frontmostApplication else {
            return nil
        }

        let bundleID = frontApp.bundleIdentifier ?? ""
        let appName = frontApp.localizedName ?? ""
        let pid = frontApp.processIdentifier

        // Check native AI apps first
        if SupportedApp.nativeBundleIDs.contains(bundleID) {
            return DetectedApp(
                bundleID: bundleID,
                name: appName,
                pid: pid,
                isBrowser: false,
                matchedDomain: nil
            )
        }

        // Check if it's a browser with an AI app tab
        if SupportedApp.browserBundleIDs.contains(bundleID) {
            if let domain = detectAIDomainInBrowser(pid: pid, bundleID: bundleID) {
                return DetectedApp(
                    bundleID: bundleID,
                    name: appName,
                    pid: pid,
                    isBrowser: true,
                    matchedDomain: domain
                )
            }
        }

        return nil
    }

    /// Tries to find an AI domain in the browser's active tab title/URL via AX
    private func detectAIDomainInBrowser(pid: pid_t, bundleID: String) -> String? {
        let appElement = AXUIElementCreateApplication(pid)

        // Get the focused window's title — browsers typically include the domain
        var titleValue: AnyObject?
        guard AXUIElementCopyAttributeValue(appElement, kAXFocusedWindowAttribute as CFString, &titleValue) == .success,
              let focusedWindow = titleValue else {
            return nil
        }

        var windowTitleValue: AnyObject?
        AXUIElementCopyAttributeValue(focusedWindow as! AXUIElement, kAXTitleAttribute as CFString, &windowTitleValue)
        let windowTitle = (windowTitleValue as? String)?.lowercased() ?? ""

        // Also try to get the URL bar value for more reliable detection
        let urlBarText = getURLBarText(appElement: appElement)?.lowercased() ?? ""

        let textToSearch = windowTitle + " " + urlBarText

        for domain in SupportedApp.webDomains {
            if textToSearch.contains(domain) {
                return domain
            }
        }

        return nil
    }

    /// Attempts to read the browser URL bar via accessibility tree
    private func getURLBarText(appElement: AXUIElement) -> String? {
        // Try to find a text field with role "AXTextField" that looks like a URL bar
        var focusedWindow: AnyObject?
        guard AXUIElementCopyAttributeValue(appElement, kAXFocusedWindowAttribute as CFString, &focusedWindow) == .success else {
            return nil
        }

        // Search for URL bar (usually an AXTextField or AXComboBox)
        return findURLField(in: focusedWindow as! AXUIElement, depth: 0, maxDepth: 6)
    }

    private func findURLField(in element: AXUIElement, depth: Int, maxDepth: Int) -> String? {
        guard depth < maxDepth else { return nil }

        var role: AnyObject?
        AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &role)
        let roleStr = role as? String ?? ""

        if roleStr == "AXTextField" || roleStr == "AXComboBox" {
            var value: AnyObject?
            AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &value)
            if let text = value as? String,
               (text.contains(".com") || text.contains(".ai") || text.contains("http")) {
                return text
            }
        }

        // Recurse into children
        var children: AnyObject?
        guard AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &children) == .success,
              let childArray = children as? [AXUIElement] else {
            return nil
        }

        for child in childArray.prefix(20) { // limit breadth to avoid perf issues
            if let result = findURLField(in: child, depth: depth + 1, maxDepth: maxDepth) {
                return result
            }
        }

        return nil
    }
}
