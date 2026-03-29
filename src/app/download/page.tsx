import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "download [sudo] — sudo.supply",
  description: "Download the [sudo] companion app for macOS. Translates macro pad button presses into AI agent actions.",
};

export default function DownloadPage() {
  return (
    <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
      <p className="text-text-muted text-sm mb-8 animate-fade-in">~/download</p>

      <div className="space-y-10 animate-fade-in-delay">
        {/* Hero */}
        <section className="text-center py-8">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/images/logo.svg"
              alt="[sudo]"
              width={200}
              height={45}
              className="invert"
            />
          </div>
          <p className="text-text-muted text-sm leading-relaxed max-w-md mx-auto">
            The companion app for your sudo macro pad.
            Approve, reject, and control AI agents with a physical button press.
          </p>
        </section>

        {/* Download card */}
        <section className="border border-accent p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="font-pixel text-sm mb-2">macOS</h2>
              <p className="text-text-muted text-xs">
                ventura 13.0+ &middot; apple silicon + intel
              </p>
            </div>
            <div className="text-right">
              <span className="text-accent text-sm font-mono">v1.0.0</span>
              <p className="text-text-muted text-xs mt-1">latest</p>
            </div>
          </div>

          <a
            href="https://github.com/ibrue/sudo-app/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-terminal-accent block text-center mb-4"
          >
            [ DOWNLOAD .DMG ]
          </a>

          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>auto-updates enabled</span>
            <span>open source</span>
          </div>
        </section>

        {/* Alt install */}
        <section className="border border-border p-6">
          <h3 className="text-text-muted text-xs uppercase tracking-wider mb-4">
            &gt; install from source
          </h3>
          <div className="font-mono text-sm space-y-1 text-text-muted">
            <p><span className="text-accent">$</span> git clone https://github.com/ibrue/sudo-app</p>
            <p><span className="text-accent">$</span> cd sudo-app</p>
            <p><span className="text-accent">$</span> ./install.sh</p>
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="font-pixel text-xs text-accent mb-4">
            &gt; how it works
          </h2>
          <div className="border border-border">
            <table className="w-full text-sm">
              <tbody>
                {[
                  { step: "1. listen", desc: "intercepts Ctrl+Shift+F13\u2013F16 from the macro pad" },
                  { step: "2. detect", desc: "identifies frontmost AI app via bundle ID or browser tab" },
                  { step: "3. find", desc: "locates buttons via accessibility tree + vision OCR fallback" },
                  { step: "4. act", desc: "presses button via AX API \u2014 no synthetic input, anti-cheat safe" },
                ].map((row) => (
                  <tr key={row.step} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-accent whitespace-nowrap">{row.step}</td>
                    <td className="px-4 py-3 text-text-muted">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Supported apps */}
        <section>
          <h2 className="font-pixel text-xs text-accent mb-4">
            &gt; supported apps
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {["Claude", "ChatGPT", "Grok"].map((app) => (
              <div key={app} className="border border-border p-4 text-center">
                <p className="text-sm font-mono">{app}</p>
                <p className="text-text-muted text-xs mt-1">native + browser</p>
              </div>
            ))}
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
                    <td className="px-4 py-2 text-accent font-mono">{row.btn}</td>
                    <td className="px-4 py-2 font-mono text-text-muted">{row.key}</td>
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
              <span className="text-accent">&#9679;</span> macOS 13 Ventura or later
            </li>
            <li>
              <span className="text-accent">&#9679;</span> Accessibility permission
              (System Settings → Privacy &amp; Security)
            </li>
            <li>
              <span className="text-accent">&#9679;</span> Screen Recording permission
              (for OCR fallback)
            </li>
          </ul>
        </section>

        {/* Footer */}
        <section className="border-t border-border pt-6">
          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>
              [sudo] is open source hardware + software
            </span>
            <a
              href="https://github.com/ibrue/sudo-app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover-accent"
            >
              GitHub →
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
