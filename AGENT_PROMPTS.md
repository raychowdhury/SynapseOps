# SynapseOps Multi-Agent Prompting System

This document contains the Master Prompt and three specialized service prompts to guide any agent in building the remaining features of SynapseOps with high consistency and adherence to project rules.

---

## 1. Master Prompt: Project Genesis & Rules

**Role**: You are a Lead Software Engineer at SynapseOps. Your goal is to build a resilient API orchestration platform.

**Project Core Architecture**:
- **Backend**: FastAPI (Python) located in [/backend/app/services](file:///home/tomal/scratch/SynapseOps/backend/app/services).
- **Frontend**: Vite + React + Tailwind + Lucide in [/frontend/src](file:///home/tomal/scratch/SynapseOps/frontend/src).
- **Shared Patterns**: Every service must have `models.py`, `schemas.py`, `routes.py`, `seed.py`, and `worker.py` if async.

### Mandatory Smartness Rules
- **Conventions**: Use `snake_case` for Python and `camelCase` for TypeScript. Consistent route naming (pluralized).
- **Shared Schema**: Define extraction JSON schema once; reuse for backend validation and frontend types.
- **Performance**:
    - Cache extraction by `file_sha256` per user.
    - Cap PDF rendering to 3 pages.
    - Always use async; never block the request thread on heavy tasks (OCR/LLM).
    - Only invoke LLM if regex confidence is low or fields are missing after OCR.
- **Deterministic Errors**: Standard envelope: `{"error": {"code": "...", "message": "...", "details": {...}}}`.
- **Worker Policy**: Max 3 retries with exponential backoff. Failed jobs must be marked and stored in Dead Letter behavior.
- **Security**:
    - Rate limit all auth and upload endpoints.
    - MIME allowlist and strict `Content-Length`.
    - Signed URLs for private bucket access (TTL 120s).
    - CSRF protection (SameSite Strict + CSRF tokens).

### Agent Spawning Protocol (Optional)
If parallelization is needed, spawn dedicated sub-agents:
- **UI Agent**: Handles `/pages` and `/components`. Focus: Apple/fintech style.
- **API Agent**: Handles FastAPI routes, auth, validation, and RBAC.
- **Worker Agent**: Handles pipeline (OCR -> Parse -> Classify -> Persist).
- **DB Agent**: Handles SQLAlchemy models, migrations, and seeds.
- **Security Agent**: Handles hardening, signed URLs, and rate limiting.

*Constraint*: Each agent outputs ONLY code diffs (no yapping).

---

## 2. Service Prompt: Payment Gateway Integration

**Objective**: Implement the Payment Gateway service to route events between Stripe and Finance systems.

**Specific Tasks**:
- **Connector Implementation**: Build a Stripe webhook ingestor and an outbound Finance API client in `connectors.py`.
- **Flow Configuration**: Define a "Payment to Finance" flow in `seed.py`.
- **Resilience**: Implement strict idempotency keys to prevent duplicate payments. Use circuit breakers for downstream Finance APIs.
- **UI**: build a Fintech-style dashboard in `/frontend/src/pages/services/PaymentGatewayPage.tsx` showing settlement status and replay success rates.

---

## 3. Service Prompt: CRM Automation

**Objective**: Orchestrate lead and contact movements across different CRM platforms (Salesforce, HubSpot).

**Specific Tasks**:
- **Dynamic Mapping**: Create a mapping engine that supports bi-directional sync (e.g., Salesforce `Lead` -> HubSpot `Contact`).
- **State Management**: Implement a state tracker to recognize "Last Synced" timestamps to avoid infinite loops.
- **Worker logic**: Use the `worker.py` pipeline to batch process CRM events during high-volume windows.
- **UI**: Create a "Mapping Builder" in `/frontend/src/pages/services/CrmAutomationPage.tsx` where users can drag-and-drop source-to-target fields.

---

## 4. Service Prompt: Data Aggregation

**Objective**: Aggregate unstructured or multi-source API data into a canonical format for warehousing.

**Specific Tasks**:
- **Ingestion Pipeline**: Support multi-source ingestion (e.g., pulling from GitHub, Stripe, and internal logs simultaneously).
- **Normalization**: Build a heavy-duty transformer in `services/data_aggregation/logic.py` that merges payloads into a single JSON schema.
- **Warehouse Target**: Implement a "Data Warehouse" connector that handles bulk `UPSERT` operations into the target DB.
- **UI**: A "Run Health" dashboard in `/frontend/src/pages/services/DataAggregationPage.tsx` showing latency and volume metrics.
