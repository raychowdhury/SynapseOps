import { useState } from "react";
import {
    Bell,
    CheckCircle2,
    XCircle,
    Clock,
    Send,
    Zap,
    Plus,
    Play,
    Pause,
    MessageSquare,
    Mail,
    Shield,
    RefreshCw,
    AlertTriangle,
    ChevronRight,
    Hash,
} from "lucide-react";
import { motion } from "framer-motion";
import SharedDashboardLayout from "@/components/shared/SharedDashboardLayout";
import KPICard from "@/components/shared/KPICard";
import StatusBadge from "@/components/shared/StatusBadge";
import ProBadge from "@/components/shared/ProBadge";
import { useChannels, useWorkflows, useUpdateWorkflowStatus, useTriggerWorkflow, useNotifications, useApprovals, useRespondToApproval } from "@/hooks/useNotifications";
import type { NotificationPayload } from "@/lib/notifications";
import { toast } from "sonner";

const PLATFORM_STYLES: Record<string, { icon: React.ReactNode; gradient: string; glow: string; label: string }> = {
    slack: { icon: <Hash className="w-5 h-5" />, gradient: "from-[#4A154B] to-[#E01E5A]", glow: "shadow-pink-500/20", label: "Slack" },
    teams: { icon: <MessageSquare className="w-5 h-5" />, gradient: "from-[#464EB8] to-[#6264A7]", glow: "shadow-indigo-500/20", label: "Teams" },
    salesforce: { icon: <Mail className="w-5 h-5" />, gradient: "from-[#00A1E0] to-[#0070D2]", glow: "shadow-blue-500/20", label: "Salesforce" },
};

// Visual workflow steps for the designer
const MOCK_WORKFLOW_STEPS = [
    { id: "trigger", label: "Webhook Trigger", type: "trigger", color: "from-blue-500 to-cyan-500" },
    { id: "filter", label: "Priority Filter", type: "condition", color: "from-amber-500 to-orange-500" },
    { id: "notify", label: "Slack Notification", type: "action", color: "from-emerald-500 to-teal-500" },
    { id: "approve", label: "Manager Approval", type: "gate", color: "from-violet-500 to-purple-500" },
    { id: "escalate", label: "Escalate to Teams", type: "action", color: "from-red-500 to-pink-500" },
];

