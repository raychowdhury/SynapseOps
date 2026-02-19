"""
Async settlement dispatch worker for the Payment Gateway.

Implements exponential backoff (2^attempt seconds, max 3 retries) and
dead-letter behavior: on final failure the settlement is marked
`dead_letter` with a row inserted into `pg_dead_letter`.
"""

import logging
import threading
import time
from datetime import datetime, timezone

from app.database import SessionLocal
from app.services.payment_gateway.models import Settlement, DeadLetterPayment
from app.services.payment_gateway.connectors import FinanceAPIClient
from app.services.payment_gateway.config import MAX_SETTLEMENT_RETRIES, BACKOFF_BASE_SECONDS

logger = logging.getLogger(__name__)


def _dispatch_single(db, settlement: Settlement) -> None:
    """Attempt to forward a single settlement to the Finance API."""
    result = FinanceAPIClient.post_settlement(
        amount_cents=settlement.amount_cents,
        currency=settlement.currency,
        destination=settlement.destination,
        reference_id=settlement.id,
    )

    settlement.attempts += 1

    if result.success:
        settlement.status = "settled"
        settlement.finance_ref = result.finance_ref
        settlement.settled_at = datetime.now(timezone.utc)
        settlement.processing_error = None
        db.commit()
        logger.info("Settlement %s dispatched successfully (ref=%s)", settlement.id, result.finance_ref)
    else:
        settlement.processing_error = result.error_message
        if settlement.attempts >= MAX_SETTLEMENT_RETRIES:
            settlement.status = "dead_letter"
            db.commit()

            # Insert dead-letter record
            dl = DeadLetterPayment(
                settlement_id=settlement.id,
                error=result.error_message or "Unknown error after max retries",
            )
            db.add(dl)
            db.commit()

            logger.warning(
                "Settlement %s dead-lettered after %d attempts: %s",
                settlement.id,
                settlement.attempts,
                result.error_message,
            )
        else:
            settlement.status = "failed"
            db.commit()
            # Exponential backoff before next retry
            delay = BACKOFF_BASE_SECONDS ** settlement.attempts
            logger.info(
                "Settlement %s failed (attempt %d), retrying in %.1fs",
                settlement.id,
                settlement.attempts,
                delay,
            )
            time.sleep(delay)
            _dispatch_single(db, settlement)


def _process_pending_settlements() -> None:
    """Pick all pending/failed settlements and dispatch them."""
    db = SessionLocal()
    try:
        pending = (
            db.query(Settlement)
            .filter(Settlement.status.in_(["pending", "failed"]))
            .filter(Settlement.attempts < MAX_SETTLEMENT_RETRIES)
            .all()
        )
        for settlement in pending:
            try:
                _dispatch_single(db, settlement)
            except Exception as exc:
                logger.exception("Unexpected error dispatching settlement %s", settlement.id)
                settlement.processing_error = str(exc)
                settlement.status = "dead_letter"
                db.commit()
    finally:
        db.close()


def dispatch_settlement(settlement_id: str) -> None:
    """Dispatch a single settlement by ID."""
    db = SessionLocal()
    try:
        settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
        if settlement and settlement.status in ("pending", "failed"):
            _dispatch_single(db, settlement)
    finally:
        db.close()


def enqueue_settlement(settlement_id: str) -> None:
    """Enqueue a settlement for async dispatch (never blocks the request thread)."""
    from app.config import USE_CELERY

    if USE_CELERY:
        from app.celery_app import celery
        celery.send_task("dispatch_settlement", args=[settlement_id])
    else:
        t = threading.Thread(target=dispatch_settlement, args=(settlement_id,), daemon=True)
        t.start()
