import { useState, useEffect, useCallback } from "react";
import {
    RefreshCw,
    Users,
    ArrowRightLeft,
    GitBranch,
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
    Zap,
    Link2,
    GripVertical,
    Plus,
    Trash2,
    Play,
    TrendingUp,
    Shield,
    Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SharedDashboardLayout from "@/components/shared/SharedDashboardLayout";
import KPICard from "@/components/shared/KPICard";
import StatusBadge from "@/components/shared/StatusBadge";
import ProBadge from "@/components/shared/ProBadge";
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

const PLATFORM_COLORS: Record<string, { gradient: string; glow: string; icon: string }> = {
    salesforce: { gradient: "from-blue-500 to-cyan-600", glow: "shadow-blue-500/20", icon: "☁" },
    hubspot: { gradient: "from-orange-500 to-red-500", glow: "shadow-orange-500/20", icon: "🔶" },
};

const SF_FIELDS = [
    "FirstName", "LastName", "Email", "Phone", "Company",
    "Title", "LeadSource", "Industry", "Website", "Address",
];

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
    return `${Math.floor(hrs / 24)}d ago`;
}

// ── Mock conflict data for Golden Record feature ──────────────
const MOCK_CONFLICTS = [
    { id: "c1", field: "Phone", sfValue: "+1-555-0101", hsValue: "+1-555-9999", record: "Jane Smith", resolved: false },
    { id: "c2", field: "Company", sfValue: "Acme Corp", hsValue: "Acme Corporation", record: "John Doe", resolved: false },
    { id: "c3", field: "Title", sfValue: "VP Sales", hsValue: "Vice President, Sales", record: "Sarah Johnson", resolved: true },
];

