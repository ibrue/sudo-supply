import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "about — sudo.supply",
};

export default function AboutPage() {
  return (
    <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
      <p className="text-text-muted text-sm mb-8 animate-fade-in">~/about</p>

      <div className="space-y-8 text-sm leading-relaxed animate-fade-in-delay">
        <section>
          <h2 className="font-pixel text-xs text-accent mb-4">&gt; the story</h2>
          <p className="text-text-muted">
            sudo.supply was born from a simple frustration: AI agents asking for
            permission, and having no satisfying way to say yes. We build
            mechanical macro pads for developers who live in the terminal and
            work alongside AI every day. A physical button to approve, reject,
            continue, or cancel — because some actions deserve more than a
            keystroke.
          </p>
        </section>

        <section>
          <h2 className="font-pixel text-xs text-accent mb-4">
            &gt; open source
          </h2>
          <p className="text-text-muted mb-4">
            Every sudo product is open-source hardware. PCB schematics, case
            files, and firmware are all available under permissive licenses. We
            believe the tools you use to control AI should be transparent and
            hackable.
          </p>
          <a
            href="https://github.com/ibrue/sudo-supply-web"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-terminal text-xs"
          >
            [ view on github ]
          </a>
        </section>

        <section>
          <h2 className="font-pixel text-xs text-accent mb-4">
            &gt; open hardware
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-accent text-3xl font-mono">&#9881;</div>
            <p className="text-text-muted">
              sudo macro pad is certified Open Source Hardware (OSHW). You can
              manufacture, modify, and distribute it freely. The design files are
              available in our GitHub repository.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-pixel text-xs text-accent mb-4">
            &gt; contact
          </h2>
          <p className="text-text-muted">
            <span className="text-text">email:</span>{" "}
            hello@sudo.supply
          </p>
          <p className="text-text-muted">
            <span className="text-text">github:</span>{" "}
            <a
              href="https://github.com/ibrue/sudo-supply-web"
              target="_blank"
              rel="noopener noreferrer"
              className="hover-accent text-accent"
            >
              ibrue/sudo-supply-web
            </a>
          </p>
          <p className="text-text-muted">
            <span className="text-text">app:</span>{" "}
            <a
              href="https://github.com/ibrue/sudo-app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover-accent text-accent"
            >
              ibrue/sudo-app
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
