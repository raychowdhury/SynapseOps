import { useState } from "react";
import { useChannels } from "@/hooks/useNotifications";
import { useWorkflows, useUpdateWorkflowStatus, useTriggerWorkflow } from "@/hooks/useNotifications";
import { useNotifications, useApprovals, useRespondToApproval } from "@/hooks/useNotifications";
import type { NotificationPayload } from "@/lib/notifications";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AmbientBackground from "@/components/landing/AmbientBackground";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-500",
    inactive: "bg-gray-500",
    draft: "bg-gray-500",
    paused: "bg-yellow-500",
    pending: "bg-blue-500",
    sent: "bg-green-500",
    failed: "bg-red-500",
    dead_letter: "bg-red-800",
    approved: "bg-green-500",
    rejected: "bg-red-500",
    expired: "bg-gray-500",
};

const PLATFORM_ICONS: Record<string, { label: string; color: string }> = {
    slack: { label: "SLK", color: "bg-[#4A154B]/20 text-[#E01E5A]" },
    teams: { label: "TMS", color: "bg-[#464EB8]/20 text-[#6264A7]" },
    salesforce: { label: "SF", color: "bg-[#00A1E0]/20 text-[#00A1E0]" },
};

export default function SaasNotificationsPage() {
    const { data: channels, isLoading: channelsLoading } = useChannels();
    const { data: workflows, isLoading: workflowsLoading } = useWorkflows();
    const { data: notifications, isLoading: notifsLoading } = useNotifications();
    const { data: approvals, isLoading: approvalsLoading } = useApprovals("pending");

    const updateStatus = useUpdateWorkflowStatus();
    const triggerWf = useTriggerWorkflow();
    const respondApproval = useRespondToApproval();

    const [triggerTitle, setTriggerTitle] = useState("");
    const [triggerBody, setTriggerBody] = useState("");
    const [triggerWorkflowId, setTriggerWorkflowId] = useState<string | null>(null);

    const handleTrigger = () => {
        if (!triggerWorkflowId || !triggerTitle.trim() || !triggerBody.trim()) {
            toast.error("Select a workflow and fill in title & body");
            return;
        }
        const payload: NotificationPayload = {
            title: triggerTitle,
            body: triggerBody,
            priority: "normal",
            metadata: {},
        };
        triggerWf.mutate(
            { id: triggerWorkflowId, payload },
            {
                onSuccess: () => {
                    toast.success("Workflow triggered successfully");
                    setTriggerTitle("");
                    setTriggerBody("");
                    setTriggerWorkflowId(null);
                },
                onError: (e) => toast.error(e.message),
            }
        );
    };

    const handleStatusToggle = (id: string, current: string) => {
        const next = current === "active" ? "paused" : "active";
        updateStatus.mutate(
            { id, status: next },
            { onSuccess: () => toast.success(`Workflow ${next}`) }
        );
    };

    return (
        <>
            <AmbientBackground />
            <Navbar />
            <main className="min-h-screen pt-28 pb-24 relative z-[1]">
                <div className="container">
                    {/* Header */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold bg-primary/10 text-primary-light">
                                NTF
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                                    SaaS Notifications & Workflows
                                </h1>
                                <p className="text-text-2 text-sm mt-0.5">
                                    Connect Slack, Teams & Salesforce · Trigger real-time notifications · Manage approval workflows
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <a href="/services/api-integration/saas-workflows/channels">
                                <Button variant="outline" size="sm">Configure Channels</Button>
                            </a>
                            <a href="/services/api-integration/saas-workflows/workflow-builder">
                                <Button variant="outline" size="sm">Build Workflow</Button>
                            </a>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: "Connected Channels", value: channels?.length ?? 0, color: "text-blue-400" },
                            { label: "Active Workflows", value: workflows?.filter((w) => w.status === "active").length ?? 0, color: "text-green-400" },
                            { label: "Notifications Sent", value: notifications?.filter((n) => n.status === "sent").length ?? 0, color: "text-purple-400" },
                            { label: "Pending Approvals", value: approvals?.length ?? 0, color: "text-yellow-400" },
                        ].map((stat) => (
                            <Card key={stat.label} className="bg-card/50 backdrop-blur-sm border-border/50">
                                <CardContent className="p-5">
                                    <p className="text-sm text-text-2 font-medium">{stat.label}</p>
                                    <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Tabs defaultValue="channels">
                        <TabsList className="mb-6">
                            <TabsTrigger value="channels">Channels</TabsTrigger>
                            <TabsTrigger value="workflows">Workflows</TabsTrigger>
                            <TabsTrigger value="notifications">Notifications</TabsTrigger>
                            <TabsTrigger value="approvals">Approvals</TabsTrigger>
                            <TabsTrigger value="trigger">Quick Trigger</TabsTrigger>
                        </TabsList>

                        {/* Channels Tab */}
                        <TabsContent value="channels">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg">Connected Channels</CardTitle>
                                    <a href="/services/api-integration/saas-workflows/channels">
                                        <Button size="sm">+ Add Channel</Button>
                                    </a>
                                </CardHeader>
                                <CardContent>
                                    {channelsLoading ? (
                                        <p className="text-text-2 text-sm">Loading channels...</p>
                                    ) : !channels?.length ? (
                                        <p className="text-text-2 text-sm">No channels configured. <a href="/services/api-integration/saas-workflows/channels" className="text-primary-light underline">Add one now</a>.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {channels.map((ch) => {
                                                const pi = PLATFORM_ICONS[ch.platform] ?? { label: "?", color: "bg-muted text-text-2" };
                                                return (
                                                    <div key={ch.id} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card/50 hover:border-border/80 transition-colors">
                                                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xs font-bold ${pi.color}`}>
                                                            {pi.label}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm text-foreground truncate">{ch.name}</p>
                                                            <p className="text-xs text-text-2 capitalize">{ch.platform}</p>
                                                        </div>
                                                        <Badge className={`${STATUS_COLORS[ch.status]} text-white border-0 text-[10px]`}>{ch.status}</Badge>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Workflows Tab */}
                        <TabsContent value="workflows">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg">Workflows</CardTitle>
                                    <a href="/services/api-integration/saas-workflows/workflow-builder">
                                        <Button size="sm">+ New Workflow</Button>
                                    </a>
                                </CardHeader>
                                <CardContent>
                                    {workflowsLoading ? (
                                        <p className="text-text-2 text-sm">Loading...</p>
                                    ) : !workflows?.length ? (
                                        <p className="text-text-2 text-sm">No workflows yet.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {workflows.map((wf) => (
                                                <div key={wf.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-foreground">{wf.name}</p>
                                                        <p className="text-xs text-text-2 mt-0.5">
                                                            Trigger: <span className="font-mono">{wf.trigger_event}</span> from <span className="capitalize">{wf.trigger_source}</span> · {wf.steps.length} step{wf.steps.length !== 1 ? "s" : ""}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={`${STATUS_COLORS[wf.status]} text-white border-0 text-[10px]`}>{wf.status}</Badge>
                                                        {wf.status !== "draft" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleStatusToggle(wf.id, wf.status)}
                                                                disabled={updateStatus.isPending}
                                                            >
                                                                {wf.status === "active" ? "Pause" : "Activate"}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Notifications Tab */}
                        <TabsContent value="notifications">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Recent Notifications</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {notifsLoading ? (
                                        <p className="text-text-2 text-sm">Loading...</p>
                                    ) : !notifications?.length ? (
                                        <p className="text-text-2 text-sm">No notifications dispatched yet.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {notifications.slice(0, 20).map((n) => (
                                                <div key={n.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-foreground truncate">{n.payload?.title ?? "Untitled"}</p>
                                                        <p className="text-xs text-text-2 mt-0.5 truncate">{n.payload?.body ?? ""}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-4 shrink-0">
                                                        {n.attempts > 0 && (
                                                            <span className="text-[10px] text-text-2 font-mono">×{n.attempts}</span>
                                                        )}
                                                        <Badge className={`${STATUS_COLORS[n.status]} text-white border-0 text-[10px]`}>{n.status}</Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Approvals Tab */}
                        <TabsContent value="approvals">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Pending Approvals</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {approvalsLoading ? (
                                        <p className="text-text-2 text-sm">Loading...</p>
                                    ) : !approvals?.length ? (
                                        <p className="text-text-2 text-sm">No pending approvals.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {approvals.map((a) => (
                                                <div key={a.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                                                    <div>
                                                        <p className="font-medium text-sm text-foreground">{a.approver_email}</p>
                                                        <p className="text-xs text-text-2 font-mono mt-0.5">{a.notification_id.slice(0, 12)}...</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() =>
                                                                respondApproval.mutate(
                                                                    { id: a.id, decision: "approved" },
                                                                    { onSuccess: () => toast.success("Approved") }
                                                                )
                                                            }
                                                            disabled={respondApproval.isPending}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                respondApproval.mutate(
                                                                    { id: a.id, decision: "rejected" },
                                                                    { onSuccess: () => toast.info("Rejected") }
                                                                )
                                                            }
                                                            disabled={respondApproval.isPending}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Quick Trigger Tab */}
                        <TabsContent value="trigger">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Quick Trigger</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 max-w-md">
                                    <div>
                                        <Label>Workflow</Label>
                                        <select
                                            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                            value={triggerWorkflowId ?? ""}
                                            onChange={(e) => setTriggerWorkflowId(e.target.value || null)}
                                        >
                                            <option value="">Select workflow...</option>
                                            {workflows?.filter((w) => w.status === "active").map((w) => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Title</Label>
                                        <Input className="mt-1" value={triggerTitle} onChange={(e) => setTriggerTitle(e.target.value)} placeholder="Notification title" />
                                    </div>
                                    <div>
                                        <Label>Body</Label>
                                        <Input className="mt-1" value={triggerBody} onChange={(e) => setTriggerBody(e.target.value)} placeholder="Notification body" />
                                    </div>
                                    <Button onClick={handleTrigger} disabled={triggerWf.isPending} className="w-full">
                                        {triggerWf.isPending ? "Triggering..." : "Trigger Workflow"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
            <Footer />
        </>
    );
}
