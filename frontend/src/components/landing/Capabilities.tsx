import { useReveal } from "@/hooks/useReveal";

const capabilities = [
  { icon: "🔌", title: "API Integration", desc: "Connect REST, GraphQL, SOAP, and webhook APIs. AI auto-generates mappings, handles auth, and builds error recovery.", colorClass: "bg-primary/10 text-primary-light", accentColor: "hsl(var(--primary-light))" },
  { icon: "⚙", title: "Data Pipelines", desc: "Build ETL/ELT flows between databases, warehouses, and lakes. AI detects schema changes and fixes transformations.", colorClass: "bg-accent/10 text-accent", accentColor: "hsl(var(--accent))" },
  { icon: "☁", title: "Cloud & Hybrid", desc: "Bridge AWS, Azure, GCP, and on-prem systems seamlessly. AI optimizes routing and provisions infrastructure.", colorClass: "bg-warm/10 text-warm", accentColor: "hsl(var(--warm))" },
  { icon: "♻", title: "ERP & CRM Sync", desc: "Bi-directional sync between Salesforce, SAP, Oracle, ServiceNow, and more. AI resolves conflicts automatically.", colorClass: "bg-coral/10 text-coral", accentColor: "hsl(var(--coral))" },
  { icon: "🔒", title: "Security Built-In", desc: "Every integration is encrypted, audited, and compliant. AI monitors for anomalies and enforces access policies.", colorClass: "bg-mint/10 text-mint", accentColor: "hsl(var(--mint))" },
  { icon: "📊", title: "Real-Time Monitoring", desc: "Live dashboards, smart alerting, and AI-powered root cause analysis. Know what's happening before issues escalate.", colorClass: "bg-primary-light/10 text-primary-light", accentColor: "hsl(var(--primary-light))" },
];

const Capabilities = () => {
  const ref = useReveal();
  return (
    <section id="platform" className="py-24 relative z-[1]">
      <div className="container">
        <div ref={ref} className="reveal-element text-center">
          <div className="text-[0.72rem] uppercase tracking-[0.14em] text-primary-light font-semibold mb-3.5">Platform</div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-1.5px] leading-[1.1] mb-4 text-foreground">Every integration. One platform.</h2>
          <p className="text-[1.05rem] text-text-2 leading-relaxed font-light max-w-[520px] mx-auto">
            Connect anything to anything. SynapseOps handles APIs, data pipelines, cloud services, ERPs, and legacy systems — with AI that does the heavy lifting.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
          {capabilities.map((cap, i) => (
            <CapCard key={i} {...cap} />
          ))}
        </div>
      </div>
    </section>
  );
};

const CapCard = ({ icon, title, desc, colorClass, accentColor }: { icon: string; title: string; desc: string; colorClass: string; accentColor: string }) => {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className="reveal-element group bg-card border border-border rounded-lg p-9 transition-all duration-400 relative overflow-hidden hover:border-[hsl(var(--border-hover))] hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-400"
        style={{ background: accentColor }}
      />
      <div className={`w-12 h-12 rounded-sm flex items-center justify-center text-xl mb-5 ${colorClass}`}>
        {icon}
      </div>
      <h3 className="text-[1.1rem] font-bold mb-2.5 tracking-tight text-foreground">{title}</h3>
      <p className="text-sm text-text-2 leading-relaxed font-light">{desc}</p>
    </div>
  );
};

export default Capabilities;
