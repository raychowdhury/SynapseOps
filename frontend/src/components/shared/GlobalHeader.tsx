import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Activity, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GlobalHeaderProps {
    dlqTotal?: number;
}

export default function GlobalHeader({ dlqTotal = 0 }: GlobalHeaderProps) {
    const navigate = useNavigate();
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const systemHealthy = dlqTotal === 0;

    return (
        <header className="sticky top-0 z-30 backdrop-blur-2xl bg-slate-950/60 border-b border-white/[0.06]">
            <div className="flex items-center justify-between px-6 h-14">
                {/* Left — Search */}
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative">
                        <button
                            onClick={() => setSearchOpen(!searchOpen)}
                            className="flex items-center gap-2 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.06] pl-3 pr-4 py-2 rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-all text-sm"
                        >
                            <Search className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Search flows…</span>
                            <kbd className="hidden md:inline-flex text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-slate-500 ml-2">⌘K</kbd>
                        </button>
                    </div>
                </div>

                {/* Right — Actions */}
                <div className="flex items-center gap-3">
                    {/* New Flow Button */}
                    <button
                        onClick={() => navigate("/services/api-integration")}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">New Flow</span>
                    </button>

                    {/* System Health */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${systemHealthy
                            ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-400"
                            : "bg-red-500/5 border-red-500/15 text-red-400"
                        }`}>
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium hidden sm:inline">
                            {systemHealthy ? "All Systems Healthy" : "Issues Detected"}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${systemHealthy ? "bg-emerald-400" : "bg-red-400 animate-pulse"}`} />
                    </div>

                    {/* DLQ Badge */}
                    {dlqTotal > 0 && (
                        <button
                            onClick={() => navigate("/admin/dlq")}
                            className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors"
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">{dlqTotal}</span>
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        </button>
                    )}
                </div>
            </div>

            {/* Search Overlay */}
            <AnimatePresence>
                {searchOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute top-full left-0 right-0 bg-slate-950/95 backdrop-blur-2xl border-b border-white/[0.06] p-4"
                    >
                        <div className="max-w-2xl mx-auto relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search flows, services, settings…"
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all"
                            />
                            <button
                                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
