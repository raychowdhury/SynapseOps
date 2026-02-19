import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
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
    Archive
} from "lucide-react";
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

const STATUS_STYLES: Record<string, string> = {
    received: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    processing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    processed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    settled: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    dead_letter: "bg-red-800/20 text-red-300 border-red-800/30",
};

const CB_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    closed: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Healthy" },
    open: { bg: "bg-red-500/20", text: "text-red-400", label: "Tripped" },
    half_open: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Recovering" },
};

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

export default function PaymentGatewayPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<GatewayStats | null>(null);
    const [events, setEvents] = useState<PaymentEvent[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [deadLetters, setDeadLetters] = useState<DeadLetterEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"events" | "settlements" | "deadletter">("settlements");
    const [replayingId, setReplayingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [s, e, set, dl] = await Promise.all([
                fetchStats(),
                fetchEvents(),
                fetchSettlements(),
                fetchDeadLetter(),
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            {/* ── Header ─────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-slate-800/60">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/services/api-integration")}
                            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight">Payment Gateway</h1>
                                <p className="text-xs text-slate-400">Stripe → Finance Settlement Pipeline</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${cbStyle.bg} border border-white/5`}>
                            <Shield className={`w-3.5 h-3.5 ${cbStyle.text}`} />
                            <span className={`text-xs font-medium ${cbStyle.text}`}>Circuit: {cbStyle.label}</span>
                        </div>
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
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

                {/* ── Mini Stats Row ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MiniStat label="Total Events" value={stats?.totalEvents ?? 0} icon={<Zap className="w-4 h-4 text-blue-400" />} />
                    <MiniStat label="Total Settlements" value={stats?.totalSettlements ?? 0} icon={<Activity className="w-4 h-4 text-emerald-400" />} />
                    <MiniStat label="Replay Attempts" value={stats?.replayAttempts ?? 0} icon={<RotateCcw className="w-4 h-4 text-purple-400" />} />
                    <MiniStat label="Dead Letters" value={stats?.deadLetterCount ?? 0} icon={<Archive className="w-4 h-4 text-red-400" />} />
                </div>

                {/* ── Tab Navigation ─────────────────────────────────────── */}
                <div className="flex gap-1 p-1 bg-slate-800/40 rounded-xl border border-slate-700/40 w-fit">
                    {([
                        { key: "settlements" as const, label: "Settlements", count: settlements.length },
                        { key: "events" as const, label: "Events", count: events.length },
                        { key: "deadletter" as const, label: "Dead Letter", count: deadLetters.length },
                    ]).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === tab.key
                                    ? "bg-slate-700/80 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                }`}
                        >
                            {tab.label}
                            <span className={`text-xs px-1.5 py-0.5 rounded-md ${activeTab === tab.key ? "bg-slate-600 text-slate-200" : "bg-slate-700/50 text-slate-500"
                                }`}>
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
                            <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 backdrop-blur-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700/40">
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Amount</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Destination</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Status</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Finance Ref</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Attempts</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Time</th>
                                                <th className="text-right px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/20">
                                            {settlements.map((s) => (
                                                <tr key={s.id} className="hover:bg-slate-700/10 transition-colors group">
                                                    <td className="px-5 py-3.5 font-mono font-semibold text-white">
                                                        {formatCurrency(s.amountCents, s.currency)}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-300 font-mono text-xs">{s.destination}</td>
                                                    <td className="px-5 py-3.5">
                                                        <StatusBadge status={s.status} />
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
                                                        {s.financeRef || "—"}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-700/40 text-xs text-slate-300">
                                                            {s.attempts}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-400 text-xs">{timeAgo(s.createdAt)}</td>
                                                    <td className="px-5 py-3.5 text-right">
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
                                                        {s.status === "settled" && (
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {settlements.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="text-center py-12 text-slate-500">No settlements found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === "events" && (
                            <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 backdrop-blur-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700/40">
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Event ID</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Type</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Status</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Idempotency Key</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/20">
                                            {events.map((e) => (
                                                <tr key={e.id} className="hover:bg-slate-700/10 transition-colors">
                                                    <td className="px-5 py-3.5 text-slate-200 font-mono text-xs">{e.stripeEventId}</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/10">
                                                            <Zap className="w-3 h-3" />
                                                            {e.eventType}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <StatusBadge status={e.status} />
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs truncate max-w-[200px]">{e.idempotencyKey}</td>
                                                    <td className="px-5 py-3.5 text-slate-400 text-xs">{timeAgo(e.createdAt)}</td>
                                                </tr>
                                            ))}
                                            {events.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-12 text-slate-500">No events found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === "deadletter" && (
                            <div className="rounded-2xl border border-red-900/30 bg-red-950/10 backdrop-blur-lg overflow-hidden">
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
                                                <tr>
                                                    <td colSpan={3} className="text-center py-12 text-red-400/40">No dead-letter entries — all settlements healthy ✓</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────

function KPICard({
    label,
    value,
    subtitle,
    icon,
    gradient,
    glow,
}: {
    label: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    gradient: string;
    glow: string;
}) {
    return (
        <div className="group relative rounded-2xl border border-slate-700/40 bg-slate-800/20 backdrop-blur-lg p-5 hover:border-slate-600/50 transition-all duration-300 overflow-hidden">
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-2xl font-bold tracking-tight">{value}</p>
                    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${glow}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-700/30 bg-slate-800/10 px-4 py-3">
            {icon}
            <div>
                <p className="text-lg font-semibold leading-none">{value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const style = STATUS_STYLES[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${style}`}>
            {status === "settled" && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {status === "failed" && <XCircle className="w-3 h-3 mr-1" />}
            {status === "pending" && <Clock className="w-3 h-3 mr-1" />}
            {status === "dead_letter" && <AlertTriangle className="w-3 h-3 mr-1" />}
            {status.replace("_", " ")}
        </span>
    );
}
