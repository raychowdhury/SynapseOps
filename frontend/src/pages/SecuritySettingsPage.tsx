import { useState } from "react";
import { Shield, Lock, Key, Globe, Eye, EyeOff, Check, AlertCircle, Server, Activity } from "lucide-react";
import { motion } from "framer-motion";
import SharedDashboardLayout from "@/components/shared/SharedDashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import ProBadge from "@/components/shared/ProBadge";

export default function SecuritySettingsPage() {
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKey] = useState("syn_live_7c9f2b8e4d1a0c3b5e6f");

    const securityCards = [
        {
            title: "CSRF & XSS Protection",
            desc: "Double-blind cookie validation and Content Security Policy (CSP) headers enabled project-wide.",
            status: "active",
            icon: <Shield className="w-5 h-5 text-emerald-400" />
        },
        {
            title: "Rate Limiting",
            desc: "1,000 requests / minute per endpoint with bursting supported for critical webhooks.",
            status: "active",
            icon: <Activity className="w-5 h-5 text-blue-400" />
        },
        {
            title: "Data Encryption",
            desc: "AES-256 encryption at rest for all canonical records and warehouse snapshots.",
            status: "active",
            icon: <Lock className="w-5 h-5 text-violet-400" />
        }
    ];

    return (
        <SharedDashboardLayout
            title="Enterprise Security"
            subtitle="Security configuration, API governance, and trust settings."
            titleIcon={<Shield className="w-6 h-6 text-white" />}
            accentGradient="from-slate-700 to-slate-900"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Security Overview Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {securityCards.map((card, i) => (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
                            >
                                <div className="p-3 rounded-xl bg-white/[0.03] w-fit mb-4">
                                    {card.icon}
                                </div>
                                <h3 className="text-sm font-semibold mb-2">{card.title}</h3>
                                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                                    {card.desc}
                                </p>
                                <StatusBadge status="completed" />
                            </motion.div>
                        ))}
                    </div>

                    {/* API Access Management */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Key className="w-5 h-5 text-amber-400" /> API Access Keys
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Manage credentials for programmatic access to SynapseOps flows.</p>
                            </div>
                            <button className="px-5 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs font-bold hover:bg-white/[0.1] transition-colors">
                                Rotate Secret
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Live API Key</span>
                                    <span className="text-[10px] text-emerald-400 font-mono">NEVER SHARE IN PUBLIC</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-black/40 border border-white/[0.08] px-4 py-3 rounded-lg font-mono text-sm text-slate-300 relative group overflow-hidden">
                                        <span className={showApiKey ? '' : 'blur-sm select-none'}>
                                            {apiKey}
                                        </span>
                                        <div className="absolute inset-y-0 right-2 flex items-center">
                                            <button
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="p-1.5 rounded-md hover:bg-white/[0.05] text-slate-500 hover:text-white"
                                            >
                                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <button className="px-6 py-3 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors">
                                        Copy Key
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Infrastructure Trust */}
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                        <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                            <Server className="w-4 h-4" /> Infrastructure Health
                        </h3>
                        <div className="space-y-4">
                            {[
                                { service: "Gateway Engine", version: "v4.2.0-stable", latency: "12ms" },
                                { service: "Aggregation Workers", version: "v2.1.8-alpha", latency: "45ms" },
                                { service: "Audit Service", version: "v1.0.4-LTS", latency: "110ms" }
                            ].map((s) => (
                                <div key={s.service} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/[0.04]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-xs font-medium">{s.service}</span>
                                        <span className="text-[10px] text-slate-600 font-mono">{s.version}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">{s.latency}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Compliance Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-2xl border border-white/[0.06] bg-slate-900 p-6 relative overflow-hidden"
                    >
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Compliance</h3>
                        <div className="space-y-4">
                            {[
                                { name: "SOC2 Type II", date: "Verified Dec 2025" },
                                { name: "GDPR Alignment", date: "Compliant" },
                                { name: "ISO 27001", date: "In Progress" }
                            ].map(item => (
                                <div key={item.name} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-white">{item.name}</p>
                                        <p className="text-[9px] text-slate-500">{item.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Audit Logs Quick Link */}
                    <div className="rounded-2xl border border-white/[0.1] bg-gradient-to-br from-blue-500/20 to-indigo-600/20 p-6">
                        <h3 className="text-sm font-bold text-white mb-2">Audit Observatory</h3>
                        <p className="text-xs text-blue-200/60 leading-relaxed mb-6">
                            Every API transaction is immutably logged with signature verification.
                        </p>
                        <button className="w-full py-3 rounded-xl bg-white text-slate-900 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">
                            Access Audit Store
                        </button>
                    </div>

                    {/* Threat Protection */}
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Active Guardians</h3>
                            <ProBadge />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-[10px] text-red-200 font-medium">Anomaly Detection Active</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                <Globe className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] text-emerald-200 font-medium">Global IP Denylist Enforced</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SharedDashboardLayout>
    );
}
