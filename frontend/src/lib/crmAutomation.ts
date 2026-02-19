/**
 * CRM Automation — TypeScript types + API client.
 *
 * Types mirror the backend Pydantic schemas (single source of truth).
 * All API calls go through these typed functions.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ── Platform types ──────────────────────────────────────────────

export interface CrmPlatformType {
    id: string;
    name: string;
    label: string;
    platformType: string;
    status: "connected" | "disconnected" | "error";
    createdAt: string;
}

// ── Field Mapping types ─────────────────────────────────────────

export interface FieldMapping {
    id: string;
    sourcePlatformId: string;
    targetPlatformId: string;
    sourceObject: string;
    targetObject: string;
    sourceField: string;
    targetField: string;
    transformRule: string | null;
    isActive: number;
    createdAt: string;
}

export interface FieldMappingCreatePayload {
    source_platform_id: string;
    target_platform_id: string;
    source_object: string;
    target_object: string;
    source_field: string;
    target_field: string;
    transform_rule?: string;
}

// ── Sync State types ────────────────────────────────────────────

export interface SyncState {
    id: string;
    platformId: string;
    direction: "inbound" | "outbound";
    lastSyncedAt: string | null;
    recordsSynced: number;
    status: "idle" | "syncing" | "error";
}

// ── CRM Event types ─────────────────────────────────────────────

export interface CrmEvent {
    id: string;
    sourcePlatformId: string;
    targetPlatformId: string;
    eventType: string;
    direction: string;
    payload: Record<string, unknown>;
    status: "pending" | "processing" | "synced" | "failed" | "dead_letter";
    attempts: number;
    processingError: string | null;
    syncedAt: string | null;
    createdAt: string;
}

// ── Dead Letter types ───────────────────────────────────────────

export interface DeadLetterCrmEntry {
    id: string;
    eventId: string;
    error: string;
    failedAt: string;
}

// ── Stats types ─────────────────────────────────────────────────

export interface CrmStats {
    totalPlatforms: number;
    totalMappings: number;
    activeMappings: number;
    totalEvents: number;
    syncedCount: number;
    pendingCount: number;
    failedCount: number;
    deadLetterCount: number;
    totalRecordsSynced: number;
}

// ── API client helpers ──────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, init);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `API error ${res.status}`);
    }
    if (res.status === 204) return undefined as unknown as T;
    return res.json();
}

// Backend returns snake_case; we map to camelCase

function mapPlatform(raw: Record<string, unknown>): CrmPlatformType {
    return {
        id: raw.id as string,
        name: raw.name as string,
        label: raw.label as string,
        platformType: raw.platform_type as string,
        status: raw.status as CrmPlatformType["status"],
        createdAt: raw.created_at as string,
    };
}

function mapMapping(raw: Record<string, unknown>): FieldMapping {
    return {
        id: raw.id as string,
        sourcePlatformId: raw.source_platform_id as string,
        targetPlatformId: raw.target_platform_id as string,
        sourceObject: raw.source_object as string,
        targetObject: raw.target_object as string,
        sourceField: raw.source_field as string,
        targetField: raw.target_field as string,
        transformRule: (raw.transform_rule as string) || null,
        isActive: raw.is_active as number,
        createdAt: raw.created_at as string,
    };
}

function mapSyncState(raw: Record<string, unknown>): SyncState {
    return {
        id: raw.id as string,
        platformId: raw.platform_id as string,
        direction: raw.direction as SyncState["direction"],
        lastSyncedAt: (raw.last_synced_at as string) || null,
        recordsSynced: raw.records_synced as number,
        status: raw.status as SyncState["status"],
    };
}

function mapEvent(raw: Record<string, unknown>): CrmEvent {
    return {
        id: raw.id as string,
        sourcePlatformId: raw.source_platform_id as string,
        targetPlatformId: raw.target_platform_id as string,
        eventType: raw.event_type as string,
        direction: raw.direction as string,
        payload: raw.payload as Record<string, unknown>,
        status: raw.status as CrmEvent["status"],
        attempts: raw.attempts as number,
        processingError: (raw.processing_error as string) || null,
        syncedAt: (raw.synced_at as string) || null,
        createdAt: raw.created_at as string,
    };
}

function mapDeadLetter(raw: Record<string, unknown>): DeadLetterCrmEntry {
    return {
        id: raw.id as string,
        eventId: raw.event_id as string,
        error: raw.error as string,
        failedAt: raw.failed_at as string,
    };
}

function mapStats(raw: Record<string, unknown>): CrmStats {
    return {
        totalPlatforms: raw.total_platforms as number,
        totalMappings: raw.total_mappings as number,
        activeMappings: raw.active_mappings as number,
        totalEvents: raw.total_events as number,
        syncedCount: raw.synced_count as number,
        pendingCount: raw.pending_count as number,
        failedCount: raw.failed_count as number,
        deadLetterCount: raw.dead_letter_count as number,
        totalRecordsSynced: raw.total_records_synced as number,
    };
}

// ── API client functions ────────────────────────────────────────

export const fetchPlatforms = async (): Promise<CrmPlatformType[]> => {
    const raw = await apiFetch<Record<string, unknown>[]>("/crm/platforms");
    return raw.map(mapPlatform);
};

export const fetchMappings = async (): Promise<FieldMapping[]> => {
    const raw = await apiFetch<Record<string, unknown>[]>("/crm/mappings");
    return raw.map(mapMapping);
};

export const createMapping = async (
    payload: FieldMappingCreatePayload
): Promise<FieldMapping> => {
    const raw = await apiFetch<Record<string, unknown>>("/crm/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return mapMapping(raw);
};

export const deleteMapping = async (id: string): Promise<void> => {
    await apiFetch<void>(`/crm/mappings/${id}`, { method: "DELETE" });
};

export const fetchSyncStates = async (): Promise<SyncState[]> => {
    const raw = await apiFetch<Record<string, unknown>[]>("/crm/sync-states");
    return raw.map(mapSyncState);
};

export const triggerSync = async (
    sourcePlatformId: string,
    targetPlatformId: string,
    direction = "outbound"
): Promise<{ message: string; eventId: string }> => {
    const raw = await apiFetch<Record<string, unknown>>("/crm/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            source_platform_id: sourcePlatformId,
            target_platform_id: targetPlatformId,
            direction,
        }),
    });
    return { message: raw.message as string, eventId: raw.event_id as string };
};

export const fetchEvents = async (status?: string): Promise<CrmEvent[]> => {
    const raw = await apiFetch<Record<string, unknown>[]>(
        `/crm/events${status ? `?status=${status}` : ""}`
    );
    return raw.map(mapEvent);
};

export const fetchCrmStats = async (): Promise<CrmStats> => {
    const raw = await apiFetch<Record<string, unknown>>("/crm/stats");
    return mapStats(raw);
};

export const fetchDeadLetter = async (): Promise<DeadLetterCrmEntry[]> => {
    const raw = await apiFetch<Record<string, unknown>[]>("/crm/dead-letter");
    return raw.map(mapDeadLetter);
};
