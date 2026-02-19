import { useState, useEffect } from "react";
import {
    CreditCard,
    DollarSign,
    AlertTriangle,
    CheckCircle2,
    Clock,
    RefreshCw,
    Zap,
    Shield,
    RotateCcw,
    XCircle,
    TrendingUp,
    Activity,
    Archive,
    ChevronDown,
    ChevronUp,
    Gauge,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SharedDashboardLayout from "@/components/shared/SharedDashboardLayout";
import KPICard from "@/components/shared/KPICard";
import MiniStat from "@/components/shared/MiniStat";
import StatusBadge from "@/components/shared/StatusBadge";
import ProBadge from "@/components/shared/ProBadge";
import {
    fetchEvents,
    fetchSettlements,
    fetchStats,
    fetchDeadLetter,
    replaySettlement,
    type PaymentEvent,
    type Settlement,
    type GatewayStats,
    type DeadLetterEntry,
} from "@/lib/paymentGateway";

function formatCurrency(cents: number, currency = "usd"): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
    }).format(cents / 100);
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

const CB_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    closed: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Healthy" },
    open: { bg: "bg-red-500/20", text: "text-red-400", label: "Tripped" },
    half_open: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Recovering" },
};

export default function PaymentGatewayPage() {
    const [stats, setStats] = useState<GatewayStats | null>(null);
    const [events, setEvents] = useState<PaymentEvent[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [deadLetters, setDeadLetters] = useState<DeadLetterEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"settlements" | "events" | "deadletter">("settlements");
    const [replayingId, setReplayingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [s, e, set, dl] = await Promise.all([
                fetchStats(), fetchEvents(), fetchSettlements(), fetchDeadLetter(),
            ]);
            setStats(s);
            setEvents(e);
            setSettlements(set);
            setDeadLetters(dl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleReplay = async (id: string) => {
        try {
            setReplayingId(id);
            await replaySettlement(id, true);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Replay failed");
        } finally {
            setReplayingId(null);
        }
    };

    const cbStyle = CB_STYLES[stats?.circuitBreakerStatus || "closed"];

    // Settlement Health — STP (Straight-Through Processing) rate
    const stpRate = stats ? Math.round(((stats.settledCount) / Math.max(stats.totalSettlements, 1)) * 100) : 0;

    return (
        <SharedDashboardLayout
            title="Payment Gateway"
            subtitle="Stripe → Finance Settlement Pipeline"
            titleIcon={<CreditCard className="w-6 h-6 text-white" />}
            accentGradient="from-emerald-500 to-teal-600"
            headerActions={
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${cbStyle.bg} border border-white/5`}>
                        <Shield className={`w-3.5 h-3.5 ${cbStyle.text}`} />
                        <span className={`text-xs font-medium ${cbStyle.text}`}>Circuit: {cbStyle.label}</span>
                    </div>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            }
        >
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">✕</button>
                </div>
            )}

            {/* ── KPI Cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    label="Total Settled"
                    value={stats ? formatCurrency(stats.settledAmountCents) : "—"}
                    subtitle={`${stats?.settledCount ?? 0} transactions`}
                    icon={<DollarSign className="w-5 h-5" />}
                    gradient="from-emerald-500 to-teal-600"
                    glow="shadow-emerald-500/20"
                />
                <KPICard
                    label="Pending"
                    value={stats ? formatCurrency(stats.pendingAmountCents) : "—"}
                    subtitle={`${stats?.pendingCount ?? 0} awaiting`}
                    icon={<Clock className="w-5 h-5" />}
                    gradient="from-amber-500 to-orange-600"
                    glow="shadow-amber-500/20"
                />
                <KPICard
                    label="Failed / DLQ"
                    value={`${stats?.failedCount ?? 0} / ${stats?.deadLetterCount ?? 0}`}
                    subtitle="need attention"
                    icon={<AlertTriangle className="w-5 h-5" />}
                    gradient="from-red-500 to-rose-600"
                    glow="shadow-red-500/20"
                />
                <KPICard
                    label="Replay Success"
                    value={`${stats?.replaySuccessRate ?? 0}%`}
                    subtitle={`${stats?.replaySuccesses ?? 0} of ${stats?.replayAttempts ?? 0} replays`}
                    icon={<TrendingUp className="w-5 h-5" />}
                    gradient="from-violet-500 to-purple-600"
                    glow="shadow-violet-500/20"
                />
            </div>

            {/* ── Settlement Health + Mini Stats ─────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Settlement Health Ring */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 flex flex-col items-center justify-center gap-3"
                >
                    <div className="relative w-24 h-24">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(220 15% 15%)" strokeWidth="8" />
                            <circle
                                cx="50" cy="50" r="42" fill="none"
                                stroke={stpRate >= 80 ? "#10B981" : stpRate >= 50 ? "#F59E0B" : "#EF4444"}
                                strokeWidth="8" strokeLinecap="round"
                                strokeDasharray={`${stpRate * 2.64} 264`}
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold">{stpRate}%</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-medium text-white flex items-center gap-1"><Gauge className="w-3 h-3" /> Settlement Health</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Straight-Through Processing</p>
                    </div>
                    <ProBadge />
                </motion.div>

                {/* Mini Stats */}
                <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MiniStat label="Total Events" value={stats?.totalEvents ?? 0} icon={<Zap className="w-4 h-4 text-blue-400" />} />
                    <MiniStat label="Total Settlements" value={stats?.totalSettlements ?? 0} icon={<Activity className="w-4 h-4 text-emerald-400" />} />
                    <MiniStat label="Replay Attempts" value={stats?.replayAttempts ?? 0} icon={<RotateCcw className="w-4 h-4 text-purple-400" />} />
                    <MiniStat label="Dead Letters" value={stats?.deadLetterCount ?? 0} icon={<Archive className="w-4 h-4 text-red-400" />} />
                </div>
            </div>

            {/* ── Tab Navigation ─────────────────────────────────────── */}
            <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit">
                {([
                    { key: "settlements" as const, label: "Settlements", count: settlements.length },
                    { key: "events" as const, label: "Events", count: events.length },
                    { key: "deadletter" as const, label: "Dead Letter", count: deadLetters.length },
                ]).map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === tab.key
                            ? "bg-white/[0.06] text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                            }`}
                    >
                        {tab.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-md ${activeTab === tab.key ? "bg-white/[0.08] text-slate-200" : "bg-white/[0.04] text-slate-500"}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Data Tables ────────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                        <span className="text-slate-400 text-sm">Loading gateway data…</span>
                    </div>
                </div>
            ) : (
                <>
                    {activeTab === "settlements" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/[0.06]">
                                            <th className="w-8 px-3 py-3.5"></th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Amount</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Destination</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Status</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Finance Ref</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Attempts</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Time</th>
                                            <th className="text-right px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03]">
                                        {settlements.map((s) => (
                                            <>
                                                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}>
                                                    <td className="px-3 py-3.5 text-slate-500">
                                                        {expandedRow === s.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    </td>
                                                    <td className="px-5 py-3.5 font-mono font-semibold text-white">{formatCurrency(s.amountCents, s.currency)}</td>
                                                    <td className="px-5 py-3.5 text-slate-300 font-mono text-xs">{s.destination}</td>
                                                    <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                                                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{s.financeRef || "—"}</td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.04] text-xs text-slate-300">{s.attempts}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-400 text-xs">{timeAgo(s.createdAt)}</td>
                                                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                                        {(s.status === "failed" || s.status === "dead_letter") && (
                                                            <button
                                                                onClick={() => handleReplay(s.id)}
                                                                disabled={replayingId === s.id}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-medium transition-all disabled:opacity-50"
                                                            >
                                                                <RotateCcw className={`w-3 h-3 ${replayingId === s.id ? "animate-spin" : ""}`} />
                                                                Replay
                                                            </button>
                                                        )}
                                                        {s.status === "settled" && <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />}
                                                    </td>
                                                </tr>
                                                {/* ── Replay Engine Detail Panel ──────── */}
                                                <AnimatePresence>
                                                    {expandedRow === s.id && (
                                                        <tr key={`${s.id}-detail`}>
                                                            <td colSpan={8} className="p-0">
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.25 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="px-8 py-5 bg-white/[0.01] border-t border-white/[0.03] grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                        <div>
                                                                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Settlement ID</p>
                                                                            <p className="text-xs font-mono text-slate-300">{s.id}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Last Error</p>
                                                                            <p className="text-xs text-red-300">{s.lastError || "None"}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Retry Timeline</p>
                                                                            <div className="flex items-center gap-1">
                                                                                {Array.from({ length: Math.min(s.attempts, 5) }).map((_, i) => (
                                                                                    <div key={i} className={`w-4 h-1.5 rounded-full ${i < s.attempts - 1 ? "bg-red-500/40" : s.status === "settled" ? "bg-emerald-500" : "bg-red-500"}`} />
                                                                                ))}
                                                                                {s.attempts < 5 && Array.from({ length: 5 - s.attempts }).map((_, i) => (
                                                                                    <div key={`empty-${i}`} className="w-4 h-1.5 rounded-full bg-white/[0.06]" />
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        {(s.status === "failed" || s.status === "dead_letter") && (
                                                                            <div className="md:col-span-3">
                                                                                <button
                                                                                    onClick={() => handleReplay(s.id)}
                                                                                    disabled={replayingId === s.id}
                                                                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                                                                >
                                                                                    <RotateCcw className={`w-4 h-4 ${replayingId === s.id ? "animate-spin" : ""}`} />
                                                                                    Re-sync to Finance API
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </AnimatePresence>
                                            </>
                                        ))}
                                        {settlements.length === 0 && (
                                            <tr><td colSpan={8} className="text-center py-12 text-slate-500">No settlements found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "events" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/[0.06]">
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Event ID</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Type</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Status</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Idempotency Key</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03]">
                                        {events.map((e) => (
                                            <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-3.5 text-slate-200 font-mono text-xs">{e.stripeEventId}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/10">
                                                        <Zap className="w-3 h-3" />{e.eventType}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5"><StatusBadge status={e.status} /></td>
                                                <td className="px-5 py-3.5 text-slate-500 font-mono text-xs truncate max-w-[200px]">{e.idempotencyKey}</td>
                                                <td className="px-5 py-3.5 text-slate-400 text-xs">{timeAgo(e.createdAt)}</td>
                                            </tr>
                                        ))}
                                        {events.length === 0 && (
                                            <tr><td colSpan={5} className="text-center py-12 text-slate-500">No events found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "deadletter" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-red-900/30 bg-red-950/10 backdrop-blur-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-red-900/20 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                                    <XCircle className="w-4 h-4 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-red-200">Dead Letter Queue</h3>
                                    <p className="text-xs text-red-400/60">Settlements that exhausted all retry attempts</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-red-900/20">
                                            <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Settlement ID</th>
                                            <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Error</th>
                                            <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Failed At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-900/10">
                                        {deadLetters.map((dl) => (
                                            <tr key={dl.id} className="hover:bg-red-900/10 transition-colors">
                                                <td className="px-5 py-3.5 text-red-200 font-mono text-xs">{dl.settlementId.substring(0, 12)}…</td>
                                                <td className="px-5 py-3.5 text-red-300 text-xs max-w-md truncate">{dl.error}</td>
                                                <td className="px-5 py-3.5 text-red-400/60 text-xs">{timeAgo(dl.failedAt)}</td>
                                            </tr>
                                        ))}
                                        {deadLetters.length === 0 && (
                                            <tr><td colSpan={3} className="text-center py-12 text-red-400/40">No dead-letter entries — all settlements healthy ✓</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </>
            )}
        </SharedDashboardLayout>
    );
}