export default function CrmAutomationPage() {
    const [stats, setStats] = useState<CrmStats | null>(null);
    const [platforms, setPlatforms] = useState<CrmPlatformType[]>([]);
    const [mappings, setMappings] = useState<FieldMapping[]>([]);
    const [syncStates, setSyncStates] = useState<SyncState[]>([]);
    const [events, setEvents] = useState<CrmEvent[]>([]);
    const [deadLetters, setDeadLetters] = useState<DeadLetterCrmEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"mappings" | "sync" | "events" | "conflicts" | "deadletter">("mappings");
    const [error, setError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    // Drag & Drop
    const [draggedField, setDraggedField] = useState<string | null>(null);
    const [dragSource, setDragSource] = useState<"source" | "target" | null>(null);
    const [dropHighlight, setDropHighlight] = useState<string | null>(null);

    // Conflicts
    const [conflicts, setConflicts] = useState(MOCK_CONFLICTS);
    const [conflictModal, setConflictModal] = useState<typeof MOCK_CONFLICTS[0] | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [st, pl, mp, ss, ev, dl] = await Promise.all([
                fetchCrmStats(), fetchPlatforms(), fetchMappings(),
                fetchSyncStates(), fetchEvents(), fetchDeadLetter(),
            ]);
            setStats(st); setPlatforms(pl); setMappings(mp);
            setSyncStates(ss); setEvents(ev); setDeadLetters(dl);
        } catch (err) { setError(err instanceof Error ? err.message : "Failed to load data"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSync = async () => {
        const src = platforms.find(p => p.platformType === "salesforce");
        const tgt = platforms.find(p => p.platformType === "hubspot");
        if (!src || !tgt) return;
        try { setSyncing(true); await triggerSync(src.id, tgt.id); await loadData(); }
        catch (err) { setError(err instanceof Error ? err.message : "Sync failed"); }
        finally { setSyncing(false); }
    };

    const handleDeleteMapping = async (id: string) => {
        try { await deleteMapping(id); await loadData(); }
        catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); }
    };

    const handleDragStart = (field: string, source: "source" | "target") => { setDraggedField(field); setDragSource(source); };
    const handleDragOver = (e: React.DragEvent, field: string) => { e.preventDefault(); setDropHighlight(field); };
    const handleDragLeave = () => { setDropHighlight(null); };

    const handleDrop = async (targetField: string) => {
        setDropHighlight(null);
        if (!draggedField || !dragSource) return;
        const src = platforms.find(p => p.platformType === "salesforce");
        const tgt = platforms.find(p => p.platformType === "hubspot");
        if (!src || !tgt) return;
        try {
            const [sf, tf] = dragSource === "source" ? [draggedField, targetField] : [targetField, draggedField];
            await createMapping({ source_platform_id: src.id, target_platform_id: tgt.id, source_object: "Lead", target_object: "Contact", source_field: sf, target_field: tf, transform_rule: "direct" });
            await loadData();
        } catch (err) { setError(err instanceof Error ? err.message : "Failed to create mapping"); }
        setDraggedField(null); setDragSource(null);
    };

    const resolveConflict = (id: string, winner: "sf" | "hs") => {
        setConflicts(prev => prev.map(c => c.id === id ? { ...c, resolved: true } : c));
        setConflictModal(null);
    };

    // Sync Monitor counts
    const sfSyncTotal = syncStates.filter(s => platforms.find(p => p.id === s.platformId)?.platformType === "salesforce").reduce((acc, s) => acc + s.recordsSynced, 0);
    const hsSyncTotal = syncStates.filter(s => platforms.find(p => p.id === s.platformId)?.platformType === "hubspot").reduce((acc, s) => acc + s.recordsSynced, 0);

    const tabs = [
        { key: "mappings" as const, label: "Mapping Builder", count: mappings.length },
        { key: "sync" as const, label: "Sync Monitor", count: syncStates.length },
        { key: "conflicts" as const, label: "Conflicts", count: conflicts.filter(c => !c.resolved).length },
        { key: "events" as const, label: "Events", count: events.length },
        { key: "deadletter" as const, label: "Dead Letter", count: deadLetters.length },
    ];

    return (
        <SharedDashboardLayout
            title="CRM Automation"
            subtitle="Salesforce ↔ HubSpot Bi-directional Sync"
            titleIcon={<ArrowRightLeft className="w-6 h-6 text-white" />}
            accentGradient="from-violet-500 to-purple-600"
            headerActions={
                <div className="flex items-center gap-3">
                    <button onClick={handleSync} disabled={syncing || platforms.length < 2}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50">
                        <Play className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing…" : "Trigger Sync"}
                    </button>
                    <button onClick={loadData} disabled={loading}
                        className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            }
        >
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">✕</button>
                </div>
            )}

            {/* ── KPI Cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard label="Records Synced" value={stats?.totalRecordsSynced?.toLocaleString() ?? "—"} subtitle={`${stats?.syncedCount ?? 0} events completed`}
                    icon={<TrendingUp className="w-5 h-5" />} gradient="from-emerald-500 to-teal-600" glow="shadow-emerald-500/20" />
                <KPICard label="Active Mappings" value={`${stats?.activeMappings ?? 0}`} subtitle={`of ${stats?.totalMappings ?? 0} total`}
                    icon={<Link2 className="w-5 h-5" />} gradient="from-violet-500 to-purple-600" glow="shadow-violet-500/20" />
                <KPICard label="Pending" value={`${stats?.pendingCount ?? 0}`} subtitle="events awaiting sync"
                    icon={<Clock className="w-5 h-5" />} gradient="from-amber-500 to-orange-600" glow="shadow-amber-500/20" />
                <KPICard label="Failed / DLQ" value={`${stats?.failedCount ?? 0} / ${stats?.deadLetterCount ?? 0}`} subtitle="need attention"
                    icon={<AlertTriangle className="w-5 h-5" />} gradient="from-red-500 to-rose-600" glow="shadow-red-500/20" />
            </div>

            {/* ── Platform Status Row + Sync Monitor ────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {platforms.map(p => {
                    const colors = PLATFORM_COLORS[p.platformType] || PLATFORM_COLORS.salesforce;
                    const states = syncStates.filter(s => s.platformId === p.id);
                    return (
                        <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 hover:border-white/[0.1] transition-all duration-300">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg ${colors.glow} text-lg`}>{colors.icon}</div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold">{p.label}</h3>
                                    <p className="text-xs text-slate-500">{p.platformType}</p>
                                </div>
                                <StatusBadge status={p.status} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {states.map(s => (
                                    <div key={s.id} className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {s.direction === "outbound" ? <ArrowRightLeft className="w-3 h-3 text-violet-400" /> : <GitBranch className="w-3 h-3 text-cyan-400" />}
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.direction}</span>
                                        </div>
                                        <p className="text-xs text-slate-300">{s.recordsSynced.toLocaleString()} records</p>
                                        <p className="text-[10px] text-slate-600 mt-0.5">Last: {timeAgo(s.lastSyncedAt)}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}

                {/* Sync Monitor Card */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <Eye className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">Sync Monitor</h3>
                            <p className="text-[10px] text-slate-500">Real-time bi-directional counts</p>
                        </div>
                        <ProBadge className="ml-auto" />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">☁</span>
                                <span className="text-xs text-blue-400">Salesforce</span>
                            </div>
                            <span className="text-xl font-bold text-white">{sfSyncTotal.toLocaleString()}</span>
                        </div>
                        <div className="relative h-2 bg-white/[0.04] rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((sfSyncTotal / Math.max(sfSyncTotal + hsSyncTotal, 1)) * 100, 100)}%` }}
                                transition={{ duration: 0.8 }} className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">🔶</span>
                                <span className="text-xs text-orange-400">HubSpot</span>
                            </div>
                            <span className="text-xl font-bold text-white">{hsSyncTotal.toLocaleString()}</span>
                        </div>
                        <div className="relative h-2 bg-white/[0.04] rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((hsSyncTotal / Math.max(sfSyncTotal + hsSyncTotal, 1)) * 100, 100)}%` }}
                                transition={{ duration: 0.8 }} className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-500 to-red-500" />
                        </div>
                        <div className="text-center pt-2 border-t border-white/[0.04]">
                            <span className="text-[10px] uppercase tracking-widest text-slate-500">Sync Delta</span>
                            <p className={`text-lg font-bold ${Math.abs(sfSyncTotal - hsSyncTotal) > 100 ? "text-amber-400" : "text-emerald-400"}`}>
                                {Math.abs(sfSyncTotal - hsSyncTotal) === 0 ? "In Sync ✓" : `±${Math.abs(sfSyncTotal - hsSyncTotal).toLocaleString()}`}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ── Tab Navigation ─────────────────────────────────────── */}
            <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit flex-wrap">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === tab.key
                            ? "bg-white/[0.06] text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"}`}>
                        {tab.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-md ${activeTab === tab.key ? "bg-white/[0.08] text-slate-200" : "bg-white/[0.04] text-slate-500"}`}>{tab.count}</span>
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
                    {/* Mapping Builder */}
                    {activeTab === "mappings" && (
                        <div className="space-y-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center"><Plus className="w-4 h-4 text-violet-400" /></div>
                                    <div><h3 className="text-sm font-semibold">Drag & Drop Mapping Builder</h3><p className="text-xs text-slate-500">Drag a field from the left and drop onto a target field on the right</p></div>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-start">
                                        {/* Source fields (Salesforce) */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3"><span className="text-lg">☁</span><h4 className="text-sm font-medium text-blue-400">Salesforce Lead</h4></div>
                                            <div className="space-y-1.5">
                                                {SF_FIELDS.map(field => {
                                                    const isMapped = mappings.some(m => m.sourceField === field);
                                                    return (
                                                        <div key={field} draggable={!isMapped}
                                                            onDragStart={() => handleDragStart(field, "source")}
                                                            onDragOver={(e) => handleDragOver(e, field)}
                                                            onDragLeave={handleDragLeave}
                                                            onDrop={() => handleDrop(field)}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-mono ${isMapped
                                                                ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                                                                : "bg-white/[0.02] border-white/[0.06] text-slate-300 hover:border-blue-500/30 cursor-grab active:cursor-grabbing"
                                                                } ${dropHighlight === field && dragSource === "target" ? "border-blue-400 bg-blue-500/20 scale-[1.02]" : ""}`}>
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
                                            {mappings.map(m => (
                                                <div key={m.id} className="flex items-center gap-1">
                                                    <div className="w-16 h-px bg-gradient-to-r from-blue-500/40 to-transparent" />
                                                    <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"><ArrowRightLeft className="w-3 h-3 text-violet-400" /></div>
                                                    <div className="w-16 h-px bg-gradient-to-l from-orange-500/40 to-transparent" />
                                                </div>
                                            ))}
                                            {draggedField && (
                                                <div className="flex items-center gap-1 animate-pulse">
                                                    <div className="w-16 h-px bg-gradient-to-r from-emerald-500/60 to-transparent" />
                                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"><Plus className="w-3 h-3 text-emerald-400" /></div>
                                                    <div className="w-16 h-px bg-gradient-to-l from-emerald-500/60 to-transparent" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Target fields (HubSpot) */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3"><span className="text-lg">🔶</span><h4 className="text-sm font-medium text-orange-400">HubSpot Contact</h4></div>
                                            <div className="space-y-1.5">
                                                {HS_FIELDS.map(field => {
                                                    const isMapped = mappings.some(m => m.targetField === field);
                                                    return (
                                                        <div key={field} draggable={!isMapped}
                                                            onDragStart={() => handleDragStart(field, "target")}
                                                            onDragOver={(e) => handleDragOver(e, field)}
                                                            onDragLeave={handleDragLeave}
                                                            onDrop={() => handleDrop(field)}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-mono ${isMapped
                                                                ? "bg-orange-500/10 border-orange-500/20 text-orange-300"
                                                                : "bg-white/[0.02] border-white/[0.06] text-slate-300 hover:border-orange-500/30 cursor-grab active:cursor-grabbing"
                                                                } ${dropHighlight === field && dragSource === "source" ? "border-orange-400 bg-orange-500/20 scale-[1.02]" : ""}`}>
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
                            </motion.div>

                            {/* Active Mappings Table */}
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/[0.06]"><h3 className="text-sm font-semibold text-slate-200">Active Field Mappings</h3></div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr className="border-b border-white/[0.06]">
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Source</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Direction</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Target</th>
                                            <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Transform</th>
                                            <th className="text-right px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Action</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-white/[0.03]">
                                            {mappings.map(m => (
                                                <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-5 py-3.5"><span className="text-blue-400 text-xs">{m.sourceObject}.</span><span className="text-white font-mono text-xs">{m.sourceField}</span></td>
                                                    <td className="px-5 py-3.5"><ArrowRightLeft className="w-4 h-4 text-violet-400" /></td>
                                                    <td className="px-5 py-3.5"><span className="text-orange-400 text-xs">{m.targetObject}.</span><span className="text-white font-mono text-xs">{m.targetField}</span></td>
                                                    <td className="px-5 py-3.5"><span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-400 text-xs font-mono">{m.transformRule || "direct"}</span></td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <button onClick={() => handleDeleteMapping(m.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-xs transition-all opacity-0 group-hover:opacity-100">
                                                            <Trash2 className="w-3 h-3" />Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {mappings.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-500">No mappings configured — drag fields above to create one</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Sync Monitor Tab */}
                    {activeTab === "sync" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {platforms.map(p => {
                                const colors = PLATFORM_COLORS[p.platformType] || PLATFORM_COLORS.salesforce;
                                const states = syncStates.filter(s => s.platformId === p.id);
                                const total = states.reduce((acc, s) => acc + s.recordsSynced, 0);
                                return (
                                    <div key={p.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg ${colors.glow} text-xl`}>{colors.icon}</div>
                                            <div><h3 className="text-base font-bold">{p.label}</h3><StatusBadge status={p.status} /></div>
                                            <div className="ml-auto text-right"><p className="text-2xl font-bold">{total.toLocaleString()}</p><p className="text-[10px] text-slate-500 uppercase tracking-widest">Records Synced</p></div>
                                        </div>
                                        {states.map(s => (
                                            <div key={s.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {s.direction === "outbound" ? <ArrowRightLeft className="w-4 h-4 text-violet-400" /> : <GitBranch className="w-4 h-4 text-cyan-400" />}
                                                    <span className="text-sm text-white capitalize">{s.direction}</span>
                                                </div>
                                                <div className="text-right"><p className="text-sm font-semibold">{s.recordsSynced.toLocaleString()}</p><p className="text-[10px] text-slate-500">Last: {timeAgo(s.lastSyncedAt)}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* Conflict Resolution Tab */}
                    {activeTab === "conflicts" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <Shield className="w-5 h-5 text-amber-400" />
                                <h3 className="text-sm font-semibold">Conflict Resolution — Choose Golden Record</h3>
                                <ProBadge />
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-white/[0.06]">
                                        <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Record</th>
                                        <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Field</th>
                                        <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">☁ Salesforce</th>
                                        <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">🔶 HubSpot</th>
                                        <th className="text-right px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Action</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-white/[0.03]">
                                        {conflicts.map(c => (
                                            <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-3.5 text-white text-xs font-medium">{c.record}</td>
                                                <td className="px-5 py-3.5 text-slate-300 text-xs font-mono">{c.field}</td>
                                                <td className="px-5 py-3.5 text-blue-300 text-xs">{c.sfValue}</td>
                                                <td className="px-5 py-3.5 text-orange-300 text-xs">{c.hsValue}</td>
                                                <td className="px-5 py-3.5 text-right">
                                                    {c.resolved ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="w-3 h-3" /> Resolved</span>
                                                    ) : (
                                                        <div className="flex items-center gap-2 justify-end">
                                                            <button onClick={() => resolveConflict(c.id, "sf")} className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 border border-blue-500/20">☁ SF</button>
                                                            <button onClick={() => resolveConflict(c.id, "hs")} className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-xs hover:bg-orange-500/20 border border-orange-500/20">🔶 HS</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {/* Sync Events */}
                    {activeTab === "events" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-white/[0.06]">
                                        <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Type</th>
                                        <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Direction</th>
                                        <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Status</th>
                                        <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Attempts</th>
                                        <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Error</th>
                                        <th className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Time</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-white/[0.03]">
                                        {events.map(e => (
                                            <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-3.5"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/10"><Zap className="w-3 h-3" />{e.eventType}</span></td>
                                                <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1 text-xs ${e.direction === "outbound" ? "text-violet-400" : "text-cyan-400"}`}>{e.direction === "outbound" ? <ArrowRightLeft className="w-3 h-3" /> : <GitBranch className="w-3 h-3" />}{e.direction}</span></td>
                                                <td className="px-5 py-3.5"><StatusBadge status={e.status} /></td>
                                                <td className="px-5 py-3.5 text-center"><span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.04] text-xs text-slate-300">{e.attempts}</span></td>
                                                <td className="px-5 py-3.5 text-slate-500 text-xs max-w-[200px] truncate">{e.processingError || "—"}</td>
                                                <td className="px-5 py-3.5 text-slate-400 text-xs">{timeAgo(e.createdAt)}</td>
                                            </tr>
                                        ))}
                                        {events.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-500">No sync events found</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {/* Dead Letter */}
                    {activeTab === "deadletter" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-red-900/30 bg-red-950/10 backdrop-blur-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-red-900/20 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"><XCircle className="w-4 h-4 text-red-400" /></div>
                                <div><h3 className="text-sm font-semibold text-red-200">Dead Letter Queue</h3><p className="text-xs text-red-400/60">CRM events that exhausted all retry attempts</p></div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-red-900/20">
                                        <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Event ID</th>
                                        <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Error</th>
                                        <th className="text-left px-5 py-3.5 text-red-300/60 font-medium text-xs uppercase tracking-wider">Failed At</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-red-900/10">
                                        {deadLetters.map(dl => (
                                            <tr key={dl.id} className="hover:bg-red-900/10 transition-colors">
                                                <td className="px-5 py-3.5 text-red-200 font-mono text-xs">{dl.eventId.substring(0, 12)}…</td>
                                                <td className="px-5 py-3.5 text-red-300 text-xs max-w-md truncate">{dl.error}</td>
                                                <td className="px-5 py-3.5 text-red-400/60 text-xs">{timeAgo(dl.failedAt)}</td>
                                            </tr>
                                        ))}
                                        {deadLetters.length === 0 && <tr><td colSpan={3} className="text-center py-12 text-red-400/40">No dead-letter entries — all syncs healthy ✓</td></tr>}
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
