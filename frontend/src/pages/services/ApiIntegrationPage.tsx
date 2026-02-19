import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Code2,
  Cpu,
  Globe,
  Key,
  Layers,
  LayoutGrid,
  Play,
  RefreshCw,
  Shield,
  Shuffle,
  Sparkles,
  Zap,
  ChevronRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SharedDashboardLayout from "@/components/shared/SharedDashboardLayout";
import KPICard from "@/components/shared/KPICard";
import StatusBadge from "@/components/shared/StatusBadge";
import ProBadge from "@/components/shared/ProBadge";
import {
  type DeadLetter,
  type Run,
  type WebhookResponse,
  getDeadLetters,
  getFlowRuns,
  replayDeadLetter,
  sendWebhook as sendWebhookRequest,
} from "@/api/apiIntegration";
import WebhookSimulator from "@/components/api-integration/WebhookSimulator";
import RunHistoryTable from "@/components/api-integration/RunHistoryTable";
import DeadLetterPanel from "@/components/api-integration/DeadLetterPanel";

type UseCaseOption = { rank: number; name: string; slug: string; demand: string; complexity: string };

type UseCaseDetail = {
  headline: string;
  description: string;
  scenarios: { scenario: string; outcome: string }[];
};

const useCaseOptions: UseCaseOption[] = [
  { rank: 1, name: "E-commerce order sync", slug: "ecommerce-order-sync", demand: "Extremely High", complexity: "Medium–High" },
  { rank: 2, name: "Payment gateway integration", slug: "payment-gateway", demand: "Extremely High", complexity: "High" },
  { rank: 3, name: "CRM automation", slug: "crm-automation", demand: "High", complexity: "Medium" },
  { rank: 4, name: "SaaS notifications/workflows", slug: "saas-workflows", demand: "Very High", complexity: "Low–Medium" },
  { rank: 5, name: "Data aggregation", slug: "data-aggregation", demand: "High", complexity: "High" },
];

const useCaseDetails: Record<string, UseCaseDetail> = {
  "ecommerce-order-sync": {
    headline: "E-commerce order sync, end to end.",
    description: "Capture Shopify order events, transform payloads into ERP-compatible schema, and deliver through resilient outbound API calls with retry, DLQ, and replay controls.",
    scenarios: [
      { scenario: "Shopify to ERP order posting", outcome: "Incoming order webhooks are mapped and posted to ERP order APIs with deterministic transforms and run-level status visibility." },
      { scenario: "Failure-safe order delivery", outcome: "Transient API failures retry automatically; exhausted events move to DLQ for operator replay without data loss." },
      { scenario: "Ops-ready observability", outcome: "Each flow run stores latency, attempts, status, and last error so support teams can triage incidents quickly." },
    ],
  },
  "payment-gateway": {
    headline: "Payment gateway integration with reliability controls.",
    description: "Coordinate payment events across upstream systems with strong auth, idempotent mapping, and operational safeguards for failure and replay.",
    scenarios: [
      { scenario: "Gateway event routing", outcome: "Route authorization and settlement events into finance systems with schema-safe transformations." },
      { scenario: "Retry and breaker protection", outcome: "Protect downstream APIs with exponential backoff and circuit-breaker logic during incident windows." },
      { scenario: "Controlled replay workflows", outcome: "Replay failed payment messages from DLQ with traceable run history and audit confidence." },
    ],
  },
  "crm-automation": {
    headline: "CRM automation with deterministic data movement.",
    description: "Move lead, account, and contact events across systems using stable mapping definitions and robust API execution policies.",
    scenarios: [
      { scenario: "Lead lifecycle sync", outcome: "Push event-driven lead updates from source apps into CRM endpoints with strict field transforms." },
      { scenario: "Bi-system consistency", outcome: "Maintain alignment across sales and support tools with reliable retries and replay support." },
      { scenario: "Operational run tracking", outcome: "Track every automation run with status, latency, and error metadata for faster troubleshooting." },
    ],
  },
  "saas-workflows": {
    headline: "Real-time SaaS notifications and integrated workflows.",
    description: "Trigger and orchestrate SaaS actions with webhook ingestion and outbound API control. Integration failures trigger real-time alerts.",
    scenarios: [
      { scenario: "Notification fan-out", outcome: "Route one inbound event into multiple SaaS endpoints while preserving payload integrity." },
      { scenario: "Workflow retries", outcome: "Automatically retry failed workflow steps and isolate hard failures into dead-letter queues." },
      { scenario: "Replayable operations", outcome: "Operators can replay workflow failures with clear run diagnostics and outcome visibility." },
    ],
  },
  "data-aggregation": {
    headline: "Data aggregation with API-first orchestration.",
    description: "Aggregate structured events from diverse APIs into downstream systems with deterministic transformations and operational guardrails.",
    scenarios: [
      { scenario: "Multi-source ingestion", outcome: "Normalize payloads from varied APIs into one contract before delivery to target services." },
      { scenario: "Resilient aggregation pipelines", outcome: "Handle high-volume bursts with retries, breaker logic, and dead-letter recovery paths." },
      { scenario: "Observable data movement", outcome: "Run history reveals performance and failure trends for data operations teams." },
    ],
  },
};

