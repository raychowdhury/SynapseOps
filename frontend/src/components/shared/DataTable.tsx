import React from "react";
import { motion } from "framer-motion";

interface Column<T> {
    key: string;
    label: string;
    align?: "left" | "right" | "center";
    render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (row: T) => string;
    emptyMessage?: string;
    variant?: "default" | "danger";
    title?: string;
    subtitle?: string;
    titleIcon?: React.ReactNode;
    isLoading?: boolean;
}

export default function DataTable<T>({
    columns,
    data,
    keyExtractor,
    emptyMessage = "No data found",
    variant = "default",
    title,
    subtitle,
    titleIcon,
    isLoading = false,
}: DataTableProps<T>) {
    const borderColor = variant === "danger" ? "border-red-900/30" : "border-white/[0.06]";
    const bgColor = variant === "danger" ? "bg-red-950/10" : "bg-white/[0.02]";
    const headerBorder = variant === "danger" ? "border-red-900/20" : "border-white/[0.06]";
    const thColor = variant === "danger" ? "text-red-300/60" : "text-slate-400";
    const rowHover = variant === "danger" ? "hover:bg-red-900/10" : "hover:bg-white/[0.02]";
    const emptyColor = variant === "danger" ? "text-red-400/40" : "text-slate-500";

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`rounded-2xl border ${borderColor} ${bgColor} backdrop-blur-xl overflow-hidden`}
        >
            {title && (
                <div className={`px-5 py-4 border-b ${headerBorder} flex items-center gap-3`}>
                    {titleIcon && (
                        <div className={`w-8 h-8 rounded-lg ${variant === "danger" ? "bg-red-500/10" : "bg-white/[0.04]"} flex items-center justify-center`}>
                            {titleIcon}
                        </div>
                    )}
                    <div>
                        <h3 className={`text-sm font-semibold ${variant === "danger" ? "text-red-200" : "text-white"}`}>{title}</h3>
                        {subtitle && <p className={`text-xs ${variant === "danger" ? "text-red-400/60" : "text-slate-500"}`}>{subtitle}</p>}
                    </div>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className={`border-b ${headerBorder}`}>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} px-5 py-3.5 ${thColor} font-medium text-xs uppercase tracking-wider`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${variant === "danger" ? "divide-red-900/10" : "divide-white/[0.03]"} relative`}>
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-10">
                                <motion.div
                                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="text-xs font-bold uppercase tracking-widest text-slate-500"
                                >
                                    Loading Data...
                                </motion.div>
                            </div>
                        )}
                        {data.map((row, idx) => (
                            <tr key={keyExtractor(row)} className={`${rowHover} transition-colors ${isLoading ? 'opacity-20 select-none pointer-events-none' : ''}`}>
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={`px-5 py-3.5 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                                    >
                                        {col.render ? col.render(row, idx) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {!isLoading && data.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className={`text-center py-14 ${emptyColor}`}>
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}
