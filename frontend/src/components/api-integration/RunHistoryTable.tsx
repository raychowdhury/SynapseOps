import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRunDetail, type Run, type RunDetail } from "@/api/apiIntegration";

type RunHistoryTableProps = {
  runs: Run[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
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

function formatTimestamp(run: Run): string {
  const raw = run.started_at || run.finished_at;
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

export default function RunHistoryTable({ runs, loading, error, onRefresh }: RunHistoryTableProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);

  const openRunDetails = async (runId: string) => {
    setSelectedRunId(runId);
    setSelectedRun(null);
    setDetailsError(null);
    setDetailsLoading(true);
    setIsDetailsOpen(true);

    try {
      const detail = await getRunDetail(runId);
      setSelectedRun(detail);
    } catch (loadError) {
      setDetailsError(loadError instanceof Error ? loadError.message : "Failed to load run details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const prettyPrint = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Run History</CardTitle>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => void onRefresh()}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Last Error</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="max-w-[190px] truncate font-mono text-xs">
                    <button
                      type="button"
                      className="underline decoration-dotted underline-offset-2 hover:text-primary-light"
                      onClick={() => void openRunDetails(run.id)}
                    >
                      {run.id}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClass(run.status)}>
                      {run.status}
                  </Badge>
                </TableCell>
                <TableCell>{run.attempt_count}</TableCell>
                <TableCell>{run.duration_ms != null ? `${run.duration_ms} ms` : "-"}</TableCell>
                <TableCell className="max-w-[300px] truncate">{run.error_message || "-"}</TableCell>
                <TableCell>{formatTimestamp(run)}</TableCell>
              </TableRow>
            ))}
            {runs.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No runs found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[860px] border-2 border-primary/30 bg-background/95">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle>Run Details</DialogTitle>
            <DialogDescription>Run ID: {selectedRunId || "-"}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[68vh]">
            <div className="space-y-4 pr-2">
              {detailsLoading ? <p className="text-sm text-text-2">Loading run details...</p> : null}
              {detailsError ? <p className="text-sm text-rose-400">{detailsError}</p> : null}

              {selectedRun ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-text-2 mb-1">Status</p>
                      <Badge variant="outline" className={statusClass(selectedRun.status)}>
                        {selectedRun.status}
                      </Badge>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-text-2 mb-1">Attempts</p>
                      <p className="text-sm font-semibold text-foreground">{selectedRun.attempt_count}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-text-2 mb-1">HTTP Status</p>
                      <p className="text-sm font-semibold text-foreground">{selectedRun.http_status ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-text-2 mb-1">Duration</p>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedRun.duration_ms != null ? `${selectedRun.duration_ms} ms` : "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 sm:col-span-2">
                      <p className="text-xs text-text-2 mb-1">Request ID</p>
                      <p className="text-xs font-mono text-foreground break-all">{selectedRun.request_id}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 sm:col-span-2">
                      <p className="text-xs text-text-2 mb-1">Flow ID</p>
                      <p className="text-xs font-mono text-foreground break-all">{selectedRun.flow_id}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-text-2 mb-1">Started</p>
                      <p className="text-sm font-semibold text-foreground">{selectedRun.started_at || "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-text-2 mb-1">Finished</p>
                      <p className="text-sm font-semibold text-foreground">{selectedRun.finished_at || "-"}</p>
                    </div>
                  </div>

                  {selectedRun.status.toLowerCase().includes("success") || selectedRun.status.toLowerCase().includes("succeeded") ? (
                    <p className="text-xs text-emerald-400">Run completed successfully.</p>
                  ) : null}

                  {selectedRun.error_message ? (
                    <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
                      <p className="text-xs text-rose-300 mb-1">Error</p>
                      <p className="text-sm text-rose-200 break-words">{selectedRun.error_message}</p>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs uppercase tracking-wide text-text-2 mb-2">Complete Run Data</p>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-200">
                        {prettyPrint(selectedRun)}
                      </pre>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs uppercase tracking-wide text-text-2 mb-2">Source Payload</p>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-200">
                        {prettyPrint(selectedRun.source_payload)}
                      </pre>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs uppercase tracking-wide text-text-2 mb-2">Mapped Payload</p>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-200">
                        {prettyPrint(selectedRun.mapped_payload)}
                      </pre>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs uppercase tracking-wide text-text-2 mb-2">Target Response</p>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-200">
                        {prettyPrint(selectedRun.target_response)}
                      </pre>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
