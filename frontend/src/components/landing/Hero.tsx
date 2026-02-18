import FlowDiagram from "./FlowDiagram";

const Hero = () => (
  <header className="min-h-screen flex items-center pt-36 pb-24 relative z-[1]">
    <div className="container">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="max-w-[540px]">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/[0.08] border border-primary/15 text-[0.78rem] font-semibold text-primary-light uppercase tracking-[0.08em] mb-7"
            style={{ animation: "fadeInUp 0.8s ease-out" }}
          >
            <span className="w-[7px] h-[7px] rounded-full bg-mint shadow-[0_0_8px_hsl(163_83%_64%/0.5)]" style={{ animation: "blink 2s infinite" }} />
            AI-Powered Platform
          </div>

          <h1
            className="text-[clamp(2.8rem,5.5vw,4.2rem)] font-extrabold leading-[1.08] tracking-[-2px] mb-6 text-foreground"
            style={{ animation: "fadeInUp 0.7s ease-out 0.1s backwards" }}
          >
            One platform for{" "}
            <em className="not-italic relative inline-block text-emphasis">every</em>{" "}
            IT integration.
          </h1>

          <p
            className="text-lg text-text-2 leading-relaxed font-light mb-10"
            style={{ animation: "fadeInUp 0.7s ease-out 0.2s backwards" }}
          >
            SynapseOps connects your APIs, data, cloud, ERP, and more — all in one place. Our AI guides you through every step, from mapping to deployment, making complex integrations feel effortless.
          </p>

          <div className="flex gap-3.5 flex-wrap" style={{ animation: "fadeInUp 0.7s ease-out 0.3s backwards" }}>
            <a
              href="#cta"
              className="group px-8 py-4 rounded-full bg-gradient-to-br from-primary to-[#8b7cf6] text-primary-foreground text-[0.95rem] font-bold no-underline relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_hsl(var(--accent-glow))]"
            >
              <span className="absolute inset-0 bg-gradient-to-br from-[#8b7cf6] to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-[1]">Start Integrating Free</span>
            </a>
            <a
              href="#platform"
              className="px-8 py-4 rounded-full border border-[hsl(var(--border-hover))] bg-transparent text-foreground text-[0.95rem] font-semibold no-underline transition-all hover:border-primary-light hover:text-primary-light hover:bg-primary/[0.05]"
            >
              See How It Works
            </a>
          </div>
        </div>

        <div className="hidden lg:block">
          <FlowDiagram />
        </div>
      </div>
    </div>
  </header>
);

export default Hero;
