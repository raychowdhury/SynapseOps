"""
Async ingestion worker for the Data Aggregation service.

Pipeline: Pull from source → Normalize → Deduplicate → Upsert to warehouse.

Implements exponential backoff (2^attempt seconds, max 3 retries) and
dead-letter behavior on final failure.
"""

import logging
import threading
import time
from datetime import datetime, timezone

from app.database import SessionLocal
from app.services.data_aggregation.models import (
    AggEvent,
    DeadLetterAgg,
    DataSource,
    IngestionRun,
    WarehouseRecord,
)
from app.services.data_aggregation.connectors import get_source_connector, WarehouseConnector
from app.services.data_aggregation.logic import normalize_batch, merge_and_deduplicate
from app.services.data_aggregation.config import AGG_MAX_RETRIES, AGG_BACKOFF_BASE

logger = logging.getLogger(__name__)


def _dispatch_single(db, event: AggEvent) -> None:
    """Process a single aggregation event through the pipeline."""
    source = db.query(DataSource).filter(DataSource.id == event.source_id).first()
    if not source:
        event.status = "dead_letter"
        event.processing_error = f"Source {event.source_id} not found"
        db.commit()
        dl = DeadLetterAgg(event_id=event.id, error=event.processing_error)
        db.add(dl)
        db.commit()
        return

    event.attempts += 1

    # Step 1: Pull from source
    connector = get_source_connector(source.source_type)
    if source.source_type == "github":
        result = connector.pull_events()
    elif source.source_type == "stripe":
        result = connector.pull_transactions()
    else:
        result = connector.pull_logs()

    if not result.success:
        event.processing_error = result.error_message
        if event.attempts >= AGG_MAX_RETRIES:
            event.status = "dead_letter"
            db.commit()
            dl = DeadLetterAgg(
                event_id=event.id,
                error=result.error_message or "Unknown error after max retries",
            )
            db.add(dl)
            db.commit()
            logger.warning("Agg event %s dead-lettered after %d attempts", event.id, event.attempts)
        else:
            event.status = "failed"
            db.commit()
            delay = AGG_BACKOFF_BASE ** event.attempts
            logger.info("Agg event %s failed (attempt %d), retrying in %.1fs", event.id, event.attempts, delay)
            time.sleep(delay)
            _dispatch_single(db, event)
        return

    # Step 2: Normalize
    normalized = normalize_batch(source.source_type, result.records)

    # Step 3: Deduplicate
    deduped = merge_and_deduplicate(normalized)

    # Step 4: Upsert to local warehouse table
    upserted = 0
    for rec in deduped:
        existing = (
            db.query(WarehouseRecord)
            .filter(
                WarehouseRecord.source_type == rec["source"],
                WarehouseRecord.entity_type == rec["entity_type"],
                WarehouseRecord.external_id == rec["external_id"],
            )
            .first()
        )
        if existing:
            existing.canonical_data = rec
            existing.updated_at = datetime.now(timezone.utc)
        else:
            wr = WarehouseRecord(
                source_type=rec["source"],
                entity_type=rec["entity_type"],
                external_id=rec["external_id"],
                canonical_data=rec,
            )
            db.add(wr)
        upserted += 1

    # Step 5: Simulate external warehouse bulk upsert
    wh_result = WarehouseConnector.bulk_upsert(deduped)
    if not wh_result.success:
        event.processing_error = wh_result.error_message
        if event.attempts >= AGG_MAX_RETRIES:
            event.status = "dead_letter"
            db.commit()
            dl = DeadLetterAgg(event_id=event.id, error=wh_result.error_message or "Warehouse upsert failed")
            db.add(dl)
            db.commit()
        else:
            event.status = "failed"
            db.commit()
            delay = AGG_BACKOFF_BASE ** event.attempts
            time.sleep(delay)
            _dispatch_single(db, event)
        return

    # Success
    event.status = "completed"
    event.completed_at = datetime.now(timezone.utc)
    event.processing_error = None

    # Update the associated run payload with results
    event.payload = {
        **event.payload,
        "records_pulled": len(result.records),
        "records_normalized": len(normalized),
        "records_upserted": upserted,
    }
    db.commit()

    logger.info("Agg event %s completed: %d records upserted", event.id, upserted)


def process_pending_events() -> None:
    """Pick all pending/failed aggregation events and dispatch them."""
    db = SessionLocal()
    try:
        pending = (
            db.query(AggEvent)
            .filter(AggEvent.status.in_(["pending", "failed"]))
            .filter(AggEvent.attempts < AGG_MAX_RETRIES)
            .all()
        )
        for event in pending:
            try:
                _dispatch_single(db, event)
            except Exception as exc:
                logger.exception("Unexpected error dispatching agg event %s", event.id)
                event.processing_error = str(exc)
                event.status = "dead_letter"
                db.commit()
    finally:
        db.close()


def dispatch_agg_event(event_id: str) -> None:
    """Dispatch a single aggregation event by ID."""
    db = SessionLocal()
    try:
        event = db.query(AggEvent).filter(AggEvent.id == event_id).first()
        if event and event.status in ("pending", "failed"):
            _dispatch_single(db, event)
    finally:
        db.close()


def enqueue_agg_event(event_id: str) -> None:
    """Enqueue an aggregation event for async dispatch."""
    from app.config import USE_CELERY

    if USE_CELERY:
        from app.celery_app import celery
        celery.send_task("dispatch_agg_event", args=[event_id])
    else:
        t = threading.Thread(target=dispatch_agg_event, args=(event_id,), daemon=True)
        t.start()
