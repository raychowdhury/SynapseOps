export type UseCase = {
  rank: number;
  name: string;
  demand: string;
  complexity: string;
};

export type Run = {
  id: string;
  status: string;
  attempt_count: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at?: string;
  finished_at?: string;
};

export type DeadLetter = {
  id: string;
  status: string;
  flow_id: string;
  run_id: string;
  error_message: string;
  replay_count: number;
  created_at?: string;
};

export type WebhookResponse = {
  run_id: string;
  status: string;
  flow_id?: string;
};

export type FlowSummary = {
  id: string;
  name: string;
  is_enabled: boolean;
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
};

export class ApiIntegrationError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = "ApiIntegrationError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const isJson = (response.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? ((await response.json()) as ApiErrorEnvelope & T) : null;

  if (!response.ok) {
    const message = data?.error?.message || `Request failed with status ${response.status}`;
    const code = data?.error?.code;
    const requestId = data?.error?.request_id;
    throw new ApiIntegrationError(message, response.status, code, requestId);
  }

  return (data as T) || ({} as T);
}

export async function getUseCases(): Promise<UseCase[]> {
  return request<UseCase[]>("/api/v1/api-integration/use-cases");
}

export async function getFlows(): Promise<FlowSummary[]> {
  return request<FlowSummary[]>("/api/v1/api-integration/flows");
}

export async function sendWebhook(
  payloadOrFlowId: Record<string, unknown> | string | number,
  payloadMaybe?: Record<string, unknown>,
): Promise<WebhookResponse> {
  const payload =
    typeof payloadOrFlowId === "object" && payloadOrFlowId !== null ? payloadOrFlowId : payloadMaybe || {};

  return request<WebhookResponse>("/api/v1/api-integration/webhooks/shopify/orders-create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function runFlow(flowId: string | number): Promise<WebhookResponse> {
  return request<WebhookResponse>(`/api/v1/api-integration/flows/${flowId}/run`, {
    method: "POST",
  });
}

export async function getFlowRuns(flowId: string | number): Promise<Run[]> {
  return request<Run[]>(`/api/v1/api-integration/flows/${flowId}/runs`);
}

export async function getDeadLetters(): Promise<DeadLetter[]> {
  return request<DeadLetter[]>("/api/v1/api-integration/ops/dead-letters");
}

export async function replayDeadLetter(deadLetterId: string): Promise<{ run_id: string; status: string }> {
  return request<{ run_id: string; status: string }>(
    `/api/v1/api-integration/ops/dead-letters/${deadLetterId}/replay`,
    {
      method: "POST",
    },
  );
}
