import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeadLetter } from "@/api/apiIntegration";

type DeadLetterPanelProps = {
  items: DeadLetter[];
  loading: boolean;
  error: string | null;
  replayingId: string | null;
  onRefresh: () => Promise<void>;
  onReplay: (id: string) => Promise<void>;
};

export default function DeadLetterPanel({
  items,
  loading,
  error,
  replayingId,
  onRefresh,
  onReplay,
}: DeadLetterPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Dead Letter Queue</CardTitle>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => void onRefresh()}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-2">
              <p className="font-mono text-xs text-zinc-300">{item.id}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-rose-500/15 text-rose-400 border-rose-400/40">
                  {item.status}
                </Badge>
                <Badge variant="outline">Replay Count: {item.replay_count}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.error_message}</p>
            </div>
            <Button
              size="sm"
              disabled={replayingId === item.id}
              onClick={() => void onReplay(item.id)}
            >
              {replayingId === item.id ? "Replaying..." : "Replay"}
            </Button>
          </div>
        ))}

        {items.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">No dead letter items found.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
