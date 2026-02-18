const flowData = [
  { source: "SAP ERP", sourceClass: "bg-accent/10 border-accent/20 text-accent", target: "Snowflake", pulseClass: "bg-accent shadow-[0_0_8px_hsl(var(--cyan-glow))]", delay: "0s", arrowDelay: "0.5s", slideDelay: "0.6s" },
  { source: "Salesforce", sourceClass: "bg-primary/10 border-primary/20 text-primary-light", target: "HubSpot", pulseClass: "bg-primary-light shadow-[0_0_8px_hsl(var(--accent-glow))]", delay: "0.3s", arrowDelay: "0.8s", slideDelay: "0.8s" },
  { source: "AWS S3", sourceClass: "bg-warm/10 border-warm/20 text-warm", target: "BigQuery", pulseClass: "bg-warm", delay: "0.6s", arrowDelay: "1.1s", slideDelay: "1.0s" },
  { source: "REST API", sourceClass: "bg-coral/10 border-coral/20 text-coral", target: "Webhooks", pulseClass: "bg-coral", delay: "0.9s", arrowDelay: "1.4s", slideDelay: "1.2s" },
  { source: "PostgreSQL", sourceClass: "bg-mint/10 border-mint/20 text-mint", target: "MongoDB", pulseClass: "bg-mint", delay: "1.2s", arrowDelay: "1.7s", slideDelay: "1.4s" },
];

const FlowDiagram = () => (
  <div className="bg-secondary border border-border rounded-lg p-8 relative overflow-hidden" style={{ animation: "fadeInUp 1s ease-out 0.4s backwards" }}>
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-light to-transparent opacity-40" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary-light)), hsl(var(--accent)), transparent)" }} />
    
    <div className="flex items-center gap-2 mb-7 text-[0.7rem] font-mono text-text-3 uppercase tracking-[0.12em]">
      <span className="w-2 h-2 rounded-full bg-mint" />
      <span className="w-2 h-2 rounded-full bg-warm" />
      <span className="w-2 h-2 rounded-full bg-coral" />
      <span className="ml-2">live integration flows</span>
    </div>

    <div className="flex flex-col gap-3">
      {flowData.map((row, i) => (
        <div key={i} className="flex items-center gap-3" style={{ animation: `slideIn 0.5s ease-out ${row.slideDelay} backwards` }}>
          <div className={`px-4 py-2.5 rounded-sm border text-[0.78rem] font-semibold min-w-[100px] text-center whitespace-nowrap ${row.sourceClass}`}>
            {row.source}
          </div>
          <div className="flex-1 h-0.5 relative min-w-[40px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-text-3 to-transparent opacity-30" />
            <div className={`flow-pulse ${row.pulseClass}`} style={{ animationDelay: row.delay }} />
          </div>
          <div className="px-5 py-2.5 rounded-sm bg-gradient-to-br from-primary to-accent text-[0.72rem] font-bold text-primary-foreground text-center whitespace-nowrap tracking-wide shadow-[0_4px_24px_hsl(var(--accent-glow))] min-w-[110px]">
            SynapseOps AI
          </div>
          <div className="flex-1 h-0.5 relative min-w-[40px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-text-3 to-transparent opacity-30" />
            <div className={`flow-pulse ${row.pulseClass}`} style={{ animationDelay: row.arrowDelay }} />
          </div>
          <div className="px-4 py-2.5 rounded-sm bg-foreground/[0.04] border border-border text-[0.78rem] font-medium text-text-2 min-w-[100px] text-center whitespace-nowrap">
            {row.target}
          </div>
        </div>
      ))}
    </div>

    <div className="mt-5 px-4 py-3 rounded-sm bg-mint/[0.05] border border-mint/10 flex items-center gap-2.5 text-[0.75rem] font-mono text-mint" style={{ animation: "fadeInUp 0.5s ease-out 1.6s backwards" }}>
      <span className="text-base">✓</span>
      All 5 flows healthy · 12.4k events/min · 0 errors
    </div>
  </div>
);

export default FlowDiagram;
