import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Layers, ShieldAlert, Clock, Search, Filter, History } from "lucide-react";
import { motion } from "framer-motion";
import SharedDashboardLayout from "@/components/shared/SharedDashboardLayout";
import KPICard from "@/components/shared/KPICard";
import StatusBadge from "@/components/shared/StatusBadge";
import DataTable from "@/components/shared/DataTable";
import { fetchDeadLetter as fetchPaymentDLQ } from "@/lib/paymentGateway";
import { fetchDeadLetter as fetchCrmDLQ } from "@/lib/crmAutomation";
import { fetchDeadLetter as fetchAggDLQ } from "@/lib/dataAggregation";

interface FlatDLQEntry {
    id: string;
    source: "payments" | "crm" | "aggregation";
    originalId: string;
    error: string;
    failedAt: string;
    payload?: string;
}

export default function DLQObserverPage() {
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<FlatDLQEntry[]>([]);
    const [search, setSearch] = useState("");

    const loadAllDLQs = async () => {
        setLoading(true);
        try {
            const [p, c, a] = await Promise.all([
                fetchPaymentDLQ(),
                fetchCrmDLQ(),
                fetchAggDLQ()
            ]);

            const flat: FlatDLQEntry[] = [
                ...p.map(e => ({ id: `p-${e.id}`, source: "payments" as const, originalId: e.settlementId, error: e.error, failedAt: e.failedAt })),
                ...c.map(e => ({ id: `c-${e.id}`, source: "crm" as const, originalId: e.eventId, error: e.error, failedAt: e.failedAt })),
                ...a.map(e => ({ id: `a-${e.id}`, source: "aggregation" as const, originalId: e.eventId, error: e.error, failedAt: e.failedAt }))
            ].sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime());

            setEntries(flat);
        } catch (error) {
            console.error("Failed to fetch DLQ entries", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllDLQs();
    }, []);

    const filtered = entries.filter(e =>
        e.error.toLowerCase().includes(search.toLowerCase()) ||
        e.source.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        {
            header: "Source",
            accessor: (row: FlatDLQEntry) => (
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${row.source === 'payments' ? 'bg-emerald-500' :
                        row.source === 'crm' ? 'bg-blue-500' : 'bg-purple-500'
                        }`} />
                    <span className="capitalize">{row.source}</span>
                </div>
            )
        },
        {
            header: "Error Reason",
            accessor: (row: FlatDLQEntry) => (
                <div className="max-w-xs truncate font-mono text-pink-400" title={row.error}>
                    {row.error}
                </div>
            )
        },
        {
            header: "Failed At",
            accessor: (row: FlatDLQEntry) => (
                <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(row.failedAt).toLocaleString()}
                </div>
            )
        },
        {
            header: "Action",
            accessor: (row: FlatDLQEntry) => (
                <button className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    <RefreshCw className="w-3 h-3" /> Replay
                </button>
            )
        }
    ];

    return (
        <SharedDashboardLayout
            title="Dead Letter Queue Observer"
            subtitle="Centralized isolation for failed operations across all platform services."
            titleIcon={<AlertTriangle className="w-6 h-6 text-white" />}
            accentGradient="from-rose-500 to-red-600"
        >
            {/* Top Bar Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard label="Total DLQ" value={`${entries.length}`} subtitle="Across all services" icon={<Layers className="w-5 h-5" />} gradient="from-red-500 to-rose-600" glow="shadow-red-500/20" />
                <KPICard label="Critical Failures" value={`${entries.filter(e => e.error.includes('timeout')).length}`} subtitle="Latency timeouts" icon={<ShieldAlert className="w-5 h-5" />} gradient="from-orange-500 to-red-500" glow="shadow-orange-500/20" />
                <KPICard label="Resolved Today" value="14" subtitle="Manual replays" icon={<History className="w-5 h-5" />} gradient="from-emerald-500 to-teal-600" glow="shadow-emerald-500/20" />
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Health Status</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-lg font-bold">Investigation Required</span>
                    </div>
                </div>
            </div>

            {/* List Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mt-6">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Filter errors by keyword or source..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-sm focus:outline-none focus:border-red-500/50 transition-colors"
                    />
                </div>
                <div className="flex gap-2 shrink-0">
                    <button onClick={loadAllDLQs} className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-sm font-medium">
                        <Filter className="w-4 h-4" /> Filter Sources
                    </button>
                    <button className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors">
                        Replay All
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="mt-4">
                <DataTable
                    columns={[
                        {
                            key: "source",
                            label: "Source",
                            render: (row: FlatDLQEntry) => (
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${row.source === 'payments' ? 'bg-emerald-500' :
                                            row.source === 'crm' ? 'bg-blue-500' : 'bg-purple-500'
                                        }`} />
                                    <span className="capitalize">{row.source}</span>
                                </div>
                            )
                        },
                        {
                            key: "error",
                            label: "Error Reason",
                            render: (row: FlatDLQEntry) => (
                                <div className="max-w-xs truncate font-mono text-pink-400" title={row.error}>
                                    {row.error}
                                </div>
                            )
                        },
                        {
                            key: "failedAt",
                            label: "Failed At",
                            render: (row: FlatDLQEntry) => (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    {new Date(row.failedAt).toLocaleString()}
                                </div>
                            )
                        },
                        {
                            key: "action",
                            label: "Action",
                            render: (row: FlatDLQEntry) => (
                                <button className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                                    <RefreshCw className="w-3 h-3" /> Replay
                                </button>
                            )
                        }
                    ]}
                    data={filtered}
                    keyExtractor={(r) => r.id}
                    variant="danger"
                    isLoading={loading}
                    emptyMessage="No dead letters found. System is healthy."
                />
            </div>
        </SharedDashboardLayout>
    );
}
