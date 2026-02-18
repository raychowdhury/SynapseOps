import { useReveal } from "@/hooks/useReveal";

const chips = [
  "Salesforce", "SAP", "AWS", "Azure", "Google Cloud", "Snowflake", "PostgreSQL", "MongoDB",
  "Oracle", "ServiceNow", "HubSpot", "Stripe", "Shopify", "Slack", "Jira", "REST APIs",
  "GraphQL", "Kafka", "RabbitMQ", "BigQuery", "Databricks", "Workday", "NetSuite", "Twilio",
];

const IntegrationsMarquee = () => {
  const ref = useReveal();
  return (
    <section id="integrations" className="text-center overflow-hidden py-24 relative z-[1]">
      <div className="container">
        <div ref={ref} className="reveal-element">
          <div className="text-[0.72rem] uppercase tracking-[0.14em] text-primary-light font-semibold mb-3.5">Integrations</div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-1.5px] leading-[1.1] mb-4 text-foreground">Connect everything</h2>
          <p className="text-[1.05rem] text-text-2 leading-relaxed font-light max-w-[520px] mx-auto">
            200+ pre-built connectors and growing. Or build custom integrations with AI in minutes.
          </p>
        </div>
      </div>
      <div className="mt-12 marquee-mask overflow-hidden">
        <div className="marquee-track">
          {[...chips, ...chips].map((name, i) => (
            <div key={i} className="px-6 py-3 rounded-full bg-card border border-border text-[0.82rem] font-medium text-text-2 whitespace-nowrap flex-shrink-0">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IntegrationsMarquee;
