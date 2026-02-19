import React from "react";

interface MiniStatProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
}

export default function MiniStat({ label, value, icon }: MiniStatProps) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            {icon}
            <div>
                <p className="text-lg font-semibold leading-none text-white">{value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
        </div>
    );
}
