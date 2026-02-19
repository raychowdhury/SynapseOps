"""
Shared Pydantic schemas for the CRM Automation service.

These schemas are the single source of truth – validated on the backend
and mirrored as TypeScript interfaces on the frontend.
"""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Platform schemas ─────────────────────────────────────────────

class PlatformOut(BaseModel):
    id: str
    name: str
    label: str
    platform_type: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Field Mapping schemas ────────────────────────────────────────

class FieldMappingCreate(BaseModel):
    """Request body for creating/updating a field mapping."""
    source_platform_id: str = Field(..., min_length=1)
    target_platform_id: str = Field(..., min_length=1)
    source_object: str = Field(..., min_length=1, description="Source entity e.g. Lead")
    target_object: str = Field(..., min_length=1, description="Target entity e.g. Contact")
    source_field: str = Field(..., min_length=1, description="Source field name")
    target_field: str = Field(..., min_length=1, description="Target field name")
    transform_rule: str | None = Field(default="direct", description="Transform: direct | uppercase | lowercase | date_format")


class FieldMappingOut(BaseModel):
    id: str
    source_platform_id: str
    target_platform_id: str
    source_object: str
    target_object: str
    source_field: str
    target_field: str
    transform_rule: str | None = None
    is_active: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Sync State schemas ──────────────────────────────────────────

class SyncStateOut(BaseModel):
    id: str
    platform_id: str
    direction: str
    last_synced_at: datetime | None = None
    records_synced: int
    status: str

    model_config = {"from_attributes": True}


# ── CRM Event schemas ───────────────────────────────────────────

class CrmEventOut(BaseModel):
    id: str
    source_platform_id: str
    target_platform_id: str
    event_type: str
    direction: str
    payload: dict
    status: str
    attempts: int
    processing_error: str | None = None
    synced_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dead Letter schemas ─────────────────────────────────────────

class DeadLetterCrmOut(BaseModel):
    id: str
    event_id: str
    error: str
    failed_at: datetime

    model_config = {"from_attributes": True}


# ── Sync Trigger ─────────────────────────────────────────────────

class SyncTriggerRequest(BaseModel):
    """Request body for manually triggering a CRM sync."""
    source_platform_id: str = Field(..., min_length=1)
    target_platform_id: str = Field(..., min_length=1)
    direction: str = Field(default="outbound", description="inbound | outbound")


class SyncTriggerResponse(BaseModel):
    message: str
    event_id: str


# ── Aggregated stats ─────────────────────────────────────────────

class CrmStatsOut(BaseModel):
    """Aggregated CRM automation statistics."""
    total_platforms: int = 0
    total_mappings: int = 0
    active_mappings: int = 0
    total_events: int = 0
    synced_count: int = 0
    pending_count: int = 0
    failed_count: int = 0
    dead_letter_count: int = 0
    total_records_synced: int = 0
