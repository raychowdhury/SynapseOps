import { useReveal } from "@/hooks/useReveal";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AmbientBackground from "@/components/landing/AmbientBackground";

const services = [
  {
    slug: "api-integration",
    icon: "API",
    title: "API Integration",
    desc: "Connect any REST, GraphQL, SOAP, or webhook API in minutes. AI auto-generates field mappings, handles authentication protocols, and builds intelligent error recovery — so your systems talk to each other without custom glue code.",
    features: ["REST & GraphQL", "SOAP & Webhooks", "AI Field Mapping", "Auto Error Recovery"],
    colorClass: "bg-primary/10 text-primary-light",
    accentColor: "hsl(var(--primary-light))",
    tag: "Integration",
  },
  {
    slug: "data-pipelines",
    icon: "ETL",
    title: "Data Pipelines",
    desc: "Build production ETL/ELT flows between databases, data warehouses, and data lakes. AI detects schema drift, auto-fixes broken transformations, and keeps your data flowing even when sources change.",
    features: ["ETL & ELT Flows", "Schema Drift Detection", "Auto Transformation Fix", "CDC & Streaming"],
    colorClass: "bg-accent/10 text-accent",
    accentColor: "hsl(var(--accent))",
    tag: "Data",
  },
  {
    slug: "cloud-hybrid",
    icon: "CLD",
    title: "Cloud & Hybrid",
    desc: "Bridge AWS, Azure, GCP, and on-premise systems into a single integration fabric. AI optimizes routing, provisions infrastructure, and ensures data stays where compliance requires it.",
    features: ["Multi-Cloud Bridge", "On-Prem Connectors", "AI Route Optimization", "Auto Provisioning"],
    colorClass: "bg-warm/10 text-warm",
    accentColor: "hsl(var(--warm))",
    tag: "Infrastructure",
  },
  {
    slug: "erp-crm-sync",
    icon: "ERP",
    title: "ERP & CRM Sync",
    desc: "Bi-directional sync between Salesforce, SAP, Oracle, ServiceNow, HubSpot, and more. AI resolves data conflicts, deduplicates records, and maintains referential integrity across systems.",
    features: ["Salesforce & SAP", "Oracle & ServiceNow", "Conflict Resolution", "Bi-directional Sync"],
    colorClass: "bg-coral/10 text-coral",
    accentColor: "hsl(var(--coral))",
    tag: "Enterprise",
  },
  {
    slug: "security-compliance",
    icon: "SEC",
    title: "Security & Compliance",
    desc: "Every integration is encrypted in transit and at rest, fully audited, and compliance-ready. AI monitors data flows for anomalies, enforces access policies, and generates audit trails automatically.",
    features: ["End-to-End Encryption", "Audit Trails", "RBAC & Policies", "Anomaly Detection"],
    colorClass: "bg-mint/10 text-mint",
    accentColor: "hsl(var(--mint))",
    tag: "Security",
  },
  {
    slug: "monitoring-observability",
    icon: "MON",
    title: "Monitoring & Observability",
    desc: "Live dashboards, intelligent alerting, and AI-powered root cause analysis across all your integrations. Know what's failing, why, and how to fix it — before your users notice.",
    features: ["Live Dashboards", "Smart Alerting", "Root Cause Analysis", "Performance Metrics"],
    colorClass: "bg-primary-light/10 text-primary-light",
    accentColor: "hsl(var(--primary-light))",
    tag: "Operations",
  },
  {
    slug: "ai-orchestration",
    icon: "AI",
    title: "AI Orchestration",
    desc: "Let AI design your integration flows. Describe what you need in plain language — SynapseOps maps your systems, suggests the optimal architecture, and generates the entire pipeline automatically.",
    features: ["Natural Language Setup", "Auto Architecture", "Flow Generation", "Continuous Optimization"],
    colorClass: "bg-primary/10 text-primary-light",
    accentColor: "hsl(var(--primary-light))",
    tag: "AI",
  },
  {
    slug: "legacy-modernization",
    icon: "MOD",
    title: "Legacy Modernization",
    desc: "Connect legacy mainframes, file-based systems, and proprietary protocols to modern APIs without rewriting them. AI wraps old systems in clean interfaces so they work with everything else.",
    features: ["Mainframe Connectors", "File & FTP Bridge", "Protocol Translation", "API Wrapping"],
    colorClass: "bg-accent/10 text-accent",
    accentColor: "hsl(var(--accent))",
    tag: "Modernization",
  },
  {
    slug: "event-automation",
    icon: "EVT",
    title: "Event & Automation",
    desc: "Trigger workflows across systems based on real-time events. AI builds event-driven architectures with message queues, webhooks, and orchestration — turning manual processes into automated pipelines.",
    features: ["Event-Driven Flows", "Webhook Orchestration", "Message Queues", "Workflow Automation"],
    colorClass: "bg-warm/10 text-warm",
    accentColor: "hsl(var(--warm))",
    tag: "Automation",
  },
];

const ServiceCard = ({ service }: { service: typeof services[0] }) => {
  const ref = useReveal();
  return (
    <a
      href={`/services/${service.slug}`}
      ref={ref}
      className="reveal-element group bg-card border border-border rounded-lg p-8 transition-all duration-400 relative overflow-hidden hover:border-[hsl(var(--border-hover))] hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)] no-underline block"
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-400"
        style={{ background: service.accentColor }}
      />
      <div className="flex items-start justify-between mb-5">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold ${service.colorClass}`}>
          {service.icon}
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{service.tag}</Badge>
      </div>
      <h3 className="text-lg font-bold mb-2 tracking-tight text-foreground">{service.title}</h3>
      <p className="text-sm text-text-2 leading-relaxed font-light mb-5">{service.desc}</p>
      <div className="flex flex-wrap gap-1.5">
        {service.features.map((f) => (
          <span key={f} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-text-2 font-medium">{f}</span>
        ))}
      </div>
    </a>
  );
};

export default function Services() {
  const headerRef = useReveal();

  return (
    <>
      <AmbientBackground />
      <Navbar />
      <main className="min-h-screen pt-32 pb-24 relative z-[1]">
        <div className="container">
          <div ref={headerRef} className="reveal-element text-center mb-16">
            <div className="text-[0.72rem] uppercase tracking-[0.14em] text-primary-light font-semibold mb-3.5">Services</div>
            <h1 className="text-[clamp(2.4rem,5vw,3.8rem)] font-extrabold tracking-[-2px] leading-[1.08] mb-5 text-foreground">
              One platform for<br />
              <em className="not-italic text-emphasis">every</em> IT integration.
            </h1>
            <p className="text-lg text-text-2 leading-relaxed font-light max-w-[580px] mx-auto">
              APIs, data pipelines, cloud services, ERPs, legacy systems — SynapseOps connects them all. AI handles the mapping, monitoring, and maintenance so your team can focus on building.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s) => (
              <ServiceCard key={s.slug} service={s} />
            ))}
          </div>

          <div className="mt-20 text-center">
            <a
              href="/#cta"
              className="inline-flex px-10 py-4 rounded-full bg-gradient-to-br from-primary to-[#8b7cf6] text-primary-foreground text-base font-bold no-underline relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_hsl(var(--accent-glow))]"
            >
              Start Integrating Free
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