export default function SaasNotificationsPage() {
    const { data: channels, isLoading: channelsLoading } = useChannels();
    const { data: workflows, isLoading: workflowsLoading } = useWorkflows();
    const { data: notifications, isLoading: notifsLoading } = useNotifications();
    const { data: approvals, isLoading: approvalsLoading } = useApprovals("pending");

    const updateStatus = useUpdateWorkflowStatus();
    const triggerWf = useTriggerWorkflow();
    const respondApproval = useRespondToApproval();

    const [activeTab, setActiveTab] = useState<"channels" | "workflows" | "designer" | "notifications" | "approvals" | "trigger">("channels");
    const [triggerTitle, setTriggerTitle] = useState("");
    const [triggerBody, setTriggerBody] = useState("");
    const [triggerWorkflowId, setTriggerWorkflowId] = useState<string | null>(null);

    const handleTrigger = () => {
        if (!triggerWorkflowId || !triggerTitle.trim() || !triggerBody.trim()) {
            toast.error("Select a workflow and fill in title & body");
            return;
        }
        const payload: NotificationPayload = { title: triggerTitle, body: triggerBody, priority: "normal", metadata: {} };
        triggerWf.mutate(
            { id: triggerWorkflowId, payload },
            {
                onSuccess: () => { toast.success("Workflow triggered successfully"); setTriggerTitle(""); setTriggerBody(""); setTriggerWorkflowId(null); },
                onError: (e) => toast.error(e.message),
            }
        );
    };

    const handleStatusToggle = (id: string, current: string) => {
        const next = current === "active" ? "paused" : "active";
        updateStatus.mutate({ id, status: next }, { onSuccess: () => toast.success(`Workflow ${next}`) });
    };

    const loading = channelsLoading || workflowsLoading || notifsLoading || approvalsLoading;
    const sentCount = notifications?.filter(n => n.status === "sent").length ?? 0;
    const activeWfCount = workflows?.filter(w => w.status === "active").length ?? 0;

    const tabs = [
        { key: "channels" as const, label: "Channels", count: channels?.length ?? 0 },
        { key: "workflows" as const, label: "Workflows", count: workflows?.length ?? 0 },
        { key: "designer" as const, label: "Designer", count: MOCK_WORKFLOW_STEPS.length },
        { key: "notifications" as const, label: "Notifications", count: notifications?.length ?? 0 },
        { key: "approvals" as const, label: "Approvals", count: approvals?.length ?? 0 },
        { key: "trigger" as const, label: "Quick Trigger", count: 0 },
    ];

    return (
        <SharedDashboardLayout
            title="SaaS Notifications & Workflows"
            subtitle="Slack · Teams · Salesforce — Multi-channel orchestration"
            titleIcon={<Bell className="w-6 h-6 text-white" />}
            accentGradient="from-pink-500 to-rose-600"
            headerActions={
                <a href="/services/api-integration/saas-workflows/workflow-builder"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white text-sm font-medium hover:opacity-90 shadow-lg shadow-pink-500/20 transition-all">
                    <Plus className="w-4 h-4" /> New Workflow
                </a>
            }
        >
            {/* ── KPI Cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard label="Connected Channels" value={`${channels?.length ?? 0}`} subtitle="across all platforms"
                    icon={<Hash className="w-5 h-5" />} gradient="from-blue-500 to-cyan-600" glow="shadow-blue-500/20" />
                <KPICard label="Active Workflows" value={`${activeWfCount}`} subtitle={`of ${workflows?.length ?? 0} total`}
                    icon={<Zap className="w-5 h-5" />} gradient="from-emerald-500 to-teal-600" glow="shadow-emerald-500/20" />
                <KPICard label="Notifications Sent" value={`${sentCount}`} subtitle="successfully delivered"
                    icon={<Send className="w-5 h-5" />} gradient="from-violet-500 to-purple-600" glow="shadow-violet-500/20" />
                <KPICard label="Pending Approvals" value={`${approvals?.length ?? 0}`} subtitle="awaiting response"
                    icon={<Clock className="w-5 h-5" />} gradient="from-amber-500 to-orange-600" glow="shadow-amber-500/20" />
            </div>

            {/* ── Tab Navigation ─────────────────────────────────────── */}
            <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit flex-wrap">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === tab.key
                            ? "bg-white/[0.06] text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"}`}>
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-md ${activeTab === tab.key ? "bg-white/[0.08] text-slate-200" : "bg-white/[0.04] text-slate-500"}`}>{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ───────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                        <RefreshCw className="w-8 h-8 text-pink-400 animate-spin" />
                        <span className="text-slate-400 text-sm">Loading notification data…</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Channels */}
                    {activeTab === "channels" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-200">Connected Channels</h3>
                                <a href="/services/api-integration/saas-workflows/channels"
                                    className="text-xs text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add Channel
                                </a>
                            </div>
                            {!channels?.length ? (
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center text-slate-500">
                                    No channels configured. Click "Add Channel" to get started.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {channels.map(ch => {
                                        const ps = PLATFORM_STYLES[ch.platform] ?? { icon: <Mail className="w-5 h-5" />, gradient: "from-slate-500 to-slate-600", glow: "", label: ch.platform };
                                        return (
                                            <motion.div key={ch.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 hover:border-white/[0.1] transition-all">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ps.gradient} flex items-center justify-center shadow-lg ${ps.glow} text-white`}>
                                                        {ps.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate">{ch.name}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{ps.label}</p>
                                                    </div>
                                                    <StatusBadge status={ch.status} />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Workflows */}
                    {activeTab === "workflows" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-slate-200">Workflows</h3>
                                <a href="/services/api-integration/saas-workflows/workflow-builder"
                                    className="text-xs text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> New Workflow
                                </a>
                            </div>
                            {!workflows?.length ? (
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center text-slate-500">No workflows yet.</div>
                            ) : (
                                workflows.map(wf => (
                                    <motion.div key={wf.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 hover:border-white/[0.1] transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold">{wf.name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Trigger: <span className="font-mono text-pink-300">{wf.trigger_event}</span> from <span className="capitalize text-slate-400">{wf.trigger_source}</span> · {wf.steps.length} step{wf.steps.length !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <StatusBadge status={wf.status} />
                                                {wf.status !== "draft" && (
                                                    <button onClick={() => handleStatusToggle(wf.id, wf.status)} disabled={updateStatus.isPending}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs text-slate-300 transition-all disabled:opacity-50">
                                                        {wf.status === "active" ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Activate</>}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {/* Workflow Designer (Visual Canvas) */}
                    {activeTab === "designer" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-5 h-5 text-pink-400" />
                                <h3 className="text-sm font-semibold">Visual Workflow Designer</h3>
                                <ProBadge />
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-8 overflow-x-auto">
                                <div className="flex items-center gap-3 min-w-[700px]">
                                    {MOCK_WORKFLOW_STEPS.map((step, i) => (
                                        <div key={step.id} className="flex items-center gap-3">
                                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                                                className="relative group cursor-pointer">
                                                <div className={`w-36 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 hover:border-white/[0.15] transition-all`}>
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center mb-3 shadow-lg`}>
                                                        {step.type === "trigger" && <Zap className="w-4 h-4 text-white" />}
                                                        {step.type === "condition" && <AlertTriangle className="w-4 h-4 text-white" />}
                                                        {step.type === "action" && <Send className="w-4 h-4 text-white" />}
                                                        {step.type === "gate" && <Shield className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <p className="text-xs font-semibold text-white mb-1">{step.label}</p>
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">{step.type}</span>
                                                </div>
                                            </motion.div>
                                            {i < MOCK_WORKFLOW_STEPS.length - 1 && (
                                                <div className="flex items-center gap-1">
                                                    <div className="w-8 h-px bg-gradient-to-r from-white/20 to-white/5" />
                                                    <ChevronRight className="w-3 h-3 text-slate-600" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 text-center">Drag to rearrange steps · Click to configure · Double-click to add conditions</p>
                        </motion.div>
                    )}

                    {/* Notifications */}
                    {activeTab === "notifications" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/[0.06]">
                                <h3 className="text-sm font-semibold text-slate-200">Recent Notifications</h3>
                            </div>
                            {!notifications?.length ? (
                                <div className="p-12 text-center text-slate-500">No notifications dispatched yet.</div>
                            ) : (
                                <div className="divide-y divide-white/[0.03]">
                                    {notifications.slice(0, 20).map(n => (
                                        <div key={n.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{n.payload?.title ?? "Untitled"}</p>
                                                <p className="text-xs text-slate-500 mt-0.5 truncate">{n.payload?.body ?? ""}</p>
                                            </div>
                                            <div className="flex items-center gap-3 ml-4 shrink-0">
                                                {n.attempts > 0 && <span className="text-[10px] text-slate-500 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">×{n.attempts}</span>}
                                                <StatusBadge status={n.status} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Approvals */}
                    {activeTab === "approvals" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                            <h3 className="text-sm font-semibold text-slate-200 mb-2">Pending Approvals</h3>
                            {!approvals?.length ? (
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center text-slate-500">No pending approvals.</div>
                            ) : (
                                approvals.map(a => (
                                    <div key={a.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 hover:border-white/[0.1] transition-all">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-white">{a.approver_email}</p>
                                                <p className="text-xs text-slate-500 font-mono mt-0.5">{a.notification_id.slice(0, 12)}…</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => respondApproval.mutate({ id: a.id, decision: "approved" }, { onSuccess: () => toast.success("Approved") })}
                                                    disabled={respondApproval.isPending}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-medium transition-all disabled:opacity-50">
                                                    <CheckCircle2 className="w-3 h-3" /> Approve
                                                </button>
                                                <button onClick={() => respondApproval.mutate({ id: a.id, decision: "rejected" }, { onSuccess: () => toast.info("Rejected") })}
                                                    disabled={respondApproval.isPending}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-medium transition-all disabled:opacity-50">
                                                    <XCircle className="w-3 h-3" /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {/* Quick Trigger */}
                    {activeTab === "trigger" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 max-w-lg">
                            <h3 className="text-sm font-semibold text-slate-200 mb-5">Quick Trigger a Workflow</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1.5">Workflow</label>
                                    <select value={triggerWorkflowId ?? ""} onChange={(e) => setTriggerWorkflowId(e.target.value || null)}
                                        className="w-full h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-white focus:border-pink-500/50 focus:outline-none transition-colors">
                                        <option value="">Select workflow…</option>
                                        {workflows?.filter(w => w.status === "active").map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1.5">Title</label>
                                    <input type="text" value={triggerTitle} onChange={(e) => setTriggerTitle(e.target.value)} placeholder="Notification title"
                                        className="w-full h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-white placeholder:text-slate-600 focus:border-pink-500/50 focus:outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1.5">Body</label>
                                    <input type="text" value={triggerBody} onChange={(e) => setTriggerBody(e.target.value)} placeholder="Notification body"
                                        className="w-full h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-white placeholder:text-slate-600 focus:border-pink-500/50 focus:outline-none transition-colors" />
                                </div>
                                <button onClick={handleTrigger} disabled={triggerWf.isPending}
                                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white text-sm font-medium hover:opacity-90 shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50">
                                    {triggerWf.isPending ? "Triggering…" : "Trigger Workflow"}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </>
            )}
        </SharedDashboardLayout>
    );
}
