import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Run } from "@/api/apiIntegration";

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
                <TableCell className="max-w-[190px] truncate font-mono text-xs">{run.id}</TableCell>
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
    </Card>
  );
}
