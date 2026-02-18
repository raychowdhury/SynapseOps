import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { WebhookResponse } from "@/api/apiIntegration";

type WebhookSimulatorProps = {
  payload: string;
  onPayloadChange: (value: string) => void;
  onSend: () => Promise<void>;
  loading: boolean;
  response: WebhookResponse | null;
  error: string | null;
};

function statusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("success") || normalized.includes("succeeded")) {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-400/40";
  }
  if (normalized.includes("running") || normalized.includes("queued")) {
    return "bg-amber-500/15 text-amber-300 border-amber-400/40";
  }
  return "bg-rose-500/15 text-rose-400 border-rose-400/40";
}

export default function WebhookSimulator({
  payload,
  onPayloadChange,
  onSend,
  loading,
  response,
  error,
}: WebhookSimulatorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Webhook Simulator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          className="min-h-[220px] font-mono text-xs"
          value={payload}
          onChange={(event) => onPayloadChange(event.target.value)}
          placeholder="Paste Shopify webhook payload JSON"
        />

        <div className="flex items-center gap-3">
          <Button onClick={() => void onSend()} disabled={loading}>
            {loading ? "Sending..." : "Send Webhook"}
          </Button>
          {response?.status ? (
            <Badge variant="outline" className={statusClass(response.status)}>
              {response.status}
            </Badge>
          ) : null}
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="rounded-md border border-border/70 bg-black/30 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Response</p>
          <pre className="max-h-[220px] overflow-auto text-xs text-zinc-200">
            {response ? JSON.stringify(response, null, 2) : "No response yet."}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
