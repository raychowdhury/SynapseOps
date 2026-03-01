import { useState } from "react";
import { useChannels, useCreateChannel, useDeleteChannel } from "@/hooks/useNotifications";
import type { Platform } from "@/lib/notifications";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AmbientBackground from "@/components/landing/AmbientBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PLATFORMS: { value: Platform; label: string; description: string; icon: string; color: string }[] = [
    {
        value: "slack",
        label: "Slack",
        description: "Send notifications via Slack Incoming Webhooks",
        icon: "SLK",
        color: "bg-[#4A154B]/20 text-[#E01E5A] border-[#E01E5A]/20",
    },
    {
        value: "teams",
        label: "Microsoft Teams",
        description: "Send notifications via Teams Incoming Webhooks",
        icon: "TMS",
        color: "bg-[#464EB8]/20 text-[#6264A7] border-[#6264A7]/20",
    },
    {
        value: "salesforce",
        label: "Salesforce",
        description: "Post to Salesforce Chatter via REST API",
        icon: "SF",
        color: "bg-[#00A1E0]/20 text-[#00A1E0] border-[#00A1E0]/20",
    },
];

export default function ChannelConfigPage() {
    const { data: channels, isLoading } = useChannels();
    const createChannel = useCreateChannel();
    const deleteChannel = useDeleteChannel();

    const [showForm, setShowForm] = useState(false);
    const [platform, setPlatform] = useState<Platform>("slack");
    const [name, setName] = useState("");
    const [webhookUrl, setWebhookUrl] = useState("");
    const [apiToken, setApiToken] = useState("");

    const handleCreate = () => {
        if (!name.trim()) {
            toast.error("Channel name is required");
            return;
        }
        createChannel.mutate(
            {
                platform,
                name: name.trim(),
                webhook_url: webhookUrl.trim() || undefined,
                api_token: apiToken.trim() || undefined,
            },
            {
                onSuccess: () => {
                    toast.success("Channel created");
                    setShowForm(false);
                    setName("");
                    setWebhookUrl("");
                    setApiToken("");
                },
                onError: (e) => toast.error(e.message),
            }
        );
    };

    const handleDelete = (id: string, channelName: string) => {
        if (!confirm(`Delete channel "${channelName}"?`)) return;
        deleteChannel.mutate(id, {
            onSuccess: () => toast.success("Channel deleted"),
        });
    };

    const maskValue = (val: string | null): string => {
        if (!val) return "—";
        if (val.length <= 12) return "••••••••";
        return val.slice(0, 8) + "••••" + val.slice(-4);
    };

    return (
        <>
            <AmbientBackground />
            <Navbar />
            <main className="min-h-screen pt-28 pb-24 relative z-[1]">
                <div className="container max-w-3xl">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <a href="/services/api-integration/saas-workflows" className="text-text-2 hover:text-foreground transition-colors text-sm">
                                ← Back
                            </a>
                            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                                Channel Configuration
                            </h1>
                        </div>
                        <Button size="sm" onClick={() => setShowForm(!showForm)}>
                            {showForm ? "Cancel" : "+ Add Channel"}
                        </Button>
                    </div>

                    {/* Add Channel Form */}
                    {showForm && (
                        <Card className="mb-6 border-primary/30">
                            <CardHeader>
                                <CardTitle className="text-base">New Channel</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Platform selector cards */}
                                <div>
                                    <Label className="mb-2 block">Platform</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {PLATFORMS.map((p) => (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() => setPlatform(p.value)}
                                                className={`p-4 rounded-lg border-2 text-left transition-all ${platform === p.value
                                                    ? `${p.color} border-current`
                                                    : "border-border hover:border-border/80 bg-card/50"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-xs font-bold">{p.icon}</span>
                                                    <span className="text-sm font-semibold text-foreground">{p.label}</span>
                                                </div>
                                                <p className="text-[11px] text-text-2 leading-snug">{p.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label>Channel Name</Label>
                                    <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. #alerts, Sales Team" />
                                </div>

                                {(platform === "slack" || platform === "teams") && (
                                    <div>
                                        <Label>Webhook URL</Label>
                                        <Input className="mt-1" type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
                                    </div>
                                )}

                                {platform === "salesforce" && (
                                    <div>
                                        <Label>API Token / Bearer Token</Label>
                                        <Input className="mt-1" type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder="Enter Salesforce OAuth token" />
                                    </div>
                                )}

                                <Button onClick={handleCreate} disabled={createChannel.isPending} className="w-full">
                                    {createChannel.isPending ? "Creating..." : "Create Channel"}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Existing Channels */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Connected Channels</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <p className="text-text-2 text-sm">Loading...</p>
                            ) : !channels?.length ? (
                                <div className="text-center py-12 text-text-2">
                                    <p className="text-sm font-medium mb-1">No channels connected</p>
                                    <p className="text-xs">Click "+ Add Channel" to connect your first SaaS platform</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {channels.map((ch) => {
                                        const pi = PLATFORMS.find((p) => p.value === ch.platform);
                                        return (
                                            <div key={ch.id} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card/50 hover:border-border/80 transition-colors">
                                                <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${pi?.color ?? "bg-muted text-text-2"}`}>
                                                    {pi?.icon ?? "?"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-sm text-foreground">{ch.name}</p>
                                                        <Badge variant="outline" className="text-[10px]">{ch.platform}</Badge>
                                                    </div>
                                                    <p className="text-xs text-text-2 font-mono mt-0.5">
                                                        {ch.webhook_url ? maskValue(ch.webhook_url) : ch.api_token ? maskValue(ch.api_token) : "No credentials"}
                                                    </p>
                                                </div>
                                                <Badge className={`${ch.status === "active" ? "bg-green-500" : "bg-gray-500"} text-white border-0 text-[10px]`}>
                                                    {ch.status}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-400 hover:text-red-300 px-2"
                                                    onClick={() => handleDelete(ch.id, ch.name)}
                                                    disabled={deleteChannel.isPending}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </>
    );
}
