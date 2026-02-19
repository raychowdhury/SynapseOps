import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import GlobalHeader from "./GlobalHeader";
import { fetchDeadLetter as fetchPaymentDLQ } from "@/lib/paymentGateway";
import { fetchDeadLetter as fetchCrmDLQ } from "@/lib/crmAutomation";
import { fetchDeadLetter as fetchAggDLQ } from "@/lib/dataAggregation";

interface SharedDashboardLayoutProps {
    children: React.ReactNode;
    /** Pass a page title that shows in the main content area */
    title?: string;
    subtitle?: string;
    titleIcon?: React.ReactNode;
    /** Optional accent color for the header icon gradient */
    accentGradient?: string;
    /** Extra elements to render next to the title (e.g. status badges, buttons) */
    headerActions?: React.ReactNode;
}

export default function SharedDashboardLayout({
    children,
    title,
    subtitle,
    titleIcon,
    accentGradient = "from-blue-500 to-violet-600",
    headerActions,
}: SharedDashboardLayoutProps) {
    const [dlqTotal, setDlqTotal] = useState(0);

    useEffect(() => {
        async function loadDLQ() {
            try {
                const [p, c, a] = await Promise.allSettled([
                    fetchPaymentDLQ(),
                    fetchCrmDLQ(),
                    fetchAggDLQ(),
                ]);
                let total = 0;
                if (p.status === "fulfilled") total += p.value.length;
                if (c.status === "fulfilled") total += c.value.length;
                if (a.status === "fulfilled") total += a.value.length;
                setDlqTotal(total);
            } catch {
                /* silently fail */
            }
        }
        loadDLQ();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[hsl(240,20%,4%)] to-slate-950 text-white">
            <Sidebar dlqTotal={dlqTotal} />

            {/* Main content area with sidebar offset */}
            <div className="transition-all duration-300" style={{ marginLeft: "var(--sidebar-width, 256px)" }}>
                <GlobalHeader dlqTotal={dlqTotal} />

                {/* Page Header */}
                {title && (
                    <div className="px-8 pt-8 pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {titleIcon && (
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accentGradient} flex items-center justify-center shadow-lg shadow-blue-500/15`}>
                                        {titleIcon}
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                                    {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
                                </div>
                            </div>
                            {headerActions && <div className="flex items-center gap-3">{headerActions}</div>}
                        </div>
                    </div>
                )}

                {/* Content */}
                <main className="px-8 py-6 space-y-6">
                    {children}
                </main>
            </div>

            {/* Sidebar width CSS variable — synced with sidebar animation */}
            <style>{`
                :root { --sidebar-width: 256px; }
                @media (max-width: 768px) { :root { --sidebar-width: 72px; } }
            `}</style>
        </div>
    );
}
