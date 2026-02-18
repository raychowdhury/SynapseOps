import { useReveal } from "@/hooks/useReveal";

const stats = [
  { num: "10x", title: "Faster Setup", desc: "Minutes, not months" },
  { num: "85%", title: "Less Manual Work", desc: "AI handles the grunt work" },
  { num: "200+", title: "Connectors", desc: "Pre-built & growing" },
  { num: "24/7", title: "Self-Healing", desc: "AI-powered monitoring" },
];

const WhySection = () => {
  const headerRef = useReveal();
  return (
    <section className="py-24 relative z-[1]">
      <div className="container">
        <div ref={headerRef} className="reveal-element text-center">
          <div className="text-[0.72rem] uppercase tracking-[0.14em] text-primary-light font-semibold mb-3.5">Why SynapseOps</div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-1.5px] leading-[1.1] text-foreground">Integration, reimagined</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
          {stats.map((s) => (
            <WhyItem key={s.num} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
};

const WhyItem = ({ num, title, desc }: { num: string; title: string; desc: string }) => {
  const ref = useReveal();
  return (
    <div ref={ref} className="reveal-element text-center p-10 rounded-lg bg-card border border-border transition-all hover:border-[hsl(var(--border-hover))] hover:-translate-y-1">
      <div className="text-[2.6rem] font-extrabold tracking-tight gradient-text mb-2">{num}</div>
      <h4 className="text-sm font-semibold mb-1.5 text-foreground">{title}</h4>
      <p className="text-xs text-text-3 font-normal">{desc}</p>
    </div>
  );
};

export default WhySection;
