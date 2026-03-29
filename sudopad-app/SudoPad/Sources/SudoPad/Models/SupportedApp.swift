import Foundation

/// AI applications the daemon knows how to interact with
enum SupportedApp: String, CaseIterable {
    case claude     = "com.anthropic.claudefordesktop"
    case claudeWeb  = "claude.ai"
    case chatgpt    = "com.openai.chat"
    case chatgptWeb = "chatgpt.com"
    case grok       = "grok.com"

    /// Bundle IDs for native apps
    static let nativeBundleIDs: Set<String> = [
        "com.anthropic.claudefordesktop",
        "com.openai.chat",
    ]

    /// Domains for web-based AI apps (running in browser)
    static let webDomains: [String] = [
        "claude.ai",
        "chatgpt.com",
        "grok.com",
        "chat.openai.com",
    ]

    /// All known browser bundle IDs
    static let browserBundleIDs: Set<String> = [
        "com.apple.Safari",
        "com.google.Chrome",
        "org.mozilla.firefox",
        "com.brave.Browser",
        "com.microsoft.edgemac",
        "company.thebrowser.Browser",  // Arc
        "com.operasoftware.Opera",
    ]

    var displayName: String {
        switch self {
        case .claude, .claudeWeb:   return "Claude"
        case .chatgpt, .chatgptWeb: return "ChatGPT"
        case .grok:                 return "Grok"
        }
    }
}
