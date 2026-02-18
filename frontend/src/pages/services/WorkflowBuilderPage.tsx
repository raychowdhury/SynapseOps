import { useState } from "react";
import { useChannels, useCreateWorkflow } from "@/hooks/useNotifications";
import type { WorkflowStepCreate } from "@/lib/notifications";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AmbientBackground from "@/components/landing/AmbientBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ACTION_TYPES = [
    { value: "notify", label: "Send Notification", color: "bg-blue-500" },
    { value: "approve", label: "Request Approval", color: "bg-yellow-500" },
    { value: "wait", label: "Wait / Delay", color: "bg-gray-500" },
    { value: "condition", label: "Condition Check", color: "bg-purple-500" },
] as const;

const TRIGGER_SOURCES = ["slack", "teams", "salesforce", "webhook", "manual"] as const;

export default function WorkflowBuilderPage() {
    const { data: channels } = useChannels();
    const createWorkflow = useCreateWorkflow();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [triggerEvent, setTriggerEvent] = useState("");
    const [triggerSource, setTriggerSource] = useState<string>("webhook");
    const [steps, setSteps] = useState<WorkflowStepCreate[]>([]);

    const addStep = (actionType: string) => {
        setSteps([
            ...steps,
            {
                step_order: steps.length + 1,
                action_type: actionType as WorkflowStepCreate["action_type"],
                config: {},
                channel_id: undefined,
            },
        ]);
    };

    const removeStep = (index: number) => {
        const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 }));
        setSteps(updated);
    };

    const updateStep = (index: number, field: string, value: string) => {
        const updated = [...steps];
        if (field === "channel_id") {
            updated[index] = { ...updated[index], channel_id: value || undefined };
        } else if (field === "action_type") {
            updated[index] = { ...updated[index], action_type: value as WorkflowStepCreate["action_type"] };
        }
        setSteps(updated);
    };

    const handleSave = () => {
        if (!name.trim() || !triggerEvent.trim()) {
            toast.error("Workflow name and trigger event are required");
            return;
        }
        if (steps.length === 0) {
            toast.error("Add at least one step");
            return;
        }
        createWorkflow.mutate(
            {
                name: name.trim(),
                description: description.trim() || undefined,
                trigger_event: triggerEvent.trim(),
                trigger_source: triggerSource as any,
                steps,
            },
            {
                onSuccess: () => {
                    toast.success("Workflow created successfully");
                    window.location.href = "/services/saas-notifications";
                },
                onError: (e) => toast.error(e.message),
            }
        );
    };

    return (
        <>
            <AmbientBackground />
            <Navbar />
            <main className="min-h-screen pt-28 pb-24 relative z-[1]">
                <div className="container max-w-3xl">
                    <div className="flex items-center gap-3 mb-8">
                        <a href="/services/saas-notifications" className="text-text-2 hover:text-foreground transition-colors text-sm">
                            ← Back
                        </a>
                        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                            Workflow Builder
                        </h1>
                    </div>

                    {/* Workflow Info */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-base">Workflow Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Workflow Name</Label>
                                    <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New Lead Alert" />
                                </div>
                                <div>
                                    <Label>Trigger Event</Label>
                                    <Input className="mt-1" value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} placeholder="e.g. new_lead, deal_closed" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Trigger Source</Label>
                                    <select
                                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                        value={triggerSource}
                                        onChange={(e) => setTriggerSource(e.target.value)}
                                    >
                                        {TRIGGER_SOURCES.map((s) => (
                                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>Description (optional)</Label>
                                    <Input className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Steps */}
                    <Card className="mb-6">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Steps</CardTitle>
                            <div className="flex gap-2">
                                {ACTION_TYPES.map((at) => (
                                    <Button key={at.value} variant="outline" size="sm" onClick={() => addStep(at.value)} className="text-xs">
                                        + {at.label}
                                    </Button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {steps.length === 0 ? (
                                <div className="text-center py-10 text-text-2">
                                    <p className="text-sm font-medium mb-2">No steps yet</p>
                                    <p className="text-xs">Click a button above to add workflow steps</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {steps.map((step, i) => {
                                        const at = ACTION_TYPES.find((a) => a.value === step.action_type);
                                        return (
                                            <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50">
                                                {/* Step number */}
                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-text-2 shrink-0">
                                                    {step.step_order}
                                                </div>

                                                {/* Connector line */}
                                                {i < steps.length - 1 && (
                                                    <div className="absolute left-[2.25rem] top-full w-0.5 h-3 bg-border" />
                                                )}

                                                {/* Action type badge */}
                                                <Badge className={`${at?.color ?? "bg-gray-500"} text-white border-0 text-[10px] shrink-0`}>
                                                    {at?.label ?? step.action_type}
                                                </Badge>

                                                {/* Channel selector (for notify/approve) */}
                                                {(step.action_type === "notify" || step.action_type === "approve") && (
                                                    <select
                                                        className="h-8 rounded-md border border-input bg-background px-2 text-xs flex-1"
                                                        value={step.channel_id ?? ""}
                                                        onChange={(e) => updateStep(i, "channel_id", e.target.value)}
                                                    >
                                                        <option value="">Select channel...</option>
                                                        {channels?.map((ch) => (
                                                            <option key={ch.id} value={ch.id}>{ch.name} ({ch.platform})</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {step.action_type === "wait" && (
                                                    <span className="text-xs text-text-2">Waits before proceeding to the next step</span>
                                                )}

                                                {step.action_type === "condition" && (
                                                    <span className="text-xs text-text-2">Evaluates a condition before proceeding</span>
                                                )}

                                                <Button variant="ghost" size="sm" onClick={() => removeStep(i)} className="px-2 text-red-400 hover:text-red-300 shrink-0 ml-auto">
                                                    ×
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Save */}
                    <Button onClick={handleSave} disabled={createWorkflow.isPending} className="w-full">
                        {createWorkflow.isPending ? "Saving..." : "Save Workflow"}
                    </Button>
                </div>
            </main>
            <Footer />
        </>
    );
}
