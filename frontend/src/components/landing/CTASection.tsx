import { useState } from "react";
import { useReveal } from "@/hooks/useReveal";

const CTASection = () => {
  const ref = useReveal();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (email && email.includes("@")) {
      setSubmitted(true);
    }
  };

  return (
    <section id="cta" className="text-center py-28 relative z-[1]">
      <div className="container">
        <div
          ref={ref}
          className="reveal-element max-w-[700px] mx-auto p-16 border border-primary/[0.12] rounded-[28px] relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--accent) / 0.04))" }}
        >
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 40%, hsl(var(--accent-glow)), transparent 60%)" }} />
          <div className="relative z-[1]">
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight mb-3.5 text-foreground">
              Start integrating<br />the <span className="gradient-text">smarter</span> way.
            </h2>
            <p className="text-text-2 text-[1.05rem] font-light mb-9 max-w-[460px] mx-auto">
              Join hundreds of teams using AI to connect their entire tech stack — without the headaches.
            </p>
            <div className="flex gap-3 max-w-[440px] mx-auto flex-wrap justify-center">
              <input
                type="email"
                placeholder="Your work email"
                value={submitted ? "Welcome aboard!" : email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitted}
                className="flex-1 min-w-[220px] px-5 py-3.5 rounded-full border border-[hsl(var(--border-hover))] bg-background text-foreground font-sans text-sm outline-none focus:border-primary transition-colors placeholder:text-text-3 disabled:opacity-60"
              />
              <button
                onClick={handleSubmit}
                disabled={submitted}
                className="group px-8 py-3.5 rounded-full bg-gradient-to-br from-primary to-[#8b7cf6] text-primary-foreground text-sm font-bold relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_hsl(var(--accent-glow))] disabled:hover:translate-y-0"
                style={submitted ? { background: "linear-gradient(135deg, hsl(var(--mint)), hsl(163 83% 36%))" } : undefined}
              >
                <span className="absolute inset-0 bg-gradient-to-br from-[#8b7cf6] to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-[1]">{submitted ? "✓ You're in!" : "Get Early Access"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
