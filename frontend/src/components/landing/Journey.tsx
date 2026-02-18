import { useReveal } from "@/hooks/useReveal";

const steps = [
  { num: 1, title: "Describe", desc: "Tell us what you want to connect — in plain English. AI understands your intent.", badge: "AI interprets" },
  { num: 2, title: "Design", desc: "AI maps your systems, suggests the best pattern, and generates the integration blueprint.", badge: "AI architects" },
  { num: 3, title: "Build", desc: "One click to generate code, configs, and transformations. Review, tweak, and approve.", badge: "AI generates" },
  { num: 4, title: "Deploy & Monitor", desc: "Ship to production with auto-testing. AI monitors 24/7 and self-heals issues.", badge: "AI watches" },
];

const Journey = () => {
  const headerRef = useReveal();
  return (
    <section id="journey" className="bg-secondary border-y border-border py-24 relative z-[1]">
      <div className="container">
        <div ref={headerRef} className="reveal-element text-center mb-16">
          <div className="text-[0.72rem] uppercase tracking-[0.14em] text-primary-light font-semibold mb-3.5">AI-Powered Journey</div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-1.5px] leading-[1.1] mb-4 text-foreground">AI makes every step effortless</h2>
          <p className="text-[1.05rem] text-text-2 leading-relaxed font-light max-w-[520px] mx-auto">
            From the first click to production, our AI assistant guides, generates, tests, and monitors — so you focus on outcomes, not plumbing.
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch relative">
          <div className="hidden md:block absolute top-1/2 left-10 right-10 h-0.5 opacity-20 z-0" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--mint)))" }} />
          {steps.map((step) => (
            <JourneyStep key={step.num} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
};

const JourneyStep = ({ num, title, desc, badge }: { num: number; title: string; desc: string; badge: string }) => {
  const ref = useReveal();
  return (
    <div ref={ref} className="reveal-element flex-1 text-center px-4 relative z-[1] mb-8 md:mb-0">
      <div className="group">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-extrabold mx-auto mb-5 bg-background border-2 border-primary text-primary-light transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_24px_hsl(var(--accent-glow))]">
          {num}
        </div>
        <h4 className="text-base font-bold mb-2 tracking-tight text-foreground">{title}</h4>
        <p className="text-[0.82rem] text-text-2 leading-relaxed font-light">{desc}</p>
        <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-primary/[0.08] border border-primary/15 text-[0.68rem] font-mono font-medium text-primary-light">
          ✨ {badge}
        </span>
      </div>
    </div>
  );
};

export default Journey;
