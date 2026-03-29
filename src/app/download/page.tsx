import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "download — sudo.supply",
};

export default function DownloadPage() {
  return (
    <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
      <p className="text-text-muted text-sm mb-8 animate-fade-in">~/download</p>

      <div className="space-y-10 animate-fade-in-delay">
        {/* Hero */}
        <section>
          <h1 className="font-pixel text-lg text-accent mb-4">[sudo] pad</h1>
          <p className="text-text-muted text-sm leading-relaxed">
            Menu bar companion app for the sudo macro pad. Translates your
            physical button presses into approve/reject actions on Claude,
            ChatGPT, and Grok.
          </p>
        </section>

        {/* Download */}
        <section className="border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-pixel text-xs mb-1">macOS</h2>
              <span className="text-text-muted text-xs">
                ventura 13.0+ &middot; apple silicon + intel
              </span>
            </div>
            <span className="text-accent text-xs">v1.0.0</span>
          </div>
          <a
            href="https://github.com/ibrue/sudo-supply/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-terminal-accent block text-center"
          >
            [ DOWNLOAD FOR MACOS ]
          </a>
          <p className="text-text-muted text-xs mt-3">
            Or build from source:{" "}
            <code className="text-text">
              git clone &amp;&amp; cd sudopad-app &amp;&amp; ./build.sh
            </code>
          </p>
        </section>

        {/* How it works */}
        <section>
          <h2 className="font-pixel text-xs text-accent mb-4">
            &gt; how it works
          </h2>
          <div className="border border-border">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-text-muted">1. listen</td>
                  <td className="px-4 py-3">
                    intercepts Ctrl+Shift+F13–F16 from the macro pad
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-text-muted">2. detect</td>
                  <td className="px-4 py-3">
                    identifies frontmost AI app via bundle ID or browser tab
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-text-muted">3. find</td>
                  <td className="px-4 py-3">
                    locates approve/reject buttons via accessibility tree + OCR
                    fallback
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-text-muted">4. act</td>
                  <td className="px-4 py-3">
                    presses button via AX API — no synthetic input, anti-cheat
                    safe
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Button map */}
        <section>
          <h2 className="font-pixel text-xs text-accent mb-4">
            &gt; button map
          </h2>
          <div className="border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase">
                  <th className="px-4 py-2 text-left font-normal">button</th>
                  <th className="px-4 py-2 text-left font-normal">hotkey</th>
                  <th className="px-4 py-2 text-left font-normal">action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { btn: "1", key: "Ctrl+Shift+F13", action: "Approve / Yes" },
                  { btn: "2", key: "Ctrl+Shift+F14", action: "Reject / No" },
                  { btn: "3", key: "Ctrl+Shift+F15", action: "Continue" },
                  { btn: "4", key: "Ctrl+Shift+F16", action: "Stop" },
                ].map((row) => (
                  <tr key={row.btn} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-accent">{row.btn}</td>
                    <td className="px-4 py-2 font-mono">{row.key}</td>
                    <td className="px-4 py-2">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Requirements */}
        <section>
          <h2 className="font-pixel text-xs text-accent mb-4">
            &gt; requirements
          </h2>
          <ul className="text-sm text-text-muted space-y-2">
            <li>
              <span className="text-accent">&#9679;</span> macOS 13 Ventura or
              later
            </li>
            <li>
              <span className="text-accent">&#9679;</span> Accessibility
              permission (System Settings → Privacy &amp; Security)
            </li>
            <li>
              <span className="text-accent">&#9679;</span> Screen Recording
              permission (for OCR fallback)
            </li>
          </ul>
        </section>

        {/* Source */}
        <section>
          <p className="text-text-muted text-sm">
            SudoPad is open source.{" "}
            <a
              href="https://github.com/ibrue/sudo-supply/tree/main/sudopad-app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover-accent"
            >
              View source on GitHub →
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