const keyCapabilities = [
  { title: "Universal Protocol Support", desc: "REST, GraphQL, SOAP, and webhook integrations from one integration layer.", icon: Globe },
  { title: "Deterministic Mapping Engine", desc: "Dot-path rules, nested array mapping, and transforms for predictable outputs.", icon: Code2 },
  { title: "Smart Auth Management", desc: "API key, bearer token, and OAuth2 client credentials with credential reuse.", icon: Key },
  { title: "Resilience + Recovery", desc: "Retries, exponential backoff, circuit breaker, DLQ, and replay operations.", icon: Shield },
];

const defaultRealWorldUseCases = [
  { scenario: "E-commerce order sync", outcome: "Ingest Shopify webhooks, map to ERP schema, deliver with retry and replay safety." },
  { scenario: "Payment gateway integration", outcome: "Route payment events across fraud checks, ERP posting, and reconciliation APIs." },
  { scenario: "CRM automation", outcome: "Capture events, transform records, and keep customer state synchronized." },
];

// Template Library data
const TEMPLATES = [
  { name: "Shopify → ERP Orders", from: "Shopify", to: "ERP", gradient: "from-green-500 to-emerald-600", icon: Shuffle },
  { name: "Stripe → QuickBooks", from: "Stripe", to: "QuickBooks", gradient: "from-indigo-500 to-violet-600", icon: Zap },
  { name: "HubSpot → Mailchimp", from: "HubSpot", to: "Mailchimp", gradient: "from-orange-500 to-amber-600", icon: Sparkles },
  { name: "GitHub → Jira", from: "GitHub", to: "Jira", gradient: "from-purple-500 to-pink-600", icon: Cpu },
];

// Mock mapping code
const MOCK_MAPPING = `// Shopify → ERP Order Mapping
module.exports = {
  transform: (payload) => ({
    order_id: payload.id,
    total: parseFloat(payload.total_price),
    currency: payload.currency,
    shipping_city: payload.shipping_address?.city,
    line_items: payload.line_items.map(item => ({
      sku: item.title,
      qty: item.quantity,
      unit_price: parseFloat(item.price),
    })),
  }),
};`;

