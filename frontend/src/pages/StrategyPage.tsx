import { useState, useEffect } from "react";
import {
    BarChart3,
    TrendingUp,
    Zap,
    Target,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Users,
    CreditCard,
    Database,
    Bell,
    Globe
} from "lucide-react";
import { motion } from "framer-motion";
import SharedDashboardLayout from "@/components/shared/SharedDashboardLayout";
import KPICard from "@/components/shared/KPICard";
import MiniStat from "@/components/shared/MiniStat";
import ProBadge from "@/components/shared/ProBadge";
import { fetchStats as fetchPaymentStats } from "@/lib/paymentGateway";
import { fetchCrmStats } from "@/lib/crmAutomation";
import { fetchStats as fetchAggStats } from "@/lib/dataAggregation";

export default function StrategyPage() {
    const [loading, setLoading] = useState(true);
    const [efficiencyScore, setEfficiencyScore] = useState(88);
    const [stats, setStats] = useState({
        payments: { settled: 0, total: 0 },
        crm: { synced: 0, total: 0 },
        data: { ingested: 0, sources: 0 }
    });

    useEffect(() => {
        const loadAllStats = async () => {
            try {
                const [p, c, d] = await Promise.all([
                    fetchPaymentStats(),
                    fetchCrmStats(),
                    fetchAggStats()
                ]);
                setStats({
                    payments: { settled: p.settledCount, total: p.totalSettlements },
                    crm: { synced: p.settledCount, total: c.totalEvents }, // mixing for mock
                    data: { ingested: d.totalRecordsIngested, sources: d.totalSources }
                });
            } catch (error) {
                console.error("Failed to load strategy stats", error);
            } finally {
                setLoading(false);
            }
        };
        loadAllStats();
    }, []);

    const healthBreakdown = [
        { name: "Payment Gateway", score: 94, trend: "+2.4%", icon: <CreditCard className="w-4 h-4 text-emerald-400" /> },
        { name: "CRM Automation", score: 82, trend: "-1.2%", icon: <Users className="w-4 h-4 text-amber-400" /> },
        { name: "Data Aggregation", score: 91, trend: "+0.8%", icon: <Database className="w-4 h-4 text-blue-400" /> },
        { name: "Notifications", score: 87, trend: "+4.1%", icon: <Bell className="w-4 h-4 text-violet-400" /> }
    ];

    return (
        <SharedDashboardLayout
            title="Operational Strategy"
            subtitle="Macro-level operational efficiency and cross-service performance analytics."
            titleIcon={<BarChart3 className="w-6 h-6 text-white" />}
            accentGradient="from-indigo-500 to-purple-600"
        >
            {/* Strategy Focus */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Efficiency Score Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-8 overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Operational Efficiency Score</h2>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-6xl font-black text-white">{efficiencyScore}</span>
                                    <span className="text-xl font-bold text-emerald-400 flex items-center gap-1">
                                        <TrendingUp className="w-5 h-5" /> 8.4%
                                    </span>
                                </div>
                                <p className="text-slate-500 text-sm mt-4 max-w-sm">
                                    Calculated across all connected systems based on STP rates, sync latency, and resource utilization.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-24 h-24 rounded-full border-8 border-indigo-500/20 border-t-indigo-500 flex items-center justify-center">
                                        <span className="text-lg font-bold">92%</span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">Uptime</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-24 h-24 rounded-full border-8 border-violet-500/20 border-t-violet-500 flex items-center justify-center">
                                        <span className="text-lg font-bold">14ms</span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">Latency</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Service Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {healthBreakdown.map((item, i) => (
                            <motion.div
                                key={item.name}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-colors"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center">
                                            {item.icon}
                                        </div>
                                        <span className="text-sm font-semibold">{item.name}</span>
                                    </div>
                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {item.trend}
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-white/[0.03] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.score}%` }}
                                        className={`h-full bg-gradient-to-r ${i % 2 === 0 ? 'from-indigo-500 to-violet-500' : 'from-blue-500 to-cyan-500'}`}
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Health</span>
                                    <span className="text-[10px] font-bold">{item.score}%</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Market Positioning Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-indigo-500/10 to-purple-600/10 backdrop-blur-xl p-6"
                    >
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Target className="w-4 h-4 text-indigo-400" /> Operational Scale
                        </h3>
                        <div className="space-y-6">
                            <MiniStat label="Projected Monthly Volume" value="50k orders" icon={<Zap className="w-4 h-4 text-amber-400" />} />
                            <MiniStat label="Global Reach" value="24 Regions" icon={<Globe className="w-4 h-4 text-blue-400" />} />
                            <div className="pt-4 border-t border-white/[0.1]">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <div>
                                        <p className="text-xs font-bold text-white">Tier: Enterprise</p>
                                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Scaling enabled</p>
                                    </div>
                                    <ProBadge />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Case Study Template */}
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <PieChart className="w-4 h-4" /> Optimization Path
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-6">
                            Identified 12% inefficiency in CRM sync cycles. Recommended transition to event-driven webhooks for lead propagation.
                        </p>
                        <button className="w-full py-3 rounded-xl bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-colors">
                            Generate Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Cross-Service Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <KPICard label="Total Processed" value="$12.4M" subtitle="Cross-gateway volume" icon={<CreditCard className="w-5 h-5" />} gradient="from-emerald-500 to-green-600" glow="shadow-emerald-500/20" />
                <KPICard label="Active Entities" value="1.2M" subtitle="Synced CRM records" icon={<Users className="w-5 h-5" />} gradient="from-blue-500 to-indigo-600" glow="shadow-blue-500/20" />
                <KPICard label="Data Lake Size" value="84 TB" subtitle="Warehouse footprint" icon={<Database className="w-5 h-5" />} gradient="from-violet-500 to-purple-600" glow="shadow-violet-500/20" />
            </div>
        </SharedDashboardLayout>
    );
}
