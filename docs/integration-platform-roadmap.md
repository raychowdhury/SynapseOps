# SynapseOps Integration Platform Plan

## Product Goal
SynapseOps helps teams design, deploy, and operate integrations across APIs, data systems, cloud/on-prem, and enterprise tools from one platform.

## Core MVP Outcome
A user can describe an integration, generate a deployable blueprint, review/edit it, run it, and monitor health.

## Backend Scope (V1)
- Integration project management
- Connector catalog (API, DB, webhook, queue)
- Pipeline blueprint generation and validation
- Job execution orchestration
- Run logs, metrics, and failure diagnostics
- Artifact export (OpenAPI/spec/code/config)

## API Contract (Phase 1)
### Projects
- `POST /projects`
  - Creates an integration project
- `GET /projects`
  - Lists projects
- `GET /projects/{project_id}`
  - Returns project detail

### Blueprints
- `POST /projects/{project_id}/blueprints`
  - Input: source/target systems + mapping intent
  - Output: draft blueprint + status `DRAFT`
- `PATCH /blueprints/{blueprint_id}`
  - User edits mappings/rules
- `POST /blueprints/{blueprint_id}/validate`
  - Returns validation issues/warnings
- `POST /blueprints/{blueprint_id}/approve`
  - Locks blueprint as deployable

### Runs
- `POST /blueprints/{blueprint_id}/runs`
  - Starts execution
- `GET /runs/{run_id}`
  - Status (`QUEUED|RUNNING|FAILED|SUCCEEDED`)
- `GET /runs/{run_id}/logs`
  - Step logs/errors
- `GET /runs/{run_id}/metrics`
  - Throughput, latency, error rate

### Artifacts
- `GET /blueprints/{blueprint_id}/export`
  - Downloads generated artifacts (zip)

## Data Model (Minimal)
- `projects`
- `connectors`
- `blueprints`
- `blueprint_revisions`
- `runs`
- `run_events`
- `artifacts`
- `audit_logs`

## Frontend Scope (V1)
- `/dashboard` project overview + run health
- `/services` capability pages (already present)
- `/projects` create/list/manage projects
- `/projects/:id/builder` visual mapping + validation
- `/runs/:id` live run detail/logs

## Roadmap
1. Phase 1: Project + Blueprint lifecycle
   - Create/list projects, generate/edit/approve blueprint, export artifacts
2. Phase 2: Connectors + Secrets
   - Connector setup, credential vault integration, connection tests
3. Phase 3: Execution + Observability
   - Trigger runs, retry policies, logs, metrics, alerts
4. Phase 4: Governance + Scale
   - RBAC, policy controls, audit reporting, multi-tenant limits

## Immediate Next 3 Tasks
1. Add backend `projects` + `blueprints` models/schemas/routes (keep existing `/jobs` until migration is complete).
2. Add frontend `/projects` and `/projects/:id/builder` pages wired to new endpoints.
3. Add `runs` endpoints and a minimal run timeline UI on `/runs/:id`.
