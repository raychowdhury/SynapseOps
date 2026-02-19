"""
FastAPI routes for the Data Aggregation service.

Prefix: /aggregation
Tags:   data-aggregation
"""

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.services.data_aggregation.models import (
    DataSource,
    IngestionRun,
    WarehouseRecord,
    AggEvent,
    DeadLetterAgg,
)
from app.services.data_aggregation.schemas import (
    DataSourceOut,
    IngestionRunOut,
    WarehouseRecordOut,
    AggEventOut,
    DeadLetterAggOut,
    AggStatsOut,
    IngestionTriggerRequest,
    IngestionTriggerResponse,
)
from app.services.data_aggregation.worker import enqueue_agg_event

router = APIRouter(prefix="/aggregation", tags=["data-aggregation"])


# ── Source endpoints ─────────────────────────────────────────────

@router.get("/sources", response_model=list[DataSourceOut])
def list_sources(db: Session = Depends(get_db)):
    """List all configured data sources."""
    return db.query(DataSource).order_by(DataSource.created_at.desc()).all()


# ── Ingestion trigger ────────────────────────────────────────────

@router.post("/ingest/trigger", response_model=IngestionTriggerResponse, status_code=202)
def trigger_ingestion(
    payload: IngestionTriggerRequest,
    db: Session = Depends(get_db),
):
    """Trigger an ingestion run for a specific data source."""
    source = db.query(DataSource).filter(DataSource.id == payload.source_id).first()
    if not source:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Data source not found"},
        )

    # Create an ingestion run record
    run = IngestionRun(
        source_id=source.id,
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    db.flush()

    # Create an aggregation event
    event = AggEvent(
        source_id=source.id,
        event_type="ingestion",
        payload={"trigger": "manual", "source": source.name, "run_id": run.id},
        status="pending",
    )
    db.add(event)
    db.commit()
    db.refresh(run)
    db.refresh(event)

    # Enqueue async dispatch
    enqueue_agg_event(event.id)

    return IngestionTriggerResponse(
        message=f"Ingestion triggered for {source.name}",
        run_id=run.id,
        event_id=event.id,
    )


# ── Run endpoints ────────────────────────────────────────────────

@router.get("/runs", response_model=list[IngestionRunOut])
def list_runs(
    source_id: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List ingestion runs with optional filters."""
    query = db.query(IngestionRun)
    if source_id:
        query = query.filter(IngestionRun.source_id == source_id)
    if status:
        query = query.filter(IngestionRun.status == status)
    return query.order_by(IngestionRun.started_at.desc()).offset(skip).limit(limit).all()


# ── Warehouse endpoints ─────────────────────────────────────────

@router.get("/warehouse", response_model=list[WarehouseRecordOut])
def list_warehouse(
    source_type: str | None = None,
    entity_type: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List canonical warehouse records with optional filters."""
    query = db.query(WarehouseRecord)
    if source_type:
        query = query.filter(WarehouseRecord.source_type == source_type)
    if entity_type:
        query = query.filter(WarehouseRecord.entity_type == entity_type)
    return query.order_by(WarehouseRecord.ingested_at.desc()).offset(skip).limit(limit).all()


# ── Event endpoints ──────────────────────────────────────────────

@router.get("/events", response_model=list[AggEventOut])
def list_events(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List aggregation events with optional status filter."""
    query = db.query(AggEvent)
    if status:
        query = query.filter(AggEvent.status == status)
    return query.order_by(AggEvent.created_at.desc()).offset(skip).limit(limit).all()


# ── Stats endpoint ───────────────────────────────────────────────

@router.get("/stats", response_model=AggStatsOut)
def get_agg_stats(db: Session = Depends(get_db)):
    """Return aggregated pipeline statistics."""
    total_sources = db.query(func.count(DataSource.id)).scalar() or 0
    active_sources = (
        db.query(func.count(DataSource.id))
        .filter(DataSource.status == "active")
        .scalar() or 0
    )
    total_runs = db.query(func.count(IngestionRun.id)).scalar() or 0
    completed_runs = (
        db.query(func.count(IngestionRun.id))
        .filter(IngestionRun.status == "completed")
        .scalar() or 0
    )
    failed_runs = (
        db.query(func.count(IngestionRun.id))
        .filter(IngestionRun.status == "failed")
        .scalar() or 0
    )
    total_records_ingested = (
        db.query(func.coalesce(func.sum(IngestionRun.records_ingested), 0)).scalar()
    )
    total_records_upserted = (
        db.query(func.coalesce(func.sum(IngestionRun.records_upserted), 0)).scalar()
    )
    total_warehouse_records = db.query(func.count(WarehouseRecord.id)).scalar() or 0
    avg_latency = (
        db.query(func.coalesce(func.avg(IngestionRun.latency_ms), 0.0))
        .filter(IngestionRun.status == "completed")
        .scalar()
    )
    total_events = db.query(func.count(AggEvent.id)).scalar() or 0
    pending_events = (
        db.query(func.count(AggEvent.id))
        .filter(AggEvent.status == "pending")
        .scalar() or 0
    )
    dead_letter_count = db.query(func.count(DeadLetterAgg.id)).scalar() or 0

    return AggStatsOut(
        total_sources=total_sources,
        active_sources=active_sources,
        total_runs=total_runs,
        completed_runs=completed_runs,
        failed_runs=failed_runs,
        total_records_ingested=total_records_ingested,
        total_records_upserted=total_records_upserted,
        total_warehouse_records=total_warehouse_records,
        avg_latency_ms=round(float(avg_latency), 1),
        total_events=total_events,
        pending_events=pending_events,
        dead_letter_count=dead_letter_count,
    )


# ── Dead Letter endpoints ───────────────────────────────────────

@router.get("/dead-letter", response_model=list[DeadLetterAggOut])
def list_dead_letter(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List dead-letter aggregation entries."""
    return (
        db.query(DeadLetterAgg)
        .order_by(DeadLetterAgg.failed_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
