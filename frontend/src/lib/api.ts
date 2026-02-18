const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface ValidationRules {
  min_length?: number | null;
  max_length?: number | null;
  min_value?: number | null;
  max_value?: number | null;
  regex?: string | null;
  unique?: boolean;
  default?: string | number | boolean | null;
}

export interface FieldDef {
  name: string;
  type: string;
  required: boolean;
  validations?: ValidationRules;
}

export interface RelationshipDef {
  resource: string;
  type: "one" | "many";
}

export interface JobInput {
  resource: string;
  fields: FieldDef[];
  operations: string[];
  auth: boolean;
  pagination: boolean;
  relationships?: RelationshipDef[];
}

export interface Artifact {
  id: string;
  type: string;
  content: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  message: string;
  created_at: string;
}

export interface Job {
  id: string;
  status: string;
  input_json: JobInput;
  created_at: string;
  updated_at: string;
  artifacts: Artifact[];
  audit_logs: AuditLog[];
}

export async function createJob(input: JobInput): Promise<Job> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input_json: input }),
  });
  if (!res.ok) throw new Error(`Failed to create job: ${res.status}`);
  return res.json();
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${API_BASE}/jobs`);
  if (!res.ok) throw new Error(`Failed to fetch jobs: ${res.status}`);
  return res.json();
}

export async function fetchJob(id: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/jobs/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch job: ${res.status}`);
  return res.json();
}

export function getExportUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/export`;
}
