import { useEffect, useState } from "react";
import {
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
    Table2,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SharedDashboardLayout from "@/components/shared/SharedDashboardLayout";
import KPICard from "@/components/shared/KPICard";
import StatusBadge from "@/components/shared/StatusBadge";
import MiniStat from "@/components/shared/MiniStat";
import ProBadge from "@/components/shared/ProBadge";
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

function timeAgo(ts: string | null): string {
    if (!ts) return "—";
    const d = new Date(ts);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
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

const sourceGradient: Record<string, { gradient: string; glow: string }> = {
    github: { gradient: "from-purple-500 to-violet-600", glow: "shadow-purple-500/20" },
    stripe: { gradient: "from-indigo-500 to-blue-600", glow: "shadow-indigo-500/20" },
    csv_upload: { gradient: "from-teal-500 to-emerald-600", glow: "shadow-teal-500/20" },
};

// Mock schema data for Schema Explorer
const MOCK_SCHEMA = [
    {
        table: "canonical_records", columns: [
            { name: "id", type: "UUID", pk: true }, { name: "source_type", type: "VARCHAR(50)" },
            { name: "external_id", type: "VARCHAR(255)" }, { name: "entity_type", type: "VARCHAR(50)" },
            { name: "canonical_data", type: "JSONB" }, { name: "ingested_at", type: "TIMESTAMPTZ" },
        ]
    },
    {
        table: "ingestion_runs", columns: [
            { name: "id", type: "UUID", pk: true }, { name: "source_id", type: "UUID FK" },
            { name: "status", type: "ENUM" }, { name: "records_ingested", type: "INT" },
            { name: "records_upserted", type: "INT" }, { name: "latency_ms", type: "FLOAT" },
            { name: "started_at", type: "TIMESTAMPTZ" }, { name: "completed_at", type: "TIMESTAMPTZ" },
        ]
    },
    {
        table: "data_sources", columns: [
            { name: "id", type: "UUID", pk: true }, { name: "label", type: "VARCHAR(100)" },
            { name: "source_type", type: "VARCHAR(50)" }, { name: "status", type: "ENUM" },
            { name: "config", type: "JSONB" },
        ]
    },
];

export default function DataAggregationPage() {
    const [sources, setSources] = useState<DataSource[]>([]);
    const [runs, setRuns] = useState<IngestionRun[]>([]);
    const [warehouse, setWarehouse] = useState<WarehouseRecord[]>([]);
    const [events, setEvents] = useState<AggEvent[]>([]);
    const [stats, setStats] = useState<AggStats | null>(null);
    const [deadLetter, setDeadLetter] = useState<DeadLetterAgg[]>([]);
    const [tab, setTab] = useState<"runs" | "warehouse" | "schema" | "events" | "dead-letter">("runs");
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState<string | null>(null);
    const [expandedSchema, setExpandedSchema] = useState<string | null>(MOCK_SCHEMA[0].table);

    const load = async () => {
        try {
            setLoading(true);
            const [s, r, w, e, st, dl] = await Promise.all([
                fetchSources(), fetchRuns(), fetchWarehouse(), fetchEvents(), fetchStats(), fetchDeadLetter(),
            ]);
            setSources(s); setRuns(r); setWarehouse(w); setEvents(e); setStats(st); setDeadLetter(dl);
        } catch { /* fallback */ }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleTrigger = async (sourceId: string) => {
        setTriggering(sourceId);
        try { await triggerIngestion(sourceId); await load(); }
        finally { setTriggering(null); }
    };

    const tabs = [
        { key: "runs" as const, label: "Runs", count: runs.length },
        { key: "warehouse" as const, label: "Warehouse", count: warehouse.length },
        { key: "schema" as const, label: "Schema Explorer", count: MOCK_SCHEMA.length },
        { key: "events" as const, label: "Events", count: events.length },
        { key: "dead-letter" as const, label: "Dead Letter", count: deadLetter.length },
    ];

    return (
        <SharedDashboardLayout
            title="Data Aggregation"
            subtitle="Multi-source ingestion pipeline — Run Health Dashboard"
            titleIcon={<Layers className="w-6 h-6 text-white" />}
            accentGradient="from-violet-500 to-purple-600"
            headerActions={
                <button onClick={load} disabled={loading}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
                </button>
            }
        >
            {/* ── KPI Cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard label="Total Records" value={stats?.totalWarehouseRecords?.toLocaleString() ?? "—"} subtitle={`${stats?.activeSources ?? 0} active sources`}
                    icon={<Database className="w-5 h-5" />} gradient="from-violet-500 to-purple-600" glow="shadow-violet-500/20" />
                <KPICard label="Avg Latency" value={stats ? fmtMs(stats.avgLatencyMs) : "—"} subtitle="per ingestion run"
                    icon={<Clock className="w-5 h-5" />} gradient="from-cyan-500 to-blue-600" glow="shadow-cyan-500/20" />
                <KPICard label="Active Sources" value={`${stats?.activeSources ?? 0}`} subtitle={`${stats?.totalRuns ?? 0} total runs`}
                    icon={<Activity className="w-5 h-5" />} gradient="from-emerald-500 to-green-600" glow="shadow-emerald-500/20" />
                <KPICard label="Dead Letter" value={`${stats?.deadLetterCount ?? 0}`} subtitle="events failed permanently"
                    icon={<AlertTriangle className="w-5 h-5" />} gradient={stats && stats.deadLetterCount > 0 ? "from-red-500 to-rose-600" : "from-gray-500 to-slate-600"} glow="shadow-red-500/20" />
            </div>

            {/* ── Data Source Cards ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sources.map(src => {
                    const srcRuns = runs.filter(r => r.sourceId === src.id);
                    const lastRun = srcRuns[0];
                    const totalIngested = srcRuns.reduce((a, r) => a + r.recordsIngested, 0);
                    const sg = sourceGradient[src.sourceType] || sourceGradient.csv_upload;
                    return (
                        <motion.div key={src.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 space-y-4 hover:border-white/[0.1] transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sg.gradient} flex items-center justify-center shadow-lg ${sg.glow}`}>
                                        {sourceIcon(src.sourceType)}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold">{src.label}</h3>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{src.sourceType}</p>
                                    </div>
                                </div>
                                <StatusBadge status={src.status} />
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                                    <p className="text-slate-500 text-[10px]">Last Run</p>
                                    <p className="text-slate-300">{lastRun ? timeAgo(lastRun.startedAt) : "Never"}</p>
                                </div>
                                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                                    <p className="text-slate-500 text-[10px]">Records</p>
                                    <p className="text-slate-300">{totalIngested.toLocaleString()}</p>
                                </div>
                                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                                    <p className="text-slate-500 text-[10px]">Runs</p>
                                    <p className="text-slate-300">{srcRuns.length}</p>
                                </div>
                                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                                    <p className="text-slate-500 text-[10px]">Latency</p>
                                    <p className={`${lastRun && lastRun.latencyMs > 3000 ? "text-amber-400" : "text-slate-300"}`}>{lastRun ? fmtMs(lastRun.latencyMs) : "—"}</p>
                                </div>
                            </div>
                            <button onClick={() => handleTrigger(src.id)} disabled={triggering === src.id}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-xs text-slate-400 hover:text-white disabled:opacity-40">
                                {triggering === src.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                Trigger Ingestion
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── Pipeline Summary Ministats ─────────────────────────── */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <MiniStat label="Total Runs" value={stats.totalRuns} icon={<Activity className="w-4 h-4 text-violet-400" />} />
                    <MiniStat label="Completed" value={stats.completedRuns} icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} />
                    <MiniStat label="Failed" value={stats.failedRuns} icon={<XCircle className="w-4 h-4 text-red-400" />} />
                    <MiniStat label="Ingested" value={stats.totalRecordsIngested.toLocaleString()} icon={<Database className="w-4 h-4 text-blue-400" />} />
                    <MiniStat label="Upserted" value={stats.totalRecordsUpserted.toLocaleString()} icon={<Layers className="w-4 h-4 text-purple-400" />} />
                    <MiniStat label="Pending" value={stats.pendingEvents} icon={<Clock className="w-4 h-4 text-amber-400" />} />
                </div>
            )}

            {/* ── Tab Navigation ─────────────────────────────────────── */}
            <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit flex-wrap">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${tab === t.key
                            ? "bg-white/[0.06] text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"}`}>
                        {t.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-md ${tab === t.key ? "bg-white/[0.08] text-slate-200" : "bg-white/[0.04] text-slate-500"}`}>{t.count}</span>
                    </button>
                ))}
            </div>

            {/* ── Tab Content ───────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
                        <span className="text-slate-400 text-sm">Loading pipeline data…</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Runs Table */}
                    {tab === "runs" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-white/[0.06]">
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Source</th>
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Status</th>
                                    <th className="text-right px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Ingested</th>
                                    <th className="text-right px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Upserted</th>
                                    <th className="text-right px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Latency</th>
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Started</th>
                                </tr></thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {runs.map(r => {
                                        const src = sources.find(s => s.id === r.sourceId);
                                        return (
                                            <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-3.5 flex items-center gap-2">{sourceIcon(src?.sourceType ?? "")}<span className="text-slate-300 text-xs">{src?.label ?? r.sourceId.slice(0, 8)}</span></td>
                                                <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                                                <td className="px-5 py-3.5 text-right text-slate-300 font-mono text-xs">{r.recordsIngested.toLocaleString()}</td>
                                                <td className="px-5 py-3.5 text-right text-slate-300 font-mono text-xs">{r.recordsUpserted.toLocaleString()}</td>
                                                <td className="px-5 py-3.5 text-right font-mono text-xs"><span className={r.latencyMs > 3000 ? "text-amber-400" : "text-emerald-400"}>{fmtMs(r.latencyMs)}</span></td>
                                                <td className="px-5 py-3.5 text-slate-400 text-xs">{timeAgo(r.startedAt)}</td>
                                            </tr>
                                        );
                                    })}
                                    {runs.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-500">No ingestion runs yet</td></tr>}
                                </tbody>
                            </table>
                        </motion.div>
                    )}

                    {/* Warehouse Table */}
                    {tab === "warehouse" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-white/[0.06]">
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Source</th>
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Type</th>
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">External ID</th>
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Preview</th>
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Ingested</th>
                                </tr></thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {warehouse.map(w => (
                                        <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-3.5 flex items-center gap-2">{sourceIcon(w.sourceType)}<span className="text-slate-300 capitalize text-xs">{w.sourceType.replace("_", " ")}</span></td>
                                            <td className="px-5 py-3.5"><span className="text-xs px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400">{w.entityType}</span></td>
                                            <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{w.externalId}</td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[200px] truncate">{(w.canonicalData as Record<string, unknown>).action as string ?? JSON.stringify(w.canonicalData).slice(0, 60)}</td>
                                            <td className="px-5 py-3.5 text-slate-400 text-xs">{timeAgo(w.ingestedAt)}</td>
                                        </tr>
                                    ))}
                                    {warehouse.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-500">No warehouse records</td></tr>}
                                </tbody>
                            </table>
                        </motion.div>
                    )}

                    {/* Schema Explorer */}
                    {tab === "schema" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                            <div className="flex items-center gap-2 mb-2"><Table2 className="w-5 h-5 text-violet-400" /><h3 className="text-sm font-semibold">Warehouse Schema Explorer</h3><ProBadge /></div>
                            {MOCK_SCHEMA.map(table => (
                                <div key={table.table} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                                    <button onClick={() => setExpandedSchema(expandedSchema === table.table ? null : table.table)}
                                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                                        {expandedSchema === table.table ? <ChevronDown className="w-4 h-4 text-violet-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                        <Database className="w-4 h-4 text-violet-400" />
                                        <span className="text-sm font-semibold font-mono">{table.table}</span>
                                        <span className="text-[10px] text-slate-500 ml-auto">{table.columns.length} columns</span>
                                    </button>
                                    <AnimatePresence>
                                        {expandedSchema === table.table && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                                <div className="border-t border-white/[0.04] px-5 py-3">
                                                    <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-widest text-slate-500 mb-2 px-2"><span>Column</span><span>Type</span><span>Notes</span></div>
                                                    {table.columns.map(col => (
                                                        <div key={col.name} className="grid grid-cols-3 gap-2 px-2 py-2 rounded-lg hover:bg-white/[0.02] transition-colors text-xs">
                                                            <span className="font-mono text-white flex items-center gap-1.5">
                                                                {col.pk && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">PK</span>}
                                                                {col.name}
                                                            </span>
                                                            <span className="text-violet-300 font-mono">{col.type}</span>
                                                            <span className="text-slate-500">{col.type.includes("FK") ? "Foreign Key" : col.pk ? "Primary Key" : ""}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* Events Table */}
                    {tab === "events" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-white/[0.06]">
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Type</th>
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Status</th>
                                    <th className="text-center px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Attempts</th>
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Source</th>
                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Created</th>
                                </tr></thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {events.map(e => (
                                        <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-3.5"><div className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-violet-400" /><span className="text-slate-300 text-xs">{e.eventType}</span></div></td>
                                            <td className="px-5 py-3.5"><StatusBadge status={e.status} /></td>
                                            <td className="px-5 py-3.5 text-center"><span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.04] text-xs text-slate-300">{e.attempts}</span></td>
                                            <td className="px-5 py-3.5 text-slate-400 text-xs capitalize">{(e.payload.source as string) ?? e.sourceId.slice(0, 8)}</td>
                                            <td className="px-5 py-3.5 text-slate-400 text-xs">{timeAgo(e.createdAt)}</td>
                                        </tr>
                                    ))}
                                    {events.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-500">No events</td></tr>}
                                </tbody>
                            </table>
                        </motion.div>
                    )}

                    {/* Dead Letter */}
                    {tab === "dead-letter" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-red-900/30 bg-red-950/10 backdrop-blur-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-red-900/20 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"><XCircle className="w-4 h-4 text-red-400" /></div>
                                <div><h3 className="text-sm font-semibold text-red-200">Dead Letter Queue</h3><p className="text-xs text-red-400/60">Events that exhausted all retry attempts</p></div>
                            </div>
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-red-900/20">
                                    <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Event ID</th>
                                    <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Error</th>
                                    <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Failed At</th>
                                </tr></thead>
                                <tbody className="divide-y divide-red-900/10">
                                    {deadLetter.map(dl => (
                                        <tr key={dl.id} className="hover:bg-red-900/10 transition-colors">
                                            <td className="px-5 py-3.5 text-red-200 font-mono text-xs">{dl.eventId.slice(0, 12)}…</td>
                                            <td className="px-5 py-3.5 text-red-300 text-xs max-w-md truncate">{dl.error}</td>
                                            <td className="px-5 py-3.5 text-red-400/60 text-xs">{timeAgo(dl.failedAt)}</td>
                                        </tr>
                                    ))}
                                    {deadLetter.length === 0 && <tr><td colSpan={3} className="text-center py-12 text-red-400/40">No dead-letter entries ✓</td></tr>}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </>
            )}
        </SharedDashboardLayout>
    );
}
