import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Workflow,
    Webhook,
    CreditCard,
    Users,
    Database,
    Bell,
    FileText,
    AlertTriangle,
    BarChart3,
    Shield,
    ChevronLeft,
    ChevronRight,
    Layers,
    Settings,
} from "lucide-react";

interface NavItem {
    label: string;
    icon: React.ReactNode;
    path: string;
    badge?: number;
    pro?: boolean;
}

interface NavCategory {
    title: string;
    items: NavItem[];
}

interface SidebarProps {
    dlqTotal?: number;
}

const buildNavigation = (dlqTotal: number): NavCategory[] => [
    {
        title: "Core Systems",
        items: [
            { label: "API Flows", icon: <Workflow className="w-4 h-4" />, path: "/services/api-integration" },
        ],
    },
    {
        title: "Specialized Hubs",
        items: [
            { label: "Webhooks", icon: <Webhook className="w-4 h-4" />, path: "/services/api-integration/ecommerce-order-sync" },
            { label: "Payments", icon: <CreditCard className="w-4 h-4" />, path: "/services/api-integration/payment-gateway" },
            { label: "CRM", icon: <Users className="w-4 h-4" />, path: "/services/api-integration/crm-automation" },
            { label: "Data", icon: <Database className="w-4 h-4" />, path: "/services/api-integration/data-aggregation" },
            { label: "Notifications", icon: <Bell className="w-4 h-4" />, path: "/services/api-integration/saas-workflows" },
        ],
    },
    {
        title: "Admin",
        items: [
            { label: "Audit Logs", icon: <FileText className="w-4 h-4" />, path: "/services/api-integration" },
            { label: "Dead Letter Queue", icon: <AlertTriangle className="w-4 h-4" />, path: "/admin/dlq", badge: dlqTotal },
            { label: "Strategy", icon: <BarChart3 className="w-4 h-4" />, path: "/strategy" },
            { label: "Security", icon: <Shield className="w-4 h-4" />, path: "/security" },
            { label: "Settings", icon: <Settings className="w-4 h-4" />, path: "/services" },
        ],
    },
];

export default function Sidebar({ dlqTotal = 0 }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem("synapse_sidebar") === "collapsed"; } catch { return false; }
    });

    useEffect(() => {
        try { localStorage.setItem("synapse_sidebar", collapsed ? "collapsed" : "expanded"); } catch { /* noop */ }
    }, [collapsed]);

    const nav = buildNavigation(dlqTotal);

    return (
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? 72 : 256 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-white/[0.06] bg-slate-950/80 backdrop-blur-2xl"
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06] shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                    <Layers className="w-4 h-4 text-white" />
                </div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="text-sm font-semibold tracking-tight text-white whitespace-nowrap overflow-hidden"
                        >
                            SynapseOps
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
                {nav.map((category) => (
                    <div key={category.title}>
                        {!collapsed && (
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-2 mb-2">
                                {category.title}
                            </p>
                        )}
                        <ul className="space-y-0.5">
                            {category.items.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <li key={item.path + item.label}>
                                        <button
                                            onClick={() => navigate(item.path)}
                                            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group ${isActive
                                                ? "bg-white/[0.06] text-white shadow-sm"
                                                : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                                                }`}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <span className={`shrink-0 ${isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`}>
                                                {item.icon}
                                            </span>
                                            {!collapsed && (
                                                <>
                                                    <span className="truncate">{item.label}</span>
                                                    {item.badge !== undefined && item.badge > 0 && (
                                                        <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                    {item.pro && (
                                                        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                                            PRO
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {collapsed && item.badge !== undefined && item.badge > 0 && (
                                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Collapse toggle */}
            <div className="border-t border-white/[0.06] px-3 py-3 shrink-0">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-slate-500 hover:text-white hover:bg-white/[0.03] transition-colors"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {!collapsed && <span className="text-xs">Collapse</span>}
                </button>
            </div>
        </motion.aside>
    );
}
