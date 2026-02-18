import { useParams, Navigate } from "react-router-dom";
import { useReveal } from "@/hooks/useReveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AmbientBackground from "@/components/landing/AmbientBackground";

interface ServiceData {
  title: string;
  tag: string;
  icon: string;
  colorClass: string;
  accentColor: string;
  headline: string;
  description: string;
  features: { title: string; desc: string }[];
  capabilities: string[];
  useCases: { scenario: string; outcome: string }[];
  cta: { label: string; href: string; hint: string };
}

const SERVICE_DATA: Record<string, ServiceData> = {
  "api-integration": {
    title: "API Integration",
    tag: "Integration",
    icon: "API",
    colorClass: "bg-primary/10 text-primary-light",
    accentColor: "hsl(var(--primary-light))",
    headline: "Connect any API. Zero glue code.",
    description: "REST, GraphQL, SOAP, or webhooks — SynapseOps connects them all in minutes. AI auto-generates field mappings between systems, handles OAuth, API keys, and custom authentication protocols, and builds intelligent error recovery so your integrations self-heal when things go wrong.",
    features: [
      { title: "Universal Protocol Support", desc: "REST, GraphQL, SOAP, gRPC, and webhooks all work through one unified integration layer. No separate tooling for each protocol." },
      { title: "AI Field Mapping", desc: "AI analyzes source and target schemas, auto-maps fields by name, type, and semantic meaning. Handles naming differences like 'firstName' → 'first_name' automatically." },
      { title: "Smart Auth Management", desc: "OAuth 2.0, API keys, JWT, HMAC, and custom auth flows. SynapseOps manages token refresh, key rotation, and credential vaults so you never leak secrets." },
      { title: "Self-Healing Error Recovery", desc: "Automatic retry with exponential backoff, circuit breakers, dead letter queues, and fallback routing. Your integrations recover without human intervention." },
    ],
    capabilities: ["REST & GraphQL", "SOAP & gRPC", "Webhooks", "OAuth 2.0", "API Key Management", "Rate Limiting", "Field Mapping", "Error Recovery"],
    useCases: [
      { scenario: "E-commerce order sync", outcome: "Shopify orders flow to your ERP, warehouse, and shipping APIs in real-time with zero data loss" },
      { scenario: "Payment gateway integration", outcome: "Connect Stripe, PayPal, or any PSP with automatic retry on transient failures and PCI-compliant data handling" },
      { scenario: "Multi-vendor data aggregation", outcome: "Pull data from 50+ supplier APIs, normalize formats, and push to a single dashboard in under 200ms" },
    ],
    cta: { label: "Start Integrating APIs", href: "/#cta", hint: "Connect your first API in under 5 minutes with AI-assisted mapping" },
  },
  "data-pipelines": {
    title: "Data Pipelines",
    tag: "Data",
    icon: "ETL",
    colorClass: "bg-accent/10 text-accent",
    accentColor: "hsl(var(--accent))",
    headline: "Data flows that never break.",
    description: "Build production ETL/ELT pipelines between databases, data warehouses, and data lakes. SynapseOps AI detects schema drift before it causes failures, auto-fixes broken transformations, and keeps your data flowing even when upstream sources change without warning.",
    features: [
      { title: "ETL & ELT Pipelines", desc: "Build extract-transform-load or extract-load-transform pipelines visually or via code. Support for batch, micro-batch, and real-time streaming." },
      { title: "Schema Drift Detection", desc: "AI monitors source schemas continuously. When a column is added, renamed, or removed, SynapseOps detects it and either auto-adapts or alerts you before anything breaks." },
      { title: "Auto Transformation Fix", desc: "When a transformation fails due to data type changes or format shifts, AI analyzes the error, infers the correct fix, and applies it — keeping your pipeline running." },
      { title: "CDC & Streaming", desc: "Change Data Capture from PostgreSQL, MySQL, MongoDB, and more. Stream changes in real-time to warehouses, lakes, or downstream APIs with exactly-once guarantees." },
    ],
    capabilities: ["ETL/ELT", "CDC Streaming", "Schema Detection", "Auto Repair", "Batch Processing", "Data Validation", "Incremental Loads", "Partitioning"],
    useCases: [
      { scenario: "Data warehouse loading", outcome: "Sync operational databases to Snowflake, BigQuery, or Redshift with incremental loads and automatic schema evolution" },
      { scenario: "Real-time analytics", outcome: "Stream transaction data from PostgreSQL CDC to your analytics platform with sub-second latency" },
      { scenario: "Data lake ingestion", outcome: "Ingest structured and semi-structured data from 20+ sources into S3/Delta Lake with automatic partitioning and cataloging" },
    ],
    cta: { label: "Build Your Pipeline", href: "/#cta", hint: "Create production data pipelines with AI-powered schema drift protection" },
  },
  "cloud-hybrid": {
    title: "Cloud & Hybrid",
    tag: "Infrastructure",
    icon: "CLD",
    colorClass: "bg-warm/10 text-warm",
    accentColor: "hsl(var(--warm))",
    headline: "One fabric for every cloud.",
    description: "Bridge AWS, Azure, GCP, and on-premise systems into a single integration fabric. SynapseOps AI optimizes routing between clouds, provisions infrastructure on demand, and ensures data stays exactly where compliance requires it — no manual configuration needed.",
    features: [
      { title: "Multi-Cloud Bridge", desc: "Unified connectivity across AWS, Azure, GCP, and private clouds. One integration layer that abstracts away cloud-specific APIs and networking." },
      { title: "On-Prem Connectors", desc: "Secure agents that run behind your firewall, connecting legacy on-premise systems to cloud services without exposing internal networks." },
      { title: "AI Route Optimization", desc: "AI analyzes latency, cost, and compliance requirements to route data through the optimal path. Automatically re-routes when a region goes down." },
      { title: "Auto Provisioning", desc: "SynapseOps provisions compute, storage, and networking resources on demand. Scale up during peak loads, scale down to save costs — automatically." },
    ],
    capabilities: ["AWS", "Azure", "GCP", "On-Premise", "VPN Tunnels", "Private Link", "Geo-Routing", "Auto Scaling"],
    useCases: [
      { scenario: "Hybrid cloud migration", outcome: "Run integrations across on-prem Oracle and AWS services during migration, with zero downtime cutover when ready" },
      { scenario: "Multi-cloud redundancy", outcome: "Active-active deployment across AWS and Azure with automatic failover. 99.99% uptime SLA on your integration layer" },
      { scenario: "Data residency compliance", outcome: "Route EU customer data through Frankfurt, US data through Virginia, APAC through Singapore — automatically enforced by policy" },
    ],
    cta: { label: "Connect Your Clouds", href: "/#cta", hint: "Bridge any combination of cloud and on-premise systems in one unified fabric" },
  },
  "erp-crm-sync": {
    title: "ERP & CRM Sync",
    tag: "Enterprise",
    icon: "ERP",
    colorClass: "bg-coral/10 text-coral",
    accentColor: "hsl(var(--coral))",
    headline: "Your systems, finally in sync.",
    description: "Bi-directional sync between Salesforce, SAP, Oracle, ServiceNow, HubSpot, and 200+ enterprise systems. SynapseOps AI resolves data conflicts intelligently, deduplicates records across systems, and maintains referential integrity so your single source of truth stays accurate.",
    features: [
      { title: "Bi-Directional Sync", desc: "Changes in Salesforce update SAP and vice versa. Real-time bi-directional sync with conflict detection and resolution built in." },
      { title: "AI Conflict Resolution", desc: "When the same record is updated in two systems simultaneously, AI determines the correct merge based on timestamp, priority rules, and field-level analysis." },
      { title: "Record Deduplication", desc: "AI identifies duplicate contacts, accounts, and records across systems using fuzzy matching, email normalization, and company name analysis." },
      { title: "Referential Integrity", desc: "When a parent record updates, all related child records across all connected systems update together. No orphaned references, no broken links." },
    ],
    capabilities: ["Salesforce", "SAP", "Oracle", "ServiceNow", "HubSpot", "Dynamics 365", "NetSuite", "Workday"],
    useCases: [
      { scenario: "Sales-to-fulfillment sync", outcome: "Closed deals in Salesforce automatically create orders in SAP, trigger warehouse picks, and update delivery timelines back to the CRM" },
      { scenario: "Customer 360 view", outcome: "Merge customer data from CRM, support tickets, billing, and product usage into a single unified profile updated in real-time" },
      { scenario: "HR system integration", outcome: "New hires in Workday automatically provision accounts in Active Directory, Salesforce, Slack, and your internal tools" },
    ],
    cta: { label: "Sync Your Systems", href: "/#cta", hint: "Connect your ERP and CRM systems with AI-powered conflict resolution" },
  },
  "security-compliance": {
    title: "Security & Compliance",
    tag: "Security",
    icon: "SEC",
    colorClass: "bg-mint/10 text-mint",
    accentColor: "hsl(var(--mint))",
    headline: "Secure by design. Compliant by default.",
    description: "Every integration is encrypted in transit and at rest, fully audited, and compliance-ready from day one. SynapseOps AI monitors data flows for anomalies, enforces access policies automatically, and generates audit trails that satisfy SOC 2, HIPAA, GDPR, and PCI-DSS auditors.",
    features: [
      { title: "End-to-End Encryption", desc: "TLS 1.3 in transit, AES-256 at rest. All credentials stored in hardware-backed vaults. Zero plaintext secrets anywhere in the pipeline." },
      { title: "Automated Audit Trails", desc: "Every data movement, transformation, and access is logged with who, what, when, where. Immutable audit logs exportable for compliance reviews." },
      { title: "RBAC & Access Policies", desc: "Fine-grained role-based access control. Define who can view, modify, or execute each integration. Enforce least-privilege automatically." },
      { title: "AI Anomaly Detection", desc: "AI monitors data flow patterns and flags unusual volumes, unexpected access patterns, or data exfiltration attempts in real-time." },
    ],
    capabilities: ["SOC 2", "HIPAA", "GDPR", "PCI-DSS", "Encryption", "Audit Logs", "RBAC", "DLP"],
    useCases: [
      { scenario: "Healthcare data integration", outcome: "Sync patient records between EHR systems with HIPAA-compliant encryption, access logging, and automatic PHI detection" },
      { scenario: "Financial compliance", outcome: "PCI-DSS compliant payment data flows with tokenization, encryption, and complete audit trails for every transaction" },
      { scenario: "GDPR data management", outcome: "Track personal data across all integrated systems, automate right-to-erasure requests, and prove compliance with exportable audit reports" },
    ],
    cta: { label: "Secure Your Integrations", href: "/#cta", hint: "Every integration comes with enterprise-grade security and compliance built in" },
  },
  "monitoring-observability": {
    title: "Monitoring & Observability",
    tag: "Operations",
    icon: "MON",
    colorClass: "bg-primary-light/10 text-primary-light",
    accentColor: "hsl(var(--primary-light))",
    headline: "See everything. Fix it before users notice.",
    description: "Live dashboards, intelligent alerting, and AI-powered root cause analysis across all your integrations. SynapseOps tells you what's failing, why it's failing, and how to fix it — often before your users even notice something went wrong.",
    features: [
      { title: "Live Dashboards", desc: "Real-time visibility into every integration flow. Throughput, latency, error rates, and queue depths — all in one place with customizable views." },
      { title: "Smart Alerting", desc: "AI learns your normal patterns and only alerts on real issues. No alert fatigue. Alerts include root cause context and suggested fixes." },
      { title: "Root Cause Analysis", desc: "When something breaks, AI traces the failure across the entire integration chain, identifies the root cause, and recommends the fix." },
      { title: "Performance Metrics", desc: "Track p50, p95, p99 latencies per integration. Identify bottlenecks, optimize slow transformations, and benchmark against SLOs." },
    ],
    capabilities: ["Real-Time Dashboards", "AI Alerting", "RCA", "SLO Tracking", "Log Aggregation", "Distributed Tracing", "Health Checks", "Custom Metrics"],
    useCases: [
      { scenario: "Integration SLA management", outcome: "Set SLOs per integration (e.g., 99.9% success, <500ms latency) and get proactive alerts when performance degrades" },
      { scenario: "Cross-system debugging", outcome: "A failed order sync traces back to a timeout in the ERP connector — AI identifies the root cause in seconds, not hours" },
      { scenario: "Capacity planning", outcome: "Predict when integration throughput will hit limits based on growth trends and auto-scale before bottlenecks occur" },
    ],
    cta: { label: "Monitor Your Integrations", href: "/#cta", hint: "Get full visibility across all your integrations with AI-powered insights" },
  },
  "ai-orchestration": {
    title: "AI Orchestration",
    tag: "AI",
    icon: "AI",
    colorClass: "bg-primary/10 text-primary-light",
    accentColor: "hsl(var(--primary-light))",
    headline: "Describe it. AI builds it.",
    description: "Let AI design your integration flows. Describe what you need in plain language — SynapseOps maps your existing systems, suggests the optimal integration architecture, and generates the entire pipeline automatically. From idea to running integration in minutes.",
    features: [
      { title: "Natural Language Setup", desc: "Tell SynapseOps 'sync new Shopify orders to SAP and notify Slack' and AI builds the complete integration flow with error handling and retry logic." },
      { title: "Auto Architecture", desc: "AI analyzes your connected systems, data volumes, and latency requirements to recommend the optimal integration pattern — pub/sub, request/reply, or batch." },
      { title: "Flow Generation", desc: "AI generates complete integration flows including field mappings, transformations, error handling, and monitoring — all from a single description." },
      { title: "Continuous Optimization", desc: "AI continuously monitors running integrations and suggests optimizations: better batching, caching opportunities, parallel execution paths." },
    ],
    capabilities: ["NLP Interface", "Auto Architecture", "Flow Generation", "Smart Routing", "Pattern Detection", "Cost Optimization", "Predictive Scaling", "Self-Tuning"],
    useCases: [
      { scenario: "Rapid integration prototyping", outcome: "Describe 10 integration requirements in plain English, get working prototypes for all of them in under an hour" },
      { scenario: "Architecture optimization", outcome: "AI analyzes your 50+ existing integrations and recommends consolidation — reducing infrastructure costs by 40%" },
      { scenario: "Non-technical users", outcome: "Business analysts describe what data needs to flow where, and AI builds production-grade integrations without writing a single line of code" },
    ],
    cta: { label: "Try AI Orchestration", href: "/#cta", hint: "Describe your integration needs in plain language and let AI build them" },
  },
  "legacy-modernization": {
    title: "Legacy Modernization",
    tag: "Modernization",
    icon: "MOD",
    colorClass: "bg-accent/10 text-accent",
    accentColor: "hsl(var(--accent))",
    headline: "Connect legacy systems without rewriting them.",
    description: "Bridge mainframes, file-based systems, and proprietary protocols to modern APIs without touching legacy code. SynapseOps AI wraps old systems in clean, documented interfaces so they integrate seamlessly with everything else in your stack.",
    features: [
      { title: "Mainframe Connectors", desc: "Connect IBM mainframes, AS/400, and COBOL systems through secure, managed connectors. No mainframe expertise required on your team." },
      { title: "File & FTP Bridge", desc: "Watch for CSV, XML, EDI, and flat files on FTP/SFTP servers. Parse, transform, and route data into modern APIs and databases automatically." },
      { title: "Protocol Translation", desc: "Translate between legacy protocols (MQ, CICS, IMS) and modern standards (REST, gRPC, GraphQL). Both sides see their native protocol." },
      { title: "API Wrapping", desc: "AI generates clean REST APIs around legacy systems. Modern apps call a documented API — SynapseOps handles the translation to legacy formats behind the scenes." },
    ],
    capabilities: ["Mainframe", "AS/400", "COBOL", "FTP/SFTP", "EDI", "MQ Series", "CICS", "Flat Files"],
    useCases: [
      { scenario: "Mainframe data access", outcome: "Expose mainframe COBOL transactions as REST APIs that your React frontend can call directly — no middleware team needed" },
      { scenario: "EDI modernization", outcome: "Convert EDI 850/856/810 documents to JSON, process them through modern APIs, and send back EDI responses — all automated" },
      { scenario: "File-based integration", outcome: "Replace nightly batch file drops with real-time CDC streams. Same data, 1000x faster, with guaranteed delivery" },
    ],
    cta: { label: "Modernize Your Legacy Systems", href: "/#cta", hint: "Connect mainframes and legacy systems to modern APIs without rewriting anything" },
  },
  "event-automation": {
    title: "Event & Automation",
    tag: "Automation",
    icon: "EVT",
    colorClass: "bg-warm/10 text-warm",
    accentColor: "hsl(var(--warm))",
    headline: "Events trigger. Workflows execute.",
    description: "Build event-driven architectures that trigger workflows across systems in real-time. SynapseOps AI designs event flows with message queues, webhooks, and orchestration logic — turning manual processes into automated pipelines that run 24/7 without human intervention.",
    features: [
      { title: "Event-Driven Flows", desc: "React to events from any system: database changes, API calls, file uploads, scheduled triggers, or custom events. Chain reactions across your entire stack." },
      { title: "Webhook Orchestration", desc: "Receive, validate, transform, and route webhooks from any service. Built-in signature verification, replay protection, and guaranteed delivery." },
      { title: "Message Queue Integration", desc: "Native support for Kafka, RabbitMQ, SQS, and Pub/Sub. Produce, consume, and route messages with exactly-once processing guarantees." },
      { title: "Workflow Automation", desc: "Build multi-step workflows with branching, parallel execution, human approvals, and error handling. Replace manual processes with reliable automation." },
    ],
    capabilities: ["Event Streams", "Webhooks", "Kafka", "RabbitMQ", "SQS", "Pub/Sub", "Cron Triggers", "Workflow Engine"],
    useCases: [
      { scenario: "Order processing pipeline", outcome: "New order → validate inventory → charge payment → create shipment → notify customer → update CRM — all automated in real-time" },
      { scenario: "Incident response automation", outcome: "PagerDuty alert triggers Jira ticket creation, Slack notification, runbook execution, and status page update — in under 10 seconds" },
      { scenario: "Data-driven workflows", outcome: "When a customer's usage hits a threshold, automatically trigger upsell email, update CRM stage, and notify the account manager" },
    ],
    cta: { label: "Automate Your Workflows", href: "/#cta", hint: "Build event-driven workflows that connect and automate your entire stack" },
  },
};

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const service = slug ? SERVICE_DATA[slug] : null;

  if (!service) return <Navigate to="/services" replace />;

  const heroRef = useReveal();
  const featRef = useReveal();
  const useCaseRef = useReveal();

  return (
    <>
      <AmbientBackground />
      <Navbar />
      <main className="min-h-screen pt-32 pb-24 relative z-[1]">
        <div className="container max-w-[900px]">
          {/* Hero */}
          <div ref={heroRef} className="reveal-element mb-16">
            <a href="/services" className="text-sm text-text-2 hover:text-primary-light transition-colors mb-6 inline-block">&larr; All Services</a>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-base font-bold ${service.colorClass}`}>
                {service.icon}
              </div>
              <div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider mb-1">{service.tag}</Badge>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{service.title}</h1>
              </div>
            </div>
            <p className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold tracking-[-1px] leading-[1.15] mb-4 text-foreground">
              {service.headline}
            </p>
            <p className="text-base text-text-2 leading-relaxed font-light max-w-[640px]">
              {service.description}
            </p>
          </div>

          {/* Features */}
          <div ref={featRef} className="reveal-element mb-16">
            <h2 className="text-xl font-bold tracking-tight mb-6 text-foreground">Key capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.features.map((f, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="w-2 h-2 rounded-full mb-3" style={{ background: service.accentColor }} />
                    <h3 className="text-sm font-bold text-foreground mb-1.5">{f.title}</h3>
                    <p className="text-sm text-text-2 font-light leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Supported Technologies */}
          <div className="mb-16">
            <h2 className="text-xl font-bold tracking-tight mb-4 text-foreground">What it connects</h2>
            <div className="flex flex-wrap gap-2">
              {service.capabilities.map((c) => (
                <Badge key={c} variant="outline" className="text-xs font-medium">{c}</Badge>
              ))}
            </div>
          </div>

          {/* Use Cases */}
          <div ref={useCaseRef} className="reveal-element mb-16">
            <h2 className="text-xl font-bold tracking-tight mb-6 text-foreground">Real-world use cases</h2>
            <div className="space-y-4">
              {service.useCases.map((uc, i) => (
                <div key={i} className="border border-border rounded-lg p-5 bg-card">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: service.accentColor }} />
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-1">{uc.scenario}</h3>
                      <p className="text-sm text-text-2 font-light leading-relaxed">{uc.outcome}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-8 border-t border-border">
            <p className="text-lg font-semibold text-foreground mb-2">Ready to use {service.title}?</p>
            <p className="text-sm text-text-2 mb-6">{service.cta.hint}</p>
            <Button asChild size="lg" className="px-8">
              <a href={service.cta.href}>{service.cta.label}</a>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
