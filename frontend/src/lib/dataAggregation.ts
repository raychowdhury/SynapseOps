/**
 * TypeScript types and API client for the Data Aggregation service.
 * Mirrors backend schemas with snake_case → camelCase mapping.
 */

const API_BASE = "http://localhost:8000/aggregation";

// ── Types ───────────────────────────────────────────────────────

export interface DataSource {
    id: string;
    name: string;
    label: string;
    sourceType: string;
    status: string;
    createdAt: string;
}

export interface IngestionRun {
    id: string;
    sourceId: string;
    status: string;
    recordsIngested: number;
    recordsUpserted: number;
    latencyMs: number;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
}

export interface WarehouseRecord {
    id: string;
    sourceType: string;
    entityType: string;
    externalId: string;
    canonicalData: Record<string, unknown>;
    ingestedAt: string;
    updatedAt: string;
}

export interface AggEvent {
    id: string;
    sourceId: string;
    eventType: string;
    status: string;
    payload: Record<string, unknown>;
    attempts: number;
    processingError: string | null;
    completedAt: string | null;
    createdAt: string;
}

export interface DeadLetterAgg {
    id: string;
    eventId: string;
    error: string;
    failedAt: string;
}

export interface AggStats {
    totalSources: number;
    activeSources: number;
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    totalRecordsIngested: number;
    totalRecordsUpserted: number;
    totalWarehouseRecords: number;
    avgLatencyMs: number;
    totalEvents: number;
    pendingEvents: number;
    deadLetterCount: number;
}

export interface IngestionTriggerResponse {
    message: string;
    runId: string;
    eventId: string;
}

// ── Mappers ─────────────────────────────────────────────────────

function mapSource(s: Record<string, unknown>): DataSource {
    return {
        id: s.id as string,
        name: s.name as string,
        label: s.label as string,
        sourceType: s.source_type as string,
        status: s.status as string,
        createdAt: s.created_at as string,
    };
}

function mapRun(r: Record<string, unknown>): IngestionRun {
    return {
        id: r.id as string,
        sourceId: r.source_id as string,
        status: r.status as string,
        recordsIngested: r.records_ingested as number,
        recordsUpserted: r.records_upserted as number,
        latencyMs: r.latency_ms as number,
        errorMessage: r.error_message as string | null,
        startedAt: r.started_at as string,
        completedAt: r.completed_at as string | null,
    };
}

function mapWarehouseRecord(w: Record<string, unknown>): WarehouseRecord {
    return {
        id: w.id as string,
        sourceType: w.source_type as string,
        entityType: w.entity_type as string,
        externalId: w.external_id as string,
        canonicalData: w.canonical_data as Record<string, unknown>,
        ingestedAt: w.ingested_at as string,
        updatedAt: w.updated_at as string,
    };
}

function mapEvent(e: Record<string, unknown>): AggEvent {
    return {
        id: e.id as string,
        sourceId: e.source_id as string,
        eventType: e.event_type as string,
        status: e.status as string,
        payload: e.payload as Record<string, unknown>,
        attempts: e.attempts as number,
        processingError: e.processing_error as string | null,
        completedAt: e.completed_at as string | null,
        createdAt: e.created_at as string,
    };
}

function mapDeadLetter(d: Record<string, unknown>): DeadLetterAgg {
    return {
        id: d.id as string,
        eventId: d.event_id as string,
        error: d.error as string,
        failedAt: d.failed_at as string,
    };
}

function mapStats(s: Record<string, unknown>): AggStats {
    return {
        totalSources: s.total_sources as number,
        activeSources: s.active_sources as number,
        totalRuns: s.total_runs as number,
        completedRuns: s.completed_runs as number,
        failedRuns: s.failed_runs as number,
        totalRecordsIngested: s.total_records_ingested as number,
        totalRecordsUpserted: s.total_records_upserted as number,
        totalWarehouseRecords: s.total_warehouse_records as number,
        avgLatencyMs: s.avg_latency_ms as number,
        totalEvents: s.total_events as number,
        pendingEvents: s.pending_events as number,
        deadLetterCount: s.dead_letter_count as number,
    };
}

function mapTriggerResponse(r: Record<string, unknown>): IngestionTriggerResponse {
    return {
        message: r.message as string,
        runId: r.run_id as string,
        eventId: r.event_id as string,
    };
}

// ── API Client ──────────────────────────────────────────────────

export async function fetchSources(): Promise<DataSource[]> {
    const res = await fetch(`${API_BASE}/sources`);
    if (!res.ok) throw new Error("Failed to fetch data sources");
    const data = await res.json();
    return data.map(mapSource);
}

export async function fetchRuns(sourceId?: string): Promise<IngestionRun[]> {
    const params = sourceId ? `?source_id=${sourceId}` : "";
    const res = await fetch(`${API_BASE}/runs${params}`);
    if (!res.ok) throw new Error("Failed to fetch ingestion runs");
    const data = await res.json();
    return data.map(mapRun);
}

export async function fetchWarehouse(
    sourceType?: string,
    entityType?: string
): Promise<WarehouseRecord[]> {
    const params = new URLSearchParams();
    if (sourceType) params.set("source_type", sourceType);
    if (entityType) params.set("entity_type", entityType);
    const qs = params.toString() ? `?${params}` : "";
    const res = await fetch(`${API_BASE}/warehouse${qs}`);
    if (!res.ok) throw new Error("Failed to fetch warehouse records");
    const data = await res.json();
    return data.map(mapWarehouseRecord);
}

export async function fetchEvents(status?: string): Promise<AggEvent[]> {
    const params = status ? `?status=${status}` : "";
    const res = await fetch(`${API_BASE}/events${params}`);
    if (!res.ok) throw new Error("Failed to fetch aggregation events");
    const data = await res.json();
    return data.map(mapEvent);
}

export async function fetchStats(): Promise<AggStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error("Failed to fetch aggregation stats");
    const data = await res.json();
    return mapStats(data);
}

export async function fetchDeadLetter(): Promise<DeadLetterAgg[]> {
    const res = await fetch(`${API_BASE}/dead-letter`);
    if (!res.ok) throw new Error("Failed to fetch dead letter");
    const data = await res.json();
    return data.map(mapDeadLetter);
}

export async function triggerIngestion(
    sourceId: string
): Promise<IngestionTriggerResponse> {
    const res = await fetch(`${API_BASE}/ingest/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: sourceId }),
    });
    if (!res.ok) throw new Error("Failed to trigger ingestion");
    const data = await res.json();
    return mapTriggerResponse(data);
}
