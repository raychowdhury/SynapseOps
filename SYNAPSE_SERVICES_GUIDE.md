# SynapseOps Services: Master Guide

This guide provides a comprehensive overview of the 5 core services within the SynapseOps platform, detailing their purpose, data models, and how to utilize them within the web application.

---

## 1. API Integration Service
**Purpose**: The "Swiss Army Knife" of SynapseOps. It allows for the creation of flexible, custom orchestration flows between any two API endpoints with complex data mapping.

### 🏛️ Model
*   **Connector**: Defines a protocol (Webhook, REST, etc.) and base configuration.
*   **Endpoint**: a specific path or event (e.g., `orders/create`) on a connector.
*   **Mapping**: A set of JSON-to-JSON rules, including transformations like `to_float` or `map_array`.
*   **Flow**: The logic that binds a Source Endpoint, a Target Endpoint, a Credential, and a Mapping together.
*   **Run**: An execution record of a Flow, tracking status, duration, and failures.

### 💻 Web App Usage
1.  **Dashboard**: Navigate to `/services/api-integration` to see a summary of active flows and run success rates.
2.  **Flow Builder**: Use the UI to select a Source (e.g., Shopify Webhook) and a Target (e.g., Internal ERP).
3.  **Mapping Editor**: Drag-and-drop or define rules to transform incoming payloads to match the target API's schema.
4.  **Monitoring**: View the "Runs" tab to debug specific execution failures with full request/response logs.

---

## 2. Payment Gateway Service
**Purpose**: Resiliently routes payment events (e.g., from Stripe) to downstream financial systems, ensuring zero data loss and exact-once settlement.

### 🏛️ Model
*   **PaymentEvent**: Raw record of the incoming webhook from the payment provider.
*   **Settlement**: Tracks the status of routing that payment to the internal finance system (`pending`, `settled`, `failed`).
*   **IdempotencyKey**: Prevents duplicate processing of the same transaction.
*   **DeadLetter**: Stores failed settlements after max retries for manual intervention.

### 💻 Web App Usage
1.  **Fintech Dashboard**: Navigate to `/services/payment-gateway` to monitor daily settlement volumes.
2.  **Replay System**: Identify "Failed" or "Dead Letter" settlements and use the "Replay" button to re-trigger the sync once downstream systems are restored.
3.  **Audit Trail**: Click on any settlement to see the original Stripe payload and the corresponding internal finance reference.

---

## 3. CRM Automation Service
**Purpose**: Synchronizes Leads, Contacts, and Deals across multiple CRM platforms (e.g., Salesforce to HubSpot) with bi-directional support.

### 🏛️ Model
*   **CrmPlatform**: Configuration for a specific CRM instance (API keys, workspace IDs).
*   **FieldMapping**: Defines how fields like `Email` or `LeadSource` map between different platforms.
*   **SyncState**: Tracks the "Last Synced" timestamp and record counts to prevent infinite loops.
*   **CrmEvent**: Specific sync tasks queued for the background worker.

### 💻 Web App Usage
1.  **Platform Config**: Add your Salesforce or HubSpot credentials in the "Platforms" tab.
2.  **Mapping Builder**: Navigate to `/services/crm-automation` to create bi-directional mappings between objects (e.g., Salesforce `Lead` → HubSpot `Contact`).
3.  **Manual Sync**: Trigger a full sync for a specific platform pair if you suspect data drift.

---

## 4. Data Aggregation Service
**Purpose**: Aggregates unstructured data from multiple sources (GitHub, Logs, Market Data) into a single, normalized schema for data warehousing.

### 🏛️ Model
*   **DataSource**: Configuration for ingestion (API polling, stream, or bulk upload).
*   **TransformationLogic**: Python-based logic in `logic.py` that merges disparate payloads.
*   **IngestionJob**: A tracked run of the aggregation pipeline.

### 💻 Web App Usage
1.  **Run Health**: Navigate to `/services/data-aggregation` to see ingestion latency and volume metrics.
2.  **Schema Viewer**: Explore the "Canonical Schema" to understand how different data sources are currently being normalized.
3.  **Job Monitoring**: Watch live ingestion progress and identify high-latency sources.

---

## 5. SaaS Notifications Service
**Purpose**: A centralized notification engine that triggers multi-channel alerts (Slack, Email, Teams) based on system events or manual approvals.

### 🏛️ Model
*   **Channel**: configuration for a delivery platform (e.g., a specific Slack Webhook).
*   **Workflow**: A logical trigger (e.g., `integration_failure`) that kicks off a sequence of steps.
*   **WorkflowStep**: A specific action within a workflow (e.g., "Notify Engineering on Slack", "Wait for Lead Approval").

### 💻 Web App Usage
1.  **Channel Setup**: Connect your company's Slack workspaces and Email providers.
2.  **Workflow Dashboard**: Navigate to `/services/notifications` to see which triggers are currently active.
3.  **Approval Inbox**: Use the "Pending Approvals" section to manually verify sensitive actions (e.g., approving a large payment settlement) before the notification flow continues.

---

> [!TIP]
> **Unified Monitoring**: All 5 services use the same standard `worker.py` pattern with exponential backoff. If you see a "Dead Letter" notification in the web app, it always means the system has exhausted its 3 retries and requires manual review.
