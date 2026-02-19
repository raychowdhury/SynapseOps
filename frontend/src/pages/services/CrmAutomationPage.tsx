import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    RefreshCw,
    Users,
    ArrowRightLeft,
    GitBranch,
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
    Zap,
    Activity,
    Archive,
    TrendingUp,
    Link2,
    GripVertical,
    Plus,
    Trash2,
    Play,
} from "lucide-react";
import {
    fetchPlatforms,
    fetchMappings,
    fetchSyncStates,
    fetchEvents,
    fetchCrmStats,
    fetchDeadLetter,
    createMapping,
    deleteMapping,
    triggerSync,
    type CrmPlatformType,
    type FieldMapping,
    type SyncState,
    type CrmEvent,
    type CrmStats,
    type DeadLetterCrmEntry,
} from "@/lib/crmAutomation";

// ── Style constants ─────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    synced: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    dead_letter: "bg-red-800/20 text-red-300 border-red-800/30",
    connected: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    disconnected: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
    idle: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    syncing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const PLATFORM_COLORS: Record<string, { gradient: string; glow: string; icon: string }> = {
    salesforce: {
        gradient: "from-blue-500 to-cyan-600",
        glow: "shadow-blue-500/20",
        icon: "☁",
    },
    hubspot: {
        gradient: "from-orange-500 to-red-500",
        glow: "shadow-orange-500/20",
        icon: "🔶",
    },
};

// Salesforce Lead fields
const SF_FIELDS = [
    "FirstName", "LastName", "Email", "Phone", "Company",
    "Title", "LeadSource", "Industry", "Website", "Address",
];

// HubSpot Contact fields
const HS_FIELDS = [
    "firstname", "lastname", "email", "phone", "company",
    "jobtitle", "hs_lead_status", "industry", "website", "address",
];

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

// ── Main component ──────────────────────────────────────────────

