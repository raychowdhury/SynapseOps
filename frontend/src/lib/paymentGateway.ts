/**
 * Payment Gateway Integration — TypeScript types + API client.
 *
 * Types mirror the backend Pydantic schemas (single source of truth).
 * All API calls go through these typed functions.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const API_KEY = import.meta.env.VITE_API_KEY ?? "change-me-in-production";

// ── Stripe Event types ──────────────────────────────────────────

export interface PaymentEvent {
    id: string;
    stripeEventId: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: "received" | "processing" | "processed" | "failed";
    idempotencyKey: string;
    createdAt: string;
}

// ── Settlement types ────────────────────────────────────────────

export interface Settlement {
    id: string;
    eventId: string;
    amountCents: number;
    currency: string;
    destination: string;
    financeRef: string | null;
    status: "pending" | "processing" | "settled" | "failed" | "dead_letter";
    attempts: number;
    processingError: string | null;
    settledAt: string | null;
    createdAt: string;
}

// ── Dead Letter types ───────────────────────────────────────────

export interface DeadLetterEntry {
    id: string;
    settlementId: string;
    error: string;
    failedAt: string;
}

// ── Stats types ─────────────────────────────────────────────────

export interface GatewayStats {
    totalEvents: number;
    totalSettlements: number;
    settledCount: number;
    settledAmountCents: number;
    pendingCount: number;
    pendingAmountCents: number;
    failedCount: number;
    deadLetterCount: number;
    replayAttempts: number;
    replaySuccesses: number;
    replaySuccessRate: number;
    circuitBreakerStatus: "closed" | "open" | "half_open";
}

// ── API client helpers ──────────────────────────────────────────

function authHeaders(): Record<string, string> {
    return { "Content-Type": "application/json", "x-api-key": API_KEY };
}

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
function mapEvent(raw: Record<string, unknown>): PaymentEvent {
    return {
        id: raw.id as string,
        stripeEventId: raw.stripe_event_id as string,
        eventType: raw.event_type as string,
        payload: raw.payload as Record<string, unknown>,
        status: raw.status as PaymentEvent["status"],
        idempotencyKey: raw.idempotency_key as string,
        createdAt: raw.created_at as string,
    };
}

function mapSettlement(raw: Record<string, unknown>): Settlement {
    return {
        id: raw.id as string,
        eventId: raw.event_id as string,
        amountCents: raw.amount_cents as number,
        currency: raw.currency as string,
        destination: raw.destination as string,
        financeRef: (raw.finance_ref as string) || null,
        status: raw.status as Settlement["status"],
        attempts: raw.attempts as number,
        processingError: (raw.processing_error as string) || null,
        settledAt: (raw.settled_at as string) || null,
        createdAt: raw.created_at as string,
    };
}

function mapDeadLetter(raw: Record<string, unknown>): DeadLetterEntry {
    return {
        id: raw.id as string,
        settlementId: raw.settlement_id as string,
        error: raw.error as string,
        failedAt: raw.failed_at as string,
    };
}

function mapStats(raw: Record<string, unknown>): GatewayStats {
    return {
        totalEvents: raw.total_events as number,
        totalSettlements: raw.total_settlements as number,
        settledCount: raw.settled_count as number,
        settledAmountCents: raw.settled_amount_cents as number,
        pendingCount: raw.pending_count as number,
        pendingAmountCents: raw.pending_amount_cents as number,
        failedCount: raw.failed_count as number,
        deadLetterCount: raw.dead_letter_count as number,
        replayAttempts: raw.replay_attempts as number,
        replaySuccesses: raw.replay_successes as number,
        replaySuccessRate: raw.replay_success_rate as number,
        circuitBreakerStatus: raw.circuit_breaker_status as GatewayStats["circuitBreakerStatus"],
    };
}

// ── API client functions ────────────────────────────────────────

export const fetchEvents = async (status?: string): Promise<PaymentEvent[]> => {
    const raw = await apiFetch<Record<string, unknown>[]>(
        `/payments/events${status ? `?status=${status}` : ""}`
    );
    return raw.map(mapEvent);
};

export const fetchSettlements = async (status?: string): Promise<Settlement[]> => {
    const raw = await apiFetch<Record<string, unknown>[]>(
        `/payments/settlements${status ? `?status=${status}` : ""}`
    );
    return raw.map(mapSettlement);
};

export const fetchStats = async (): Promise<GatewayStats> => {
    const raw = await apiFetch<Record<string, unknown>>("/payments/settlements/stats");
    return mapStats(raw);
};

export const replaySettlement = async (id: string, force = false): Promise<Settlement> => {
    const raw = await apiFetch<Record<string, unknown>>(
        `/payments/settlements/${id}/replay`,
        {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ force }),
        }
    );
    return mapSettlement(raw);
};

export const fetchDeadLetter = async (): Promise<DeadLetterEntry[]> => {
    const raw = await apiFetch<Record<string, unknown>[]>("/payments/dead-letter");
    return raw.map(mapDeadLetter);
};
