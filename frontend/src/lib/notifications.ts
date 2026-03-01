/**
 * SaaS Notifications & Workflows — TypeScript types + API client.
 *
 * Types mirror the backend Pydantic schemas (single source of truth).
 * All API calls go through these typed functions.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const API_KEY = import.meta.env.VITE_API_KEY ?? "change-me-in-production";

// ── Shared payload type (mirrors NotificationPayload schema) ────

export interface NotificationPayload {
    title: string;
    body: string;
    priority: "low" | "normal" | "high" | "urgent";
    metadata: Record<string, unknown>;
}

// ── Channel types ────────────────────────────────────────────────

export type Platform = "slack" | "teams" | "salesforce";

export interface Channel {
    id: string;
    platform: Platform;
    name: string;
    webhook_url: string | null;
    api_token: string | null;
    status: "active" | "inactive";
    created_at: string;
    updated_at: string;
}

export interface ChannelCreate {
    platform: Platform;
    name: string;
    webhook_url?: string;
    api_token?: string;
}

// ── Workflow types ───────────────────────────────────────────────

export type ActionType = "notify" | "approve" | "wait" | "condition";
export type TriggerSource = "slack" | "teams" | "salesforce" | "webhook" | "manual";

export interface WorkflowStepCreate {
    step_order: number;
    action_type: ActionType;
    config: Record<string, unknown>;
    channel_id?: string;
}

export interface WorkflowStep {
    id: string;
    step_order: number;
    action_type: ActionType;
    config: Record<string, unknown>;
    channel_id: string | null;
    created_at: string;
}

export interface Workflow {
    id: string;
    name: string;
    description: string | null;
    trigger_event: string;
    trigger_source: TriggerSource;
    status: "draft" | "active" | "paused";
    steps: WorkflowStep[];
    created_at: string;
    updated_at: string;
}

export interface WorkflowCreate {
    name: string;
    description?: string;
    trigger_event: string;
    trigger_source: TriggerSource;
    steps: WorkflowStepCreate[];
}

// ── Notification types ──────────────────────────────────────────

export interface Notification {
    id: string;
    workflow_id: string | null;
    channel_id: string;
    status: "pending" | "sent" | "failed" | "dead_letter";
    payload: NotificationPayload;
    attempts: number;
    processing_error: string | null;
    sent_at: string | null;
    created_at: string;
}

// ── Approval types ──────────────────────────────────────────────

export interface ApprovalRequest {
    id: string;
    notification_id: string;
    approver_email: string;
    status: "pending" | "approved" | "rejected" | "expired";
    responded_at: string | null;
    created_at: string;
}

// ── API client ──────────────────────────────────────────────────

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

// Channels
export const fetchChannels = () => apiFetch<Channel[]>("/notifications/channels");
export const fetchChannel = (id: string) => apiFetch<Channel>(`/notifications/channels/${id}`);
export const createChannel = (data: ChannelCreate) =>
    apiFetch<Channel>("/notifications/channels", { method: "POST", headers: authHeaders(), body: JSON.stringify(data) });
export const deleteChannel = (id: string) =>
    apiFetch<void>(`/notifications/channels/${id}`, { method: "DELETE", headers: authHeaders() });

// Workflows
export const fetchWorkflows = () => apiFetch<Workflow[]>("/notifications/workflows");
export const fetchWorkflow = (id: string) => apiFetch<Workflow>(`/notifications/workflows/${id}`);
export const createWorkflow = (data: WorkflowCreate) =>
    apiFetch<Workflow>("/notifications/workflows", { method: "POST", headers: authHeaders(), body: JSON.stringify(data) });
export const updateWorkflowStatus = (id: string, status: string) =>
    apiFetch<Workflow>(`/notifications/workflows/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
    });
export const triggerWorkflow = (id: string, payload: NotificationPayload, approverEmail?: string) =>
    apiFetch<Notification[]>(`/notifications/workflows/${id}/trigger`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ payload, approver_email: approverEmail }),
    });

// Notifications
export const fetchNotifications = (status?: string) =>
    apiFetch<Notification[]>(`/notifications/list${status ? `?status=${status}` : ""}`);
export const sendNotification = (channelId: string, payload: NotificationPayload, workflowId?: string) =>
    apiFetch<Notification>("/notifications/send", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ channel_id: channelId, workflow_id: workflowId, payload }),
    });

// Approvals
export const fetchApprovals = (status?: string) =>
    apiFetch<ApprovalRequest[]>(`/notifications/approvals${status ? `?status=${status}` : ""}`);
export const respondToApproval = (id: string, decision: "approved" | "rejected") =>
    apiFetch<ApprovalRequest>(`/notifications/approvals/${id}/respond`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ decision }),
    });
