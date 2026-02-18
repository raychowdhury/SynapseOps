import { useReveal } from "@/hooks/useReveal";

const Testimonial = () => {
  const ref = useReveal();
  const cardRef = useReveal();
  return (
    <section className="text-center py-24 relative z-[1]">
      <div className="container">
        <div ref={ref} className="reveal-element">
          <div className="text-[0.72rem] uppercase tracking-[0.14em] text-primary-light font-semibold mb-3.5">What teams say</div>
        </div>
        <div ref={cardRef} className="reveal-element max-w-[680px] mx-auto mt-10 p-12 bg-card border border-border rounded-lg relative">
          <span className="absolute top-6 left-8 text-[4rem] leading-none text-primary opacity-15 font-serif">"</span>
          <blockquote className="text-lg leading-relaxed font-light text-foreground italic mb-6">
            We used to spend weeks wiring up integrations between our CRM and warehouse. With SynapseOps, the AI mapped everything in minutes and caught edge cases we would have missed. It's like having a senior integration engineer on call 24/7.
          </blockquote>
          <div className="text-sm font-semibold text-text-2">
            Sarah Chen <span className="text-text-3 font-normal">· VP Engineering, ScaleStack</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