function demandBadge(demand: string) {
  const lower = demand.toLowerCase();
  if (lower.includes("extremely")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (lower.includes("very")) return "bg-sky-500/20 text-sky-400 border-sky-500/30";
  return "bg-slate-500/20 text-slate-400 border-slate-500/30";
}

function complexityBadge(complexity: string) {
  const lower = complexity.toLowerCase();
  if (lower.includes("high")) return "bg-red-500/20 text-red-400 border-red-500/30";
  if (lower.includes("medium")) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
}

export default function ApiIntegrationPage() {
  const { useCaseSlug } = useParams<{ useCaseSlug: string }>();
  const navigate = useNavigate();
  const [webhookPayload, setWebhookPayload] = useState(JSON.stringify({ id: 1001, total_price: "149.99", currency: "USD", shipping_address: { city: "Austin" }, line_items: [{ title: "Wireless Mouse", quantity: 1, price: "49.99" }, { title: "Mechanical Keyboard", quantity: 1, price: "100.00" }] }, null, 2));
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<WebhookResponse | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [deadLetters, setDeadLetters] = useState<DeadLetter[]>([]);
  const [deadLettersLoading, setDeadLettersLoading] = useState(false);
  const [deadLettersError, setDeadLettersError] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [ucModalOpen, setUcModalOpen] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string>(useCaseOptions[0]?.slug ?? "");
  const [activeTab, setActiveTab] = useState<"overview" | "use-cases" | "mapping" | "templates" | "simulator">("overview");

  const goToUseCase = (slug: string) => navigate(`/services/api-integration/${slug}`);

  const selectedUseCase = useCaseSlug ? useCaseOptions.find(i => i.slug === useCaseSlug) : null;
  const selectedDetail = selectedUseCase ? useCaseDetails[selectedUseCase.slug] : null;
  const displayedUseCases = selectedDetail?.scenarios || defaultRealWorldUseCases;
  const hasInvalidSlug = Boolean(useCaseSlug && !selectedUseCase);
  const isEcommerce = selectedUseCase?.slug === "ecommerce-order-sync";

  const openUcModal = () => { setPendingSlug(selectedUseCase?.slug ?? useCaseOptions[0]?.slug ?? ""); setUcModalOpen(true); };
  const handleLaunch = () => { if (!pendingSlug) return; setUcModalOpen(false); goToUseCase(pendingSlug); };

  const refreshRuns = useCallback(async () => {
    if (!isEcommerce) return;
    setRunsLoading(true); setRunsError(null);
    try { setRuns(await getFlowRuns(1)); } catch (e) { setRunsError(e instanceof Error ? e.message : "Failed"); }
    finally { setRunsLoading(false); }
  }, [isEcommerce]);

  const refreshDeadLetters = useCallback(async () => {
    if (!isEcommerce) return;
    setDeadLettersLoading(true); setDeadLettersError(null);
    try { setDeadLetters(await getDeadLetters()); } catch (e) { setDeadLettersError(e instanceof Error ? e.message : "Failed"); }
    finally { setDeadLettersLoading(false); }
  }, [isEcommerce]);

  const handleSendWebhook = useCallback(async () => {
    setWebhookLoading(true); setWebhookError(null);
    try {
      const parsed = JSON.parse(webhookPayload) as Record<string, unknown>;
      setWebhookResponse(await sendWebhookRequest(1, parsed));
      await Promise.all([refreshRuns(), refreshDeadLetters()]);
    } catch (e) {
      setWebhookError(e instanceof SyntaxError ? "Webhook payload must be valid JSON" : (e instanceof Error ? e.message : "Failed"));
    } finally { setWebhookLoading(false); }
  }, [refreshDeadLetters, refreshRuns, webhookPayload]);

  const handleReplay = useCallback(async (id: string) => {
    setReplayingId(id); setDeadLettersError(null);
    try { await replayDeadLetter(id); await Promise.all([refreshRuns(), refreshDeadLetters()]); }
    catch (e) { setDeadLettersError(e instanceof Error ? e.message : "Failed"); }
    finally { setReplayingId(null); }
  }, [refreshDeadLetters, refreshRuns]);

  useEffect(() => { if (isEcommerce) void Promise.all([refreshRuns(), refreshDeadLetters()]); }, [isEcommerce, refreshDeadLetters, refreshRuns]);

  if (hasInvalidSlug) return <Navigate to="/services/api-integration" replace />;

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "use-cases" as const, label: "Use Cases" },
    { key: "mapping" as const, label: "Mapping Builder" },
    { key: "templates" as const, label: "Templates" },
    ...(isEcommerce ? [{ key: "simulator" as const, label: "Simulator" }] : []),
  ];

  return (
    <SharedDashboardLayout
      title="API Integration"
      subtitle={selectedDetail?.headline ?? "Connect APIs with resilient, production-grade flows"}
      titleIcon={<LayoutGrid className="w-6 h-6 text-white" />}
      accentGradient="from-blue-500 to-indigo-600"
      headerActions={
        <button onClick={openUcModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all">
          <Play className="w-4 h-4" /> {selectedUseCase ? "Switch Use Case" : "Start Integration"}
        </button>
      }
    >
      {/* Active Use Case Banner */}
      {selectedUseCase && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-blue-500/20 bg-blue-500/5">
          <Zap className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium">Active: {selectedUseCase.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${demandBadge(selectedUseCase.demand)}`}>{selectedUseCase.demand}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${complexityBadge(selectedUseCase.complexity)}`}>{selectedUseCase.complexity}</span>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Connected Systems" value="8" subtitle="sources & destinations"
          icon={<Globe className="w-5 h-5" />} gradient="from-blue-500 to-cyan-600" glow="shadow-blue-500/20" />
        <KPICard label="Active Flows" value={`${useCaseOptions.length}`} subtitle="integration use-cases"
          icon={<Shuffle className="w-5 h-5" />} gradient="from-emerald-500 to-teal-600" glow="shadow-emerald-500/20" />
        <KPICard label="Total Runs" value={`${runs.length}`} subtitle="flow executions"
          icon={<Layers className="w-5 h-5" />} gradient="from-violet-500 to-purple-600" glow="shadow-violet-500/20" />
        <KPICard label="Dead Letters" value={`${deadLetters.length}`} subtitle="requiring attention"
          icon={<RefreshCw className="w-5 h-5" />} gradient={deadLetters.length > 0 ? "from-red-500 to-rose-600" : "from-gray-500 to-slate-600"} glow="shadow-red-500/20" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === t.key
              ? "bg-white/[0.06] text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Capabilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keyCapabilities.map((cap, i) => (
              <motion.div key={cap.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 hover:border-white/[0.1] transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center flex-shrink-0">
                    <cap.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div><h3 className="text-sm font-semibold mb-1">{cap.title}</h3><p className="text-xs text-slate-400 leading-relaxed">{cap.desc}</p></div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Integration Flow */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
            <h3 className="text-sm font-semibold mb-5 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-blue-400" /> Integration Flow</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sources */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Inbound Sources</p>
                {["Shopify", "Webhook Sources", "SaaS Apps"].map(s => (
                  <div key={s} className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2 mb-2 text-xs text-slate-300">{s}</div>
                ))}
              </div>
              {/* Engine */}
              <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4">
                <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-3">SynapseOps Engine</p>
                {["Auth adapters", "Mapping engine", "Retry & breaker", "Run observability"].map(s => (
                  <div key={s} className="text-xs text-blue-200 mb-1.5 flex items-center gap-2"><ChevronRight className="w-3 h-3 text-blue-500" />{s}</div>
                ))}
              </div>
              {/* Destinations */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Destinations</p>
                {["ERP APIs", "CRM Platforms", "Payment Gateways", "Data Warehouses"].map(s => (
                  <div key={s} className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2 mb-2 text-xs text-slate-300">{s}</div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Use Cases Tab */}
      {activeTab === "use-cases" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {displayedUseCases.map((uc, i) => (
            <motion.div key={uc.scenario} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 hover:border-white/[0.1] transition-all">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-2 bg-blue-400 flex-shrink-0" />
                <div><h3 className="text-sm font-semibold mb-1">{uc.scenario}</h3><p className="text-xs text-slate-400 leading-relaxed">{uc.outcome}</p></div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Mapping Builder Tab */}
      {activeTab === "mapping" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-2 mb-2"><Code2 className="w-5 h-5 text-blue-400" /><h3 className="text-sm font-semibold">Mapping Builder</h3><ProBadge /></div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.02]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <span className="text-[10px] text-slate-500 ml-2 font-mono">mapping.js</span>
            </div>
            <pre className="p-5 text-xs text-slate-300 font-mono leading-relaxed overflow-auto max-h-[400px] whitespace-pre-wrap">
              <code>{MOCK_MAPPING}</code>
            </pre>
          </div>
          <p className="text-[10px] text-slate-500 text-center">Edit mapping rules · Supports dot-path, nested arrays, and transformation functions</p>
        </motion.div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-5 h-5 text-blue-400" /><h3 className="text-sm font-semibold">Template Library</h3><ProBadge /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATES.map((tmpl, i) => (
              <motion.div key={tmpl.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 hover:border-white/[0.12] transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tmpl.gradient} flex items-center justify-center shadow-lg`}>
                    <tmpl.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{tmpl.name}</h4>
                    <p className="text-[10px] text-slate-500">{tmpl.from} to {tmpl.to}</p>
                  </div>
                </div>
                <button className="w-full py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all group-hover:border-white/[0.1]">
                  Use Template
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Webhook Simulator */}
      {activeTab === "simulator" && isEcommerce && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-blue-400" /> E-commerce Order Sync MVP</h3>
          <WebhookSimulator payload={webhookPayload} onPayloadChange={setWebhookPayload} onSend={handleSendWebhook} loading={webhookLoading} response={webhookResponse} error={webhookError} />
          <RunHistoryTable runs={runs} loading={runsLoading} error={runsError} onRefresh={refreshRuns} />
          <DeadLetterPanel items={deadLetters} loading={deadLettersLoading} error={deadLettersError} replayingId={replayingId} onRefresh={refreshDeadLetters} onReplay={handleReplay} />
        </motion.div>
      )}

      {/* Use Case Modal */}
      <AnimatePresence>
        {ucModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setUcModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/[0.08] bg-slate-950/95 backdrop-blur-2xl shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setUcModalOpen(false)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/[0.06] text-slate-400"><X className="w-4 h-4" /></button>
              <h2 className="text-lg font-semibold mb-1">Choose Integration Use Case</h2>
              <p className="text-xs text-slate-500 mb-5">Select a use case to open its dedicated page.</p>
              <select value={pendingSlug} onChange={e => setPendingSlug(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white focus:border-blue-500/50 focus:outline-none mb-4">
                {useCaseOptions.map(uc => (<option key={uc.slug} value={uc.slug}>#{uc.rank} {uc.name}</option>))}
              </select>
              {(() => {
                const pending = useCaseOptions.find(i => i.slug === pendingSlug);
                return pending ? (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 mb-5">
                    <p className="text-sm font-medium">#{pending.rank} {pending.name}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${demandBadge(pending.demand)}`}>{pending.demand}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${complexityBadge(pending.complexity)}`}>{pending.complexity}</span>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="flex gap-3 justify-end">
                <button onClick={() => setUcModalOpen(false)} className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all">Cancel</button>
                <button onClick={handleLaunch} disabled={!pendingSlug}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50">Continue</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SharedDashboardLayout>
  );
}