export default function CrmAutomationPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<CrmStats | null>(null);
    const [platforms, setPlatforms] = useState<CrmPlatformType[]>([]);
    const [mappings, setMappings] = useState<FieldMapping[]>([]);
    const [syncStates, setSyncStates] = useState<SyncState[]>([]);
    const [events, setEvents] = useState<CrmEvent[]>([]);
    const [deadLetters, setDeadLetters] = useState<DeadLetterCrmEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"mappings" | "events" | "deadletter">("mappings");
    const [error, setError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    // Drag & Drop state
    const [draggedField, setDraggedField] = useState<string | null>(null);
    const [dragSource, setDragSource] = useState<"source" | "target" | null>(null);
    const [dropHighlight, setDropHighlight] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [st, pl, mp, ss, ev, dl] = await Promise.all([
                fetchCrmStats(),
                fetchPlatforms(),
                fetchMappings(),
                fetchSyncStates(),
                fetchEvents(),
                fetchDeadLetter(),
            ]);
            setStats(st);
            setPlatforms(pl);
            setMappings(mp);
            setSyncStates(ss);
            setEvents(ev);
            setDeadLetters(dl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSync = async () => {
        const src = platforms.find((p) => p.platformType === "salesforce");
        const tgt = platforms.find((p) => p.platformType === "hubspot");
        if (!src || !tgt) return;
        try {
            setSyncing(true);
            await triggerSync(src.id, tgt.id);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sync failed");
        } finally {
            setSyncing(false);
        }
    };

    const handleDeleteMapping = async (id: string) => {
        try {
            await deleteMapping(id);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    };

    // ── Drag & Drop handlers ────────────────────────────────────
    const handleDragStart = (field: string, source: "source" | "target") => {
        setDraggedField(field);
        setDragSource(source);
    };

    const handleDragOver = (e: React.DragEvent, field: string) => {
        e.preventDefault();
        setDropHighlight(field);
    };

    const handleDragLeave = () => {
        setDropHighlight(null);
    };

    const handleDrop = async (targetField: string) => {
        setDropHighlight(null);
        if (!draggedField || !dragSource) return;

        const src = platforms.find((p) => p.platformType === "salesforce");
        const tgt = platforms.find((p) => p.platformType === "hubspot");
        if (!src || !tgt) return;

        try {
            if (dragSource === "source") {
                await createMapping({
                    source_platform_id: src.id,
                    target_platform_id: tgt.id,
                    source_object: "Lead",
                    target_object: "Contact",
                    source_field: draggedField,
                    target_field: targetField,
                    transform_rule: "direct",
                });
            } else {
                await createMapping({
                    source_platform_id: src.id,
                    target_platform_id: tgt.id,
                    source_object: "Lead",
                    target_object: "Contact",
                    source_field: targetField,
                    target_field: draggedField,
                    transform_rule: "direct",
                });
            }
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create mapping");
        }

        setDraggedField(null);
        setDragSource(null);
    };

    const sfPlatform = platforms.find((p) => p.platformType === "salesforce");
    const hsPlatform = platforms.find((p) => p.platformType === "hubspot");

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
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <ArrowRightLeft className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight">CRM Automation</h1>
                                <p className="text-xs text-slate-400">Salesforce ↔ HubSpot Bi-directional Sync</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSync}
                            disabled={syncing || platforms.length < 2}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50"
                        >
                            <Play className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                            {syncing ? "Syncing…" : "Trigger Sync"}
                        </button>
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
                        label="Records Synced"
                        value={stats?.totalRecordsSynced?.toLocaleString() ?? "—"}
                        subtitle={`${stats?.syncedCount ?? 0} events completed`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        gradient="from-emerald-500 to-teal-600"
                        glow="shadow-emerald-500/20"
                    />
                    <KPICard
                        label="Active Mappings"
                        value={`${stats?.activeMappings ?? 0}`}
                        subtitle={`of ${stats?.totalMappings ?? 0} total`}
                        icon={<Link2 className="w-5 h-5" />}
                        gradient="from-violet-500 to-purple-600"
                        glow="shadow-violet-500/20"
                    />
                    <KPICard
                        label="Pending"
                        value={`${stats?.pendingCount ?? 0}`}
                        subtitle="events awaiting sync"
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
                </div>

                {/* ── Platform Status Row ──────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {platforms.map((p) => {
                        const colors = PLATFORM_COLORS[p.platformType] || PLATFORM_COLORS.salesforce;
                        const states = syncStates.filter((s) => s.platformId === p.id);
                        return (
                            <div key={p.id} className="rounded-2xl border border-slate-700/40 bg-slate-800/20 backdrop-blur-lg p-5 hover:border-slate-600/50 transition-all duration-300">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg ${colors.glow} text-lg`}>
                                        {colors.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold">{p.label}</h3>
                                        <p className="text-xs text-slate-500">{p.platformType}</p>
                                    </div>
                                    <StatusBadge status={p.status} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {states.map((s) => (
                                        <div key={s.id} className="rounded-xl bg-slate-900/40 px-3 py-2">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                {s.direction === "outbound" ? (
                                                    <ArrowRightLeft className="w-3 h-3 text-violet-400" />
                                                ) : (
                                                    <GitBranch className="w-3 h-3 text-cyan-400" />
                                                )}
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.direction}</span>
                                            </div>
                                            <p className="text-xs text-slate-300">{s.recordsSynced.toLocaleString()} records</p>
                                            <p className="text-[10px] text-slate-600 mt-0.5">Last: {timeAgo(s.lastSyncedAt)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Tab Navigation ─────────────────────────────────────── */}
                <div className="flex gap-1 p-1 bg-slate-800/40 rounded-xl border border-slate-700/40 w-fit">
                    {([
                        { key: "mappings" as const, label: "Mapping Builder", count: mappings.length },
                        { key: "events" as const, label: "Sync Events", count: events.length },
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

                {/* ── Tab Content ───────────────────────────────────────── */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-4 animate-pulse">
                            <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
                            <span className="text-slate-400 text-sm">Loading CRM data…</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Mapping Builder ──────────────────────────────── */}
                        {activeTab === "mappings" && (
                            <div className="space-y-6">
                                {/* Drag & Drop builder */}
                                <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 backdrop-blur-lg overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                            <Plus className="w-4 h-4 text-violet-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold">Drag & Drop Mapping Builder</h3>
                                            <p className="text-xs text-slate-500">Drag a field from the left and drop onto a target field on the right</p>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-start">
                                            {/* Source fields (Salesforce) */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-lg">☁</span>
                                                    <h4 className="text-sm font-medium text-blue-400">Salesforce Lead</h4>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {SF_FIELDS.map((field) => {
                                                        const isMapped = mappings.some((m) => m.sourceField === field);
                                                        return (
                                                            <div
                                                                key={field}
                                                                draggable={!isMapped}
                                                                onDragStart={() => handleDragStart(field, "source")}
                                                                onDragOver={(e) => handleDragOver(e, field)}
                                                                onDragLeave={handleDragLeave}
                                                                onDrop={() => handleDrop(field)}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 text-xs font-mono ${isMapped
                                                                    ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                                                                    : "bg-slate-900/40 border-slate-700/30 text-slate-300 hover:border-blue-500/30 cursor-grab active:cursor-grabbing"
                                                                    } ${dropHighlight === field && dragSource === "target" ? "border-blue-400 bg-blue-500/20 scale-[1.02]" : ""}`}
                                                            >
                                                                <GripVertical className={`w-3 h-3 ${isMapped ? "text-blue-400/40" : "text-slate-600"}`} />
                                                                {field}
                                                                {isMapped && <CheckCircle2 className="w-3 h-3 ml-auto text-blue-400" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Center arrows */}
                                            <div className="flex flex-col items-center gap-2 pt-10">
                                                {mappings.map((m) => (
                                                    <div key={m.id} className="flex items-center gap-1">
                                                        <div className="w-16 h-px bg-gradient-to-r from-blue-500/40 to-transparent" />
                                                        <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                                                            <ArrowRightLeft className="w-3 h-3 text-violet-400" />
                                                        </div>
                                                        <div className="w-16 h-px bg-gradient-to-l from-orange-500/40 to-transparent" />
                                                    </div>
                                                ))}
                                                {draggedField && (
                                                    <div className="flex items-center gap-1 animate-pulse">
                                                        <div className="w-16 h-px bg-gradient-to-r from-emerald-500/60 to-transparent" />
                                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                                            <Plus className="w-3 h-3 text-emerald-400" />
                                                        </div>
                                                        <div className="w-16 h-px bg-gradient-to-l from-emerald-500/60 to-transparent" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Target fields (HubSpot) */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-lg">🔶</span>
                                                    <h4 className="text-sm font-medium text-orange-400">HubSpot Contact</h4>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {HS_FIELDS.map((field) => {
                                                        const isMapped = mappings.some((m) => m.targetField === field);
                                                        return (
                                                            <div
                                                                key={field}
                                                                draggable={!isMapped}
                                                                onDragStart={() => handleDragStart(field, "target")}
                                                                onDragOver={(e) => handleDragOver(e, field)}
                                                                onDragLeave={handleDragLeave}
                                                                onDrop={() => handleDrop(field)}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 text-xs font-mono ${isMapped
                                                                    ? "bg-orange-500/10 border-orange-500/20 text-orange-300"
                                                                    : "bg-slate-900/40 border-slate-700/30 text-slate-300 hover:border-orange-500/30 cursor-grab active:cursor-grabbing"
                                                                    } ${dropHighlight === field && dragSource === "source" ? "border-orange-400 bg-orange-500/20 scale-[1.02]" : ""}`}
                                                            >
                                                                <GripVertical className={`w-3 h-3 ${isMapped ? "text-orange-400/40" : "text-slate-600"}`} />
                                                                {field}
                                                                {isMapped && <CheckCircle2 className="w-3 h-3 ml-auto text-orange-400" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Mappings Table */}
                                <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 backdrop-blur-lg overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-700/40">
                                        <h3 className="text-sm font-semibold text-slate-200">Active Field Mappings</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-700/40">
                                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Source</th>
                                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Direction</th>
                                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Target</th>
                                                    <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Transform</th>
                                                    <th className="text-right px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/20">
                                                {mappings.map((m) => (
                                                    <tr key={m.id} className="hover:bg-slate-700/10 transition-colors group">
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-blue-400 text-xs">{m.sourceObject}.</span>
                                                                <span className="text-white font-mono text-xs">{m.sourceField}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <ArrowRightLeft className="w-4 h-4 text-violet-400" />
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-orange-400 text-xs">{m.targetObject}.</span>
                                                                <span className="text-white font-mono text-xs">{m.targetField}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-700/40 text-slate-400 text-xs font-mono">
                                                                {m.transformRule || "direct"}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            <button
                                                                onClick={() => handleDeleteMapping(m.id)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-xs transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {mappings.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-12 text-slate-500">
                                                            No mappings configured — drag fields above to create one
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Sync Events ───────────────────────────────────── */}
                        {activeTab === "events" && (
                            <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 backdrop-blur-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700/40">
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Type</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Direction</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Status</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Attempts</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Error</th>
                                                <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/20">
                                            {events.map((e) => (
                                                <tr key={e.id} className="hover:bg-slate-700/10 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/10">
                                                            <Zap className="w-3 h-3" />
                                                            {e.eventType}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={`inline-flex items-center gap-1 text-xs ${e.direction === "outbound" ? "text-violet-400" : "text-cyan-400"}`}>
                                                            {e.direction === "outbound" ? <ArrowRightLeft className="w-3 h-3" /> : <GitBranch className="w-3 h-3" />}
                                                            {e.direction}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <StatusBadge status={e.status} />
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-700/40 text-xs text-slate-300">
                                                            {e.attempts}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-500 text-xs max-w-[200px] truncate">
                                                        {e.processingError || "—"}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-400 text-xs">{timeAgo(e.createdAt)}</td>
                                                </tr>
                                            ))}
                                            {events.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-12 text-slate-500">No sync events found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ── Dead Letter ──────────────────────────────────── */}
                        {activeTab === "deadletter" && (
                            <div className="rounded-2xl border border-red-900/30 bg-red-950/10 backdrop-blur-lg overflow-hidden">
                                <div className="px-5 py-4 border-b border-red-900/20 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                                        <XCircle className="w-4 h-4 text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-red-200">Dead Letter Queue</h3>
                                        <p className="text-xs text-red-400/60">CRM events that exhausted all retry attempts</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-red-900/20">
                                                <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Event ID</th>
                                                <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Error</th>
                                                <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Failed At</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-red-900/10">
                                            {deadLetters.map((dl) => (
                                                <tr key={dl.id} className="hover:bg-red-900/10 transition-colors">
                                                    <td className="px-5 py-3.5 text-red-200 font-mono text-xs">{dl.eventId.substring(0, 12)}…</td>
                                                    <td className="px-5 py-3.5 text-red-300 text-xs max-w-md truncate">{dl.error}</td>
                                                    <td className="px-5 py-3.5 text-red-400/60 text-xs">{timeAgo(dl.failedAt)}</td>
                                                </tr>
                                            ))}
                                            {deadLetters.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="text-center py-12 text-red-400/40">No dead-letter entries — all syncs healthy ✓</td>
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

function StatusBadge({ status }: { status: string }) {
    const style = STATUS_STYLES[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${style}`}>
            {status === "synced" && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {status === "failed" && <XCircle className="w-3 h-3 mr-1" />}
            {status === "pending" && <Clock className="w-3 h-3 mr-1" />}
            {status === "dead_letter" && <AlertTriangle className="w-3 h-3 mr-1" />}
            {status === "connected" && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {status.replace("_", " ")}
        </span>
    );
}
