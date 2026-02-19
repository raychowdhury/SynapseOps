"""
Pydantic schemas for the Data Aggregation service.
Single source of truth — mirrored as TypeScript interfaces on the frontend.
"""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Data Source ──────────────────────────────────────────────────

class DataSourceOut(BaseModel):
    id: str
    name: str
    label: str
    source_type: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Ingestion Run ────────────────────────────────────────────────

class IngestionRunOut(BaseModel):
    id: str
    source_id: str
    status: str
    records_ingested: int
    records_upserted: int
    latency_ms: float
    error_message: str | None = None
    started_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Warehouse Record ─────────────────────────────────────────────

class WarehouseRecordOut(BaseModel):
    id: str
    source_type: str
    entity_type: str
    external_id: str
    canonical_data: dict
    ingested_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Aggregation Event ────────────────────────────────────────────

class AggEventOut(BaseModel):
    id: str
    source_id: str
    event_type: str
    status: str
    payload: dict
    attempts: int
    processing_error: str | None = None
    completed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dead Letter ──────────────────────────────────────────────────

class DeadLetterAggOut(BaseModel):
    id: str
    event_id: str
    error: str
    failed_at: datetime

    model_config = {"from_attributes": True}


# ── Ingestion Trigger ────────────────────────────────────────────

class IngestionTriggerRequest(BaseModel):
    source_id: str = Field(..., min_length=1)


class IngestionTriggerResponse(BaseModel):
    message: str
    run_id: str
    event_id: str


# ── Aggregated Stats ─────────────────────────────────────────────

class AggStatsOut(BaseModel):
    total_sources: int = 0
    active_sources: int = 0
    total_runs: int = 0
    completed_runs: int = 0
    failed_runs: int = 0
    total_records_ingested: int = 0
    total_records_upserted: int = 0
    total_warehouse_records: int = 0
    avg_latency_ms: float = 0.0
    total_events: int = 0
    pending_events: int = 0
    dead_letter_count: int = 0
