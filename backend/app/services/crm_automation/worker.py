"""
Async CRM sync worker for the CRM Automation service.

Implements exponential backoff (2^attempt seconds, max 3 retries) and
dead-letter behavior: on final failure the event is marked
`dead_letter` with a row inserted into `crm_dead_letter`.
"""

import logging
import threading
import time
from datetime import datetime, timezone

from app.database import SessionLocal
from app.services.crm_automation.models import CrmEvent, DeadLetterCrm, CrmPlatform, SyncState
from app.services.crm_automation.connectors import get_connector
from app.services.crm_automation.config import CRM_MAX_RETRIES, CRM_BACKOFF_BASE

logger = logging.getLogger(__name__)


def _dispatch_single(db, event: CrmEvent) -> None:
    """Attempt to sync a single CRM event through the appropriate connector."""
    # Resolve target platform
    target = db.query(CrmPlatform).filter(CrmPlatform.id == event.target_platform_id).first()
    if not target:
        event.status = "dead_letter"
        event.processing_error = f"Target platform {event.target_platform_id} not found"
        db.commit()
        dl = DeadLetterCrm(event_id=event.id, error=event.processing_error)
        db.add(dl)
        db.commit()
        return

    connector = get_connector(target.platform_type)
    result = connector.push_contact(event.payload)

    event.attempts += 1

    if result.success:
        event.status = "synced"
        event.synced_at = datetime.now(timezone.utc)
        event.processing_error = None
        db.commit()

        # Update sync state
        sync_state = (
            db.query(SyncState)
            .filter(SyncState.platform_id == event.target_platform_id)
            .filter(SyncState.direction == event.direction)
            .first()
        )
        if sync_state:
            sync_state.last_synced_at = event.synced_at
            sync_state.records_synced += 1
            sync_state.status = "idle"
            db.commit()

        logger.info(
            "CRM event %s synced successfully (remote_id=%s)",
            event.id,
            result.remote_id,
        )
    else:
        event.processing_error = result.error_message
        if event.attempts >= CRM_MAX_RETRIES:
            event.status = "dead_letter"
            db.commit()

            dl = DeadLetterCrm(
                event_id=event.id,
                error=result.error_message or "Unknown error after max retries",
            )
            db.add(dl)
            db.commit()

            logger.warning(
                "CRM event %s dead-lettered after %d attempts: %s",
                event.id,
                event.attempts,
                result.error_message,
            )
        else:
            event.status = "failed"
            db.commit()
            delay = CRM_BACKOFF_BASE ** event.attempts
            logger.info(
                "CRM event %s failed (attempt %d), retrying in %.1fs",
                event.id,
                event.attempts,
                delay,
            )
            time.sleep(delay)
            _dispatch_single(db, event)


def process_pending_events() -> None:
    """Pick all pending/failed CRM events and dispatch them."""
    db = SessionLocal()
    try:
        pending = (
            db.query(CrmEvent)
            .filter(CrmEvent.status.in_(["pending", "failed"]))
            .filter(CrmEvent.attempts < CRM_MAX_RETRIES)
            .all()
        )
        for event in pending:
            try:
                _dispatch_single(db, event)
            except Exception as exc:
                logger.exception("Unexpected error dispatching CRM event %s", event.id)
                event.processing_error = str(exc)
                event.status = "dead_letter"
                db.commit()
    finally:
        db.close()


def dispatch_crm_event(event_id: str) -> None:
    """Dispatch a single CRM event by ID."""
    db = SessionLocal()
    try:
        event = db.query(CrmEvent).filter(CrmEvent.id == event_id).first()
        if event and event.status in ("pending", "failed"):
            _dispatch_single(db, event)
    finally:
        db.close()


def enqueue_crm_event(event_id: str) -> None:
    """Enqueue a CRM event for async dispatch (never blocks the request thread)."""
    from app.config import USE_CELERY

    if USE_CELERY:
        from app.celery_app import celery
        celery.send_task("dispatch_crm_event", args=[event_id])
    else:
        t = threading.Thread(target=dispatch_crm_event, args=(event_id,), daemon=True)
        t.start()
