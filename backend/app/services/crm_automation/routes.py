"""
FastAPI routes for the CRM Automation service.

Prefix: /crm
Tags:   crm-automation
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.services.crm_automation.models import (
    CrmPlatform,
    FieldMapping,
    SyncState,
    CrmEvent,
    DeadLetterCrm,
)
from app.services.crm_automation.schemas import (
    PlatformOut,
    FieldMappingCreate,
    FieldMappingOut,
    SyncStateOut,
    CrmEventOut,
    DeadLetterCrmOut,
    CrmStatsOut,
    SyncTriggerRequest,
    SyncTriggerResponse,
)
from app.services.crm_automation.worker import enqueue_crm_event

router = APIRouter(prefix="/crm", tags=["crm-automation"])


# ── Platform endpoints ───────────────────────────────────────────

@router.get("/platforms", response_model=list[PlatformOut])
def list_platforms(db: Session = Depends(get_db)):
    """List all configured CRM platforms."""
    return db.query(CrmPlatform).order_by(CrmPlatform.created_at.desc()).all()


# ── Field Mapping endpoints ──────────────────────────────────────

@router.get("/mappings", response_model=list[FieldMappingOut])
def list_mappings(
    source_platform_id: str | None = None,
    target_platform_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List field mappings with optional platform filters."""
    query = db.query(FieldMapping)
    if source_platform_id:
        query = query.filter(FieldMapping.source_platform_id == source_platform_id)
    if target_platform_id:
        query = query.filter(FieldMapping.target_platform_id == target_platform_id)
    return query.order_by(FieldMapping.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/mappings", response_model=FieldMappingOut, status_code=201)
def create_mapping(
    payload: FieldMappingCreate,
    db: Session = Depends(get_db),
):
    """Create a new field mapping."""
    # Validate platforms exist
    src = db.query(CrmPlatform).filter(CrmPlatform.id == payload.source_platform_id).first()
    if not src:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Source platform not found"},
        )
    tgt = db.query(CrmPlatform).filter(CrmPlatform.id == payload.target_platform_id).first()
    if not tgt:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Target platform not found"},
        )

    # Check for duplicate
    existing = (
        db.query(FieldMapping)
        .filter(
            FieldMapping.source_platform_id == payload.source_platform_id,
            FieldMapping.source_field == payload.source_field,
            FieldMapping.target_platform_id == payload.target_platform_id,
            FieldMapping.target_field == payload.target_field,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "duplicate_mapping",
                "message": f"Mapping {payload.source_field} → {payload.target_field} already exists",
            },
        )

    mapping = FieldMapping(
        source_platform_id=payload.source_platform_id,
        target_platform_id=payload.target_platform_id,
        source_object=payload.source_object,
        target_object=payload.target_object,
        source_field=payload.source_field,
        target_field=payload.target_field,
        transform_rule=payload.transform_rule,
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


@router.delete("/mappings/{mapping_id}", status_code=204)
def delete_mapping(mapping_id: str, db: Session = Depends(get_db)):
    """Delete a field mapping by ID."""
    mapping = db.query(FieldMapping).filter(FieldMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Mapping not found"},
        )
    db.delete(mapping)
    db.commit()


# ── Sync State endpoints ────────────────────────────────────────

@router.get("/sync-states", response_model=list[SyncStateOut])
def list_sync_states(db: Session = Depends(get_db)):
    """List sync state for each platform and direction."""
    return db.query(SyncState).all()


# ── Sync Trigger endpoint ───────────────────────────────────────

@router.post("/sync/trigger", response_model=SyncTriggerResponse, status_code=202)
def trigger_sync(
    payload: SyncTriggerRequest,
    db: Session = Depends(get_db),
):
    """Manually trigger a CRM sync between two platforms."""
    src = db.query(CrmPlatform).filter(CrmPlatform.id == payload.source_platform_id).first()
    if not src:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Source platform not found"},
        )
    tgt = db.query(CrmPlatform).filter(CrmPlatform.id == payload.target_platform_id).first()
    if not tgt:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Target platform not found"},
        )

    # Update sync state to "syncing"
    sync_state = (
        db.query(SyncState)
        .filter(SyncState.platform_id == payload.target_platform_id)
        .filter(SyncState.direction == payload.direction)
        .first()
    )
    if sync_state:
        sync_state.status = "syncing"
        db.commit()

    # Create a sync event
    event = CrmEvent(
        source_platform_id=payload.source_platform_id,
        target_platform_id=payload.target_platform_id,
        event_type="manual_sync",
        direction=payload.direction,
        payload={"trigger": "manual", "source": src.name, "target": tgt.name},
        status="pending",
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Enqueue async dispatch
    enqueue_crm_event(event.id)

    return SyncTriggerResponse(
        message=f"Sync triggered: {src.name} → {tgt.name}",
        event_id=event.id,
    )


# ── Event endpoints ──────────────────────────────────────────────

@router.get("/events", response_model=list[CrmEventOut])
def list_events(
    status: str | None = None,
    event_type: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List CRM sync events with optional filters."""
    query = db.query(CrmEvent)
    if status:
        query = query.filter(CrmEvent.status == status)
    if event_type:
        query = query.filter(CrmEvent.event_type == event_type)
    return query.order_by(CrmEvent.created_at.desc()).offset(skip).limit(limit).all()


# ── Stats endpoint ───────────────────────────────────────────────

@router.get("/stats", response_model=CrmStatsOut)
def get_crm_stats(db: Session = Depends(get_db)):
    """Return aggregated CRM automation statistics."""
    total_platforms = db.query(func.count(CrmPlatform.id)).scalar() or 0
    total_mappings = db.query(func.count(FieldMapping.id)).scalar() or 0
    active_mappings = (
        db.query(func.count(FieldMapping.id))
        .filter(FieldMapping.is_active == 1)
        .scalar() or 0
    )
    total_events = db.query(func.count(CrmEvent.id)).scalar() or 0
    synced_count = (
        db.query(func.count(CrmEvent.id))
        .filter(CrmEvent.status == "synced")
        .scalar() or 0
    )
    pending_count = (
        db.query(func.count(CrmEvent.id))
        .filter(CrmEvent.status == "pending")
        .scalar() or 0
    )
    failed_count = (
        db.query(func.count(CrmEvent.id))
        .filter(CrmEvent.status == "failed")
        .scalar() or 0
    )
    dead_letter_count = db.query(func.count(DeadLetterCrm.id)).scalar() or 0
    total_records_synced = db.query(func.coalesce(func.sum(SyncState.records_synced), 0)).scalar()

    return CrmStatsOut(
        total_platforms=total_platforms,
        total_mappings=total_mappings,
        active_mappings=active_mappings,
        total_events=total_events,
        synced_count=synced_count,
        pending_count=pending_count,
        failed_count=failed_count,
        dead_letter_count=dead_letter_count,
        total_records_synced=total_records_synced,
    )


# ── Dead Letter endpoints ───────────────────────────────────────

@router.get("/dead-letter", response_model=list[DeadLetterCrmOut])
def list_dead_letter(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List dead-letter CRM entries."""
    return (
        db.query(DeadLetterCrm)
        .order_by(DeadLetterCrm.failed_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
