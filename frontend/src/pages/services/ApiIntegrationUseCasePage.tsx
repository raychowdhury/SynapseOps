import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  Activity,
  Webhook,
  Workflow,
  Clock,
  Zap,
  History as HistoryIcon,
  AlertCircle,
  ChevronRight,
  Search,
  RefreshCw,
  Play,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SharedDashboardLayout from "@/components/shared/SharedDashboardLayout";
import KPICard from "@/components/shared/KPICard";
import {
  type DeadLetter,
  type FlowSummary,
  type Run,
  type WebhookResponse,
  getDeadLetters,
  getFlows,
  getFlowRuns,
  replayDeadLetter,
  sendWebhook as sendWebhookRequest,
} from "@/api/apiIntegration";
import WebhookSimulator from "@/components/api-integration/WebhookSimulator";
import RunHistoryTable from "@/components/api-integration/RunHistoryTable";
import DeadLetterPanel from "@/components/api-integration/DeadLetterPanel";
import { toast } from "sonner";

type UseCaseOption = {
  rank: number;
  name: string;
  slug: string;
  demand: string;
  complexity: string;
  headline: string;
  description: string;
};

const useCaseOptions: UseCaseOption[] = [
  { rank: 1, name: "E-commerce order sync", slug: "ecommerce-order-sync", demand: "Extremely High", complexity: "Medium–High", headline: "E-commerce Order Sync", description: "Receive Shopify order webhooks, map payloads to ERP schema, run resilient delivery with retries." },
];

const ecommerceConnectSteps = [
  {
    title: "1. Configure Shopify Webhook",
    detail: "In Shopify Admin, create an orders/create webhook pointing to your SynapseOps ingress endpoint.",
    value: "POST /api/v1/api-integration/webhooks/shopify/orders-create",
  },
  {
    title: "2. Confirm Flow + ERP Auth",
    detail: "Ensure the 'Shopify -> ERP Order Sync' flow is enabled and ERP credentials are valid.",
    value: "GET /api/v1/api-integration/flows",
  },
  {
    title: "3. Send a Test Order",
    detail: "Use the simulator to post a sample order payload and trigger a full map + delivery execution.",
    value: "Webhook Simulator",
  },
  {
    title: "4. Verify + Recover",
    detail: "Review run status and latency. If a delivery fails, replay it from the Dead Letter Queue.",
    value: "Run History + DLQ Replay",
  },
];

