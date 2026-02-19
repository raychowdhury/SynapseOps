import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Database,
    Activity,
    Zap,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Play,
    BarChart3,
    GitBranch,
    CreditCard,
    FileText,
    Layers,
    RefreshCw,
} from "lucide-react";
import {
    fetchSources,
    fetchRuns,
    fetchWarehouse,
    fetchEvents,
    fetchStats,
    fetchDeadLetter,
    triggerIngestion,
    type DataSource,
    type IngestionRun,
    type WarehouseRecord,
    type AggEvent,
    type AggStats,
    type DeadLetterAgg,
} from "@/lib/dataAggregation";

// ── Helpers ─────────────────────────────────────────────────────

function badge(status: string) {
    const map: Record<string, string> = {
        active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        running: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        failed: "bg-red-500/20 text-red-300 border-red-500/30",
        dead_letter: "bg-red-700/20 text-red-400 border-red-600/30",
        paused: "bg-gray-500/20 text-gray-300 border-gray-500/30",
        error: "bg-red-500/20 text-red-300 border-red-500/30",
        processing: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    };
    return map[status] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
}

function timeAgo(ts: string | null): string {
    if (!ts) return "—";
    const d = new Date(ts);
    const now = new Date();
    const s = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

function fmtMs(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

const sourceIcon = (t: string) => {
    if (t === "github") return <GitBranch className="w-4 h-4" />;
    if (t === "stripe") return <CreditCard className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
};

const sourceColor = (t: string) => {
    if (t === "github") return "from-purple-500/20 to-purple-600/10 border-purple-500/30";
    if (t === "stripe") return "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30";
    return "from-teal-500/20 to-teal-600/10 border-teal-500/30";
};

// ── Component ───────────────────────────────────────────────────

export default function DataAggregationPage() {
    const nav = useNavigate();

    const [sources, setSources] = useState<DataSource[]>([]);
    const [runs, setRuns] = useState<IngestionRun[]>([]);
    const [warehouse, setWarehouse] = useState<WarehouseRecord[]>([]);
    const [events, setEvents] = useState<AggEvent[]>([]);
    const [stats, setStats] = useState<AggStats | null>(null);
    const [deadLetter, setDeadLetter] = useState<DeadLetterAgg[]>([]);
    const [tab, setTab] = useState<"runs" | "warehouse" | "events" | "dead-letter">("runs");
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState<string | null>(null);

    const load = async () => {
        try {
            const [s, r, w, e, st, dl] = await Promise.all([
                fetchSources(),
                fetchRuns(),
                fetchWarehouse(),
                fetchEvents(),
                fetchStats(),
                fetchDeadLetter(),
            ]);
            setSources(s);
            setRuns(r);
            setWarehouse(w);
            setEvents(e);
            setStats(st);
            setDeadLetter(dl);
        } catch {
            /* fallback */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleTrigger = async (sourceId: string) => {
        setTriggering(sourceId);
        try {
            await triggerIngestion(sourceId);
            await load();
        } finally {
            setTriggering(null);
        }
    };

    // ── KPI data ──────────────────────────────────────────────────
    const kpis = stats
        ? [
            { label: "Total Records", value: stats.totalWarehouseRecords.toLocaleString(), icon: Database, color: "from-violet-500 to-purple-600" },
            { label: "Avg Latency", value: fmtMs(stats.avgLatencyMs), icon: Clock, color: "from-cyan-500 to-blue-600" },
            { label: "Active Sources", value: stats.activeSources, icon: Activity, color: "from-emerald-500 to-green-600" },
            { label: "Dead Letter", value: stats.deadLetterCount, icon: AlertTriangle, color: stats.deadLetterCount > 0 ? "from-red-500 to-rose-600" : "from-gray-500 to-slate-600" },
        ]
        : [];

    const tabs = [
        { key: "runs" as const, label: "Runs", count: runs.length },
        { key: "warehouse" as const, label: "Warehouse", count: warehouse.length },
        { key: "events" as const, label: "Events", count: events.length },
        { key: "dead-letter" as const, label: "Dead Letter", count: deadLetter.length },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="border-b border-white/[0.06] bg-gradient-to-r from-[#0a0a0f] via-[#10101a] to-[#0a0a0f]">
                <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => nav("/services/api-integration")} className="p-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
                            <ArrowLeft className="w-4 h-4 text-white/60" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30">
                                    <Layers className="w-5 h-5 text-violet-400" />
                                </div>
                                <h1 className="text-xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                    Data Aggregation
                                </h1>
                            </div>
                            <p className="text-sm text-white/40 mt-1 ml-11">Multi-source ingestion pipeline — Run Health Dashboard</p>
                        </div>
                    </div>
                    <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-sm text-white/60 hover:text-white/80">
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500" />
                    </div>
                ) : (
                    <>
                        {/* ── KPI Cards ────────────────────────────────────── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {kpis.map((k) => (
                                <div key={k.label} className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#12121a] p-5">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${k.color} opacity-[0.06]`} />
                                    <div className="relative flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-white/40 uppercase tracking-wider font-medium">{k.label}</p>
                                            <p className="text-2xl font-bold mt-1">{k.value}</p>
                                        </div>
                                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${k.color} bg-opacity-20`}>
                                            <k.icon className="w-5 h-5 text-white/80" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Source Cards ──────────────────────────────────── */}
                        <div>
                            <h2 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-violet-400" /> Data Sources
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {sources.map((src) => {
                                    const srcRuns = runs.filter((r) => r.sourceId === src.id);
                                    const lastRun = srcRuns[0];
                                    const totalIngested = srcRuns.reduce((a, r) => a + r.recordsIngested, 0);
                                    return (
                                        <div key={src.id} className={`rounded-xl border bg-gradient-to-br ${sourceColor(src.sourceType)} p-5 space-y-3`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {sourceIcon(src.sourceType)}
                                                    <span className="font-medium text-sm">{src.label}</span>
                                                </div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge(src.status)}`}>
                                                    {src.status}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-white/50">
                                                <div>
                                                    <p className="text-white/30">Last Run</p>
                                                    <p className="text-white/70">{lastRun ? timeAgo(lastRun.startedAt) : "Never"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-white/30">Records</p>
                                                    <p className="text-white/70">{totalIngested.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-white/30">Runs</p>
                                                    <p className="text-white/70">{srcRuns.length}</p>
                                                </div>
                                                <div>
                                                    <p className="text-white/30">Latency</p>
                                                    <p className="text-white/70">{lastRun ? fmtMs(lastRun.latencyMs) : "—"}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleTrigger(src.id)}
                                                disabled={triggering === src.id}
                                                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-xs text-white/60 hover:text-white/80 disabled:opacity-40"
                                            >
                                                {triggering === src.id ? (
                                                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-violet-400" />
                                                ) : (
                                                    <Play className="w-3 h-3" />
                                                )}
                                                Trigger Ingestion
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Tabs ─────────────────────────────────────────── */}
                        <div>
                            <div className="flex gap-1 border-b border-white/[0.06] mb-4">
                                {tabs.map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setTab(t.key)}
                                        className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${tab === t.key
                                                ? "border-violet-500 text-white"
                                                : "border-transparent text-white/40 hover:text-white/60"
                                            }`}
                                    >
                                        {t.label}
                                        <span className="ml-1.5 text-xs text-white/30">({t.count})</span>
                                    </button>
                                ))}
                            </div>

                            {/* ── Runs Table ────────────────────────────────── */}
                            {tab === "runs" && (
                                <div className="rounded-xl border border-white/[0.06] bg-[#12121a] overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                                                <th className="text-left px-5 py-3 font-medium">Source</th>
                                                <th className="text-left px-5 py-3 font-medium">Status</th>
                                                <th className="text-right px-5 py-3 font-medium">Ingested</th>
                                                <th className="text-right px-5 py-3 font-medium">Upserted</th>
                                                <th className="text-right px-5 py-3 font-medium">Latency</th>
                                                <th className="text-left px-5 py-3 font-medium">Started</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {runs.map((r) => {
                                                const src = sources.find((s) => s.id === r.sourceId);
                                                return (
                                                    <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-5 py-3 flex items-center gap-2">
                                                            {sourceIcon(src?.sourceType ?? "")}
                                                            <span className="text-white/70">{src?.label ?? r.sourceId.slice(0, 8)}</span>
                                                        </td>
                                                        <td className="px-5 py-3">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge(r.status)}`}>
                                                                {r.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 text-right text-white/60 font-mono text-xs">{r.recordsIngested.toLocaleString()}</td>
                                                        <td className="px-5 py-3 text-right text-white/60 font-mono text-xs">{r.recordsUpserted.toLocaleString()}</td>
                                                        <td className="px-5 py-3 text-right font-mono text-xs">
                                                            <span className={r.latencyMs > 3000 ? "text-amber-400" : "text-emerald-400"}>{fmtMs(r.latencyMs)}</span>
                                                        </td>
                                                        <td className="px-5 py-3 text-white/40 text-xs">{timeAgo(r.startedAt)}</td>
                                                    </tr>
                                                );
                                            })}
                                            {runs.length === 0 && (
                                                <tr><td colSpan={6} className="px-5 py-8 text-center text-white/30">No ingestion runs yet</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* ── Warehouse Table ──────────────────────────── */}
                            {tab === "warehouse" && (
                                <div className="rounded-xl border border-white/[0.06] bg-[#12121a] overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                                                <th className="text-left px-5 py-3 font-medium">Source</th>
                                                <th className="text-left px-5 py-3 font-medium">Type</th>
                                                <th className="text-left px-5 py-3 font-medium">External ID</th>
                                                <th className="text-left px-5 py-3 font-medium">Preview</th>
                                                <th className="text-left px-5 py-3 font-medium">Ingested</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {warehouse.map((w) => (
                                                <tr key={w.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-5 py-3 flex items-center gap-2">
                                                        {sourceIcon(w.sourceType)}
                                                        <span className="text-white/70 capitalize">{w.sourceType.replace("_", " ")}</span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">{w.entityType}</span>
                                                    </td>
                                                    <td className="px-5 py-3 font-mono text-xs text-white/50">{w.externalId}</td>
                                                    <td className="px-5 py-3 text-xs text-white/40 max-w-[200px] truncate">
                                                        {(w.canonicalData as Record<string, unknown>).action as string ?? JSON.stringify(w.canonicalData).slice(0, 60)}
                                                    </td>
                                                    <td className="px-5 py-3 text-white/40 text-xs">{timeAgo(w.ingestedAt)}</td>
                                                </tr>
                                            ))}
                                            {warehouse.length === 0 && (
                                                <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">No warehouse records</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* ── Events Table ──────────────────────────────── */}
                            {tab === "events" && (
                                <div className="rounded-xl border border-white/[0.06] bg-[#12121a] overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                                                <th className="text-left px-5 py-3 font-medium">Type</th>
                                                <th className="text-left px-5 py-3 font-medium">Status</th>
                                                <th className="text-center px-5 py-3 font-medium">Attempts</th>
                                                <th className="text-left px-5 py-3 font-medium">Source</th>
                                                <th className="text-left px-5 py-3 font-medium">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {events.map((e) => (
                                                <tr key={e.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <BarChart3 className="w-3.5 h-3.5 text-violet-400" />
                                                            <span className="text-white/70 text-xs">{e.eventType}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge(e.status)}`}>
                                                            {e.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-center text-white/50 font-mono text-xs">{e.attempts}</td>
                                                    <td className="px-5 py-3 text-white/40 text-xs capitalize">
                                                        {(e.payload.source as string) ?? e.sourceId.slice(0, 8)}
                                                    </td>
                                                    <td className="px-5 py-3 text-white/40 text-xs">{timeAgo(e.createdAt)}</td>
                                                </tr>
                                            ))}
                                            {events.length === 0 && (
                                                <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">No events</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* ── Dead Letter Table ─────────────────────────── */}
                            {tab === "dead-letter" && (
                                <div className="rounded-xl border border-white/[0.06] bg-[#12121a] overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                                                <th className="text-left px-5 py-3 font-medium">Event ID</th>
                                                <th className="text-left px-5 py-3 font-medium">Error</th>
                                                <th className="text-left px-5 py-3 font-medium">Failed At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deadLetter.map((dl) => (
                                                <tr key={dl.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-5 py-3 font-mono text-xs text-white/50">{dl.eventId.slice(0, 12)}…</td>
                                                    <td className="px-5 py-3 text-xs text-red-400/80">{dl.error}</td>
                                                    <td className="px-5 py-3 text-white/40 text-xs">{timeAgo(dl.failedAt)}</td>
                                                </tr>
                                            ))}
                                            {deadLetter.length === 0 && (
                                                <tr><td colSpan={3} className="px-5 py-8 text-center text-white/30">No dead-letter entries</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* ── Pipeline Summary ──────────────────────────────── */}
                        {stats && (
                            <div className="rounded-xl border border-white/[0.06] bg-[#12121a] p-6">
                                <h3 className="text-sm font-medium text-white/50 mb-4 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-violet-400" /> Pipeline Summary
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
                                    {[
                                        { label: "Total Runs", value: stats.totalRuns, icon: Activity },
                                        { label: "Completed", value: stats.completedRuns, icon: CheckCircle2 },
                                        { label: "Failed", value: stats.failedRuns, icon: XCircle },
                                        { label: "Ingested", value: stats.totalRecordsIngested.toLocaleString(), icon: Database },
                                        { label: "Upserted", value: stats.totalRecordsUpserted.toLocaleString(), icon: Layers },
                                        { label: "Pending Events", value: stats.pendingEvents, icon: Clock },
                                    ].map((s) => (
                                        <div key={s.label} className="space-y-1">
                                            <s.icon className="w-4 h-4 mx-auto text-white/30" />
                                            <p className="text-lg font-semibold">{s.value}</p>
                                            <p className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
