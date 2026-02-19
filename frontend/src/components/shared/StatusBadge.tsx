import { CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import React from "react";

const DEFAULT_STYLES: Record<string, string> = {
    received: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    processed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    settled: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    synced: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    dead_letter: "bg-red-800/20 text-red-300 border-red-800/30",
    sent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    expired: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    settled: <CheckCircle2 className="w-3 h-3 mr-1" />,
    completed: <CheckCircle2 className="w-3 h-3 mr-1" />,
    success: <CheckCircle2 className="w-3 h-3 mr-1" />,
    synced: <CheckCircle2 className="w-3 h-3 mr-1" />,
    approved: <CheckCircle2 className="w-3 h-3 mr-1" />,
    active: <CheckCircle2 className="w-3 h-3 mr-1" />,
    failed: <XCircle className="w-3 h-3 mr-1" />,
    rejected: <XCircle className="w-3 h-3 mr-1" />,
    pending: <Clock className="w-3 h-3 mr-1" />,
    dead_letter: <AlertTriangle className="w-3 h-3 mr-1" />,
    processing: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
};

interface StatusBadgeProps {
    status: string;
    customStyles?: Record<string, string>;
}

export default function StatusBadge({ status, customStyles }: StatusBadgeProps) {
    const styles = customStyles ?? DEFAULT_STYLES;
    const style = styles[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${style}`}>
            {STATUS_ICONS[status]}
            {status.replace(/_/g, " ")}
        </span>
    );
}
