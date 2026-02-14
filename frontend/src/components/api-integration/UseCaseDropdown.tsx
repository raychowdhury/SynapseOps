import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UseCase } from "@/api/apiIntegration";

type UseCaseDropdownProps = {
  useCases: UseCase[];
  selectedUseCaseName: string;
  onSelect: (name: string) => void;
  loading: boolean;
  error: string | null;
};

function demandBadgeClass(demand: string): string {
  if (demand.toLowerCase().includes("extremely")) return "bg-emerald-500/15 text-emerald-400 border-emerald-400/40";
  if (demand.toLowerCase().includes("very")) return "bg-sky-500/15 text-sky-400 border-sky-400/40";
  return "bg-zinc-500/15 text-zinc-300 border-zinc-400/40";
}

function complexityBadgeClass(complexity: string): string {
  const lower = complexity.toLowerCase();
  if (lower.includes("high")) return "bg-rose-500/15 text-rose-400 border-rose-400/40";
  if (lower.includes("medium")) return "bg-amber-500/15 text-amber-300 border-amber-400/40";
  return "bg-emerald-500/15 text-emerald-400 border-emerald-400/40";
}

export default function UseCaseDropdown({
  useCases,
  selectedUseCaseName,
  onSelect,
  loading,
  error,
}: UseCaseDropdownProps) {
  const selected = useCases.find((item) => item.name === selectedUseCaseName);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Integration Type</h2>
        {loading ? <span className="text-xs text-muted-foreground">Loading...</span> : null}
      </div>

      <Select value={selectedUseCaseName} onValueChange={onSelect} disabled={loading || useCases.length === 0}>
        <SelectTrigger className="h-12">
          <SelectValue placeholder="Select a use case" />
        </SelectTrigger>
        <SelectContent>
          {useCases.map((item) => (
            <SelectItem key={item.name} value={item.name}>
              <div className="flex w-full min-w-[380px] items-center justify-between gap-3 pr-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    #{item.rank} {item.name}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className={demandBadgeClass(item.demand)}>
                    {item.demand}
                  </Badge>
                  <Badge variant="outline" className={complexityBadgeClass(item.complexity)}>
                    {item.complexity}
                  </Badge>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected ? (
        <div className="rounded-lg border border-border/80 bg-card/70 p-4">
          <p className="text-sm font-medium">
            #{selected.rank} {selected.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={demandBadgeClass(selected.demand)}>
              Demand: {selected.demand}
            </Badge>
            <Badge variant="outline" className={complexityBadgeClass(selected.complexity)}>
              Complexity: {selected.complexity}
            </Badge>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
