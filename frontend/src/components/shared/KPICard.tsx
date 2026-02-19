import { motion } from "framer-motion";
import React from "react";

interface KPICardProps {
    label: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    gradient: string;
    glow: string;
}

export default function KPICard({ label, value, subtitle, icon, gradient, glow }: KPICardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 hover:border-white/[0.12] transition-all duration-300 overflow-hidden"
        >
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1.5">{label}</p>
                    <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
                    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${glow}`}>
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}