export default function ApiIntegrationUseCasePage() {
  const { useCaseSlug } = useParams<{ useCaseSlug: string }>();

  const normalizedSlug = useMemo(() => {
    if (useCaseSlug === "e-commerce-order-sync") return "ecommerce-order-sync";
    return useCaseSlug;
  }, [useCaseSlug]);

  const selectedUseCase = normalizedSlug ? useCaseOptions.find((item) => item.slug === normalizedSlug) : null;

  const [webhookPayload, setWebhookPayload] = useState(JSON.stringify({
    id: 1001,
    total_price: "149.99",
    currency: "USD",
    shipping_address: { city: "Austin" },
    line_items: [
      { title: "Wireless Mouse", quantity: 1, price: "49.99" },
      { title: "Mechanical Keyboard", quantity: 1, price: "100.00" },
    ],
  }, null, 2));

  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<WebhookResponse | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [, setFlowError] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [deadLetters, setDeadLetters] = useState<DeadLetter[]>([]);
  const [deadLettersLoading, setDeadLettersLoading] = useState(false);
  const [deadLettersError, setDeadLettersError] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "simulator" | "history" | "dlq">("overview");

  const isEcommerceOrderSync = selectedUseCase?.slug === "ecommerce-order-sync";

  const pickFlowId = useCallback((flows: FlowSummary[]): string | null => {
    const preferred = flows.find((item) => item.name === "Shopify -> ERP Order Sync");
    return preferred?.id ?? flows.find(f => f.is_enabled)?.id ?? flows[0]?.id ?? null;
  }, []);

  const refreshRuns = useCallback(async () => {
    if (!isEcommerceOrderSync || !flowId) return;
    setRunsLoading(true);
    try {
      const data = await getFlowRuns(flowId);
      setRuns(data);
    } catch (error) {
      setRunsError(error instanceof Error ? error.message : "Failed to fetch runs");
    } finally {
      setRunsLoading(false);
    }
  }, [flowId, isEcommerceOrderSync]);

  const refreshDeadLetters = useCallback(async () => {
    if (!isEcommerceOrderSync) return;
    setDeadLettersLoading(true);
    try {
      const data = await getDeadLetters();
      setDeadLetters(data);
    } catch (error) {
      setDeadLettersError(error instanceof Error ? error.message : "Failed to fetch DLQ");
    } finally {
      setDeadLettersLoading(false);
    }
  }, [isEcommerceOrderSync]);

  const handleSendWebhook = useCallback(async () => {
    setWebhookLoading(true);
    setWebhookError(null);
    try {
      const parsed = JSON.parse(webhookPayload);
      const response = await sendWebhookRequest(parsed);
      setWebhookResponse(response);
      if (response.flow_id) setFlowId(response.flow_id);
      toast.success("Webhook processed successfully");
      await Promise.all([refreshRuns(), refreshDeadLetters()]);
    } catch (error) {
      setWebhookError(error instanceof Error ? error.message : "Failed to send");
      toast.error("Failed to process webhook");
    } finally {
      setWebhookLoading(false);
    }
  }, [refreshDeadLetters, refreshRuns, webhookPayload]);

  const handleReplayDeadLetter = useCallback(async (id: string) => {
    setReplayingId(id);
    try {
      await replayDeadLetter(id);
      toast.success("Event replayed");
      await Promise.all([refreshRuns(), refreshDeadLetters()]);
    } catch (error) {
      toast.error("Replay failed");
    } finally {
      setReplayingId(null);
    }
  }, [refreshDeadLetters, refreshRuns]);

  useEffect(() => {
    if (!isEcommerceOrderSync) return;
    const loadFlow = async () => {
      try {
        const flows = await getFlows();
        const resolved = pickFlowId(flows);
        if (resolved) setFlowId(resolved);
        else setFlowError("No active flows found");
      } catch (e) { setFlowError("Backend unavailable"); }
    };
    void loadFlow();
  }, [isEcommerceOrderSync, pickFlowId]);

  useEffect(() => {
    if (isEcommerceOrderSync && flowId) {
      void Promise.all([refreshRuns(), refreshDeadLetters()]);
    }
  }, [flowId, isEcommerceOrderSync, refreshDeadLetters, refreshRuns]);

  if (!selectedUseCase) return <Navigate to="/services/api-integration" replace />;

  const stats = [
    { label: "Total Runs", value: `${runs.length}`, subtitle: "last 30 days", icon: <Activity className="w-5 h-5 text-blue-400" />, gradient: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/20" },
    { label: "Completion Rate", value: runs.length > 0 ? `${Math.round((runs.filter(r => r.status === "completed").length / runs.length) * 100)}%` : "0%", subtitle: "average success", icon: <Zap className="w-5 h-5 text-emerald-400" />, gradient: "from-emerald-500 to-green-600", glow: "shadow-emerald-500/20" },
    { label: "Avg Latency", value: "24ms", subtitle: "edge processing", icon: <Clock className="w-5 h-5 text-violet-400" />, gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/20" },
    { label: "DLQ Depth", value: `${deadLetters.length}`, subtitle: "awaiting replay", icon: <AlertCircle className="w-5 h-5 text-rose-400" />, gradient: "from-rose-500 to-pink-600", glow: "shadow-rose-500/20" },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: <Search className="w-4 h-4" /> },
    { id: "simulator", label: "Simulator", icon: <Play className="w-4 h-4" /> },
    { id: "history", label: "History", icon: <HistoryIcon className="w-4 h-4" /> },
    { id: "dlq", label: "Dead Letter", icon: <AlertCircle className="w-4 h-4" />, count: deadLetters.length },
  ] as const;

  return (
    <SharedDashboardLayout
      title={selectedUseCase.name}
      subtitle={selectedUseCase.description}
      titleIcon={<Webhook className="w-6 h-6 text-white" />}
      accentGradient="from-blue-500 to-indigo-600"
      headerActions={
        <button onClick={() => setActiveTab("simulator")} className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white hover:bg-white/[0.1] transition-all flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Test Webhook
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <KPICard key={s.label} {...s} />)}
      </div>

      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id ? "bg-white/[0.06] text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-blue-400" />
                  Integration Infographic
                </h3>
                <div className="grid gap-4 md:grid-cols-[1fr_auto_1.2fr_auto_1fr] items-stretch">
                  <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Source</p>
                    <p className="text-sm font-bold">Shopify Webhook</p>
                    <p className="text-[11px] text-blue-400 font-mono mt-2">orders/create</p>
                  </div>
                  <div className="hidden md:flex items-center justify-center">
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                  </div>
                  <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/[0.05]">
                    <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-1">Middleware</p>
                    <p className="text-sm font-bold">SynapseOps Ingress</p>
                    <div className="space-y-1 mt-2">
                      {["Payload Mapping", "Resilience Layer", "Auth Proxy"].map(step => (
                        <div key={step} className="flex items-center gap-2 text-[10px] text-slate-400">
                          <div className="w-1 h-1 rounded-full bg-blue-500" />
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center justify-center">
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                  </div>
                  <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Destination</p>
                    <p className="text-sm font-bold">ERP REST API</p>
                    <p className="text-[11px] text-emerald-400 font-mono mt-2">POST /api/v1/orders</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ecommerceConnectSteps.map((step, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    <p className="text-sm font-bold mb-1">{step.title}</p>
                    <p className="text-xs text-slate-500 mb-3">{step.detail}</p>
                    <div className="px-3 py-2 rounded-lg bg-black/20 border border-white/[0.04] text-[11px] font-mono text-blue-400 truncate">
                      {step.value}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "simulator" && (
            <motion.div key="simulator" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
              <WebhookSimulator
                payload={webhookPayload}
                onPayloadChange={setWebhookPayload}
                onSend={handleSendWebhook}
                loading={webhookLoading}
                response={webhookResponse}
                error={webhookError}
              />
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-sm font-bold">Run History</h3>
                <button onClick={refreshRuns} className="p-1.5 hover:bg-white/[0.05] rounded-lg transition-colors">
                  <RefreshCw className={`w-4 h-4 text-slate-500 ${runsLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="p-4">
                <RunHistoryTable runs={runs} loading={runsLoading} error={runsError} onRefresh={refreshRuns} />
              </div>
            </motion.div>
          )}

          {activeTab === "dlq" && (
            <motion.div key="dlq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.02] overflow-hidden">
                <div className="px-5 py-4 border-b border-rose-500/20 flex items-center justify-between bg-rose-500/[0.03]">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm font-bold text-rose-100">Dead Letter Queue</h3>
                  </div>
                  <button onClick={refreshDeadLetters} className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors">
                    <RefreshCw className={`w-4 h-4 text-rose-500 ${deadLettersLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <div className="p-4">
                  <DeadLetterPanel
                    items={deadLetters}
                    loading={deadLettersLoading}
                    error={deadLettersError}
                    replayingId={replayingId}
                    onRefresh={refreshDeadLetters}
                    onReplay={handleReplayDeadLetter}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SharedDashboardLayout>
  );
}
