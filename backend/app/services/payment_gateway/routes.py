"""
FastAPI routes for the Payment Gateway Integration service.

Prefix: /payments
Tags:  payment-gateway
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.services.payment_gateway.models import (
    PaymentEvent,
    Settlement,
    IdempotencyKey,
    DeadLetterPayment,
)
from app.services.payment_gateway.schemas import (
    StripeWebhookPayload,
    EventOut,
    SettlementOut,
    ReplayRequest,
    DeadLetterOut,
    GatewayStatsOut,
)
from app.services.payment_gateway.connectors import (
    StripeWebhookConnector,
    get_circuit_breaker,
)
from app.services.payment_gateway.worker import enqueue_settlement

router = APIRouter(prefix="/payments", tags=["payment-gateway"])


# ── Auth guard (simple API-key check) ────────────────────────────

def require_auth(x_api_key: str = Header(None)):
    """Lightweight auth guard – rejects requests without a valid API key."""
    from app.config import SECRET_KEY
    if not x_api_key or x_api_key != SECRET_KEY:
        raise HTTPException(
            status_code=401,
            detail={"code": "unauthorized", "message": "Missing or invalid API key"},
        )
    return x_api_key


# ── Stripe Webhook Ingestor ──────────────────────────────────────

@router.post("/webhooks/stripe", response_model=EventOut, status_code=201)
async def ingest_stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Receive a Stripe webhook event.

    Performs:
    1. Signature verification (skipped in demo mode)
    2. Idempotency check – rejects duplicate events (409)
    3. Creates PaymentEvent + Settlement + IdempotencyKey records
    4. Enqueues async settlement dispatch
    """
    raw_body = await request.body()
    sig_header = request.headers.get("stripe-signature")

    result = StripeWebhookConnector.verify_and_parse(raw_body, sig_header)
    if not result.valid:
        raise HTTPException(
            status_code=400,
            detail={"code": "invalid_webhook", "message": result.error_message or "Invalid webhook"},
        )

    # Idempotency check
    idempotency_key = f"stripe:{result.event_id}"
    existing = db.query(IdempotencyKey).filter(IdempotencyKey.key == idempotency_key).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "duplicate_event",
                "message": f"Event {result.event_id} already processed",
                "details": {"existing_event_id": existing.event_id},
            },
        )

    # Parse amount from Stripe data (payment_intent or charge object)
    data_obj = result.data or {}
    obj = data_obj.get("object", {})
    amount_cents = obj.get("amount", 0)
    currency = obj.get("currency", "usd")

    # Create event
    event = PaymentEvent(
        stripe_event_id=result.event_id,
        event_type=result.event_type,
        payload=json.loads(raw_body),
        status="processing",
        idempotency_key=idempotency_key,
    )
    db.add(event)
    db.flush()

    # Create idempotency key
    idem = IdempotencyKey(key=idempotency_key, event_id=event.id)
    db.add(idem)

    # Create settlement for payment-related events
    settlement_types = {
        "payment_intent.succeeded",
        "charge.captured",
        "charge.succeeded",
        "invoice.paid",
        "checkout.session.completed",
    }

    if result.event_type in settlement_types and amount_cents > 0:
        settlement = Settlement(
            event_id=event.id,
            amount_cents=amount_cents,
            currency=currency,
            destination=obj.get("transfer_data", {}).get("destination", "default_finance_account"),
            status="pending",
        )
        db.add(settlement)
        db.flush()

        event.status = "processed"
        db.commit()

        # Async dispatch
        enqueue_settlement(settlement.id)
    else:
        event.status = "processed"
        db.commit()

    db.refresh(event)
    return event


# ── Event endpoints ──────────────────────────────────────────────

@router.get("/events", response_model=list[EventOut])
def list_events(
    status: str | None = None,
    event_type: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List payment events with optional filters."""
    query = db.query(PaymentEvent)
    if status:
        query = query.filter(PaymentEvent.status == status)
    if event_type:
        query = query.filter(PaymentEvent.event_type == event_type)
    return query.order_by(PaymentEvent.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(PaymentEvent).filter(PaymentEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Event not found"})
    return event


# ── Settlement endpoints ─────────────────────────────────────────

@router.get("/settlements", response_model=list[SettlementOut])
def list_settlements(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List settlements with optional status filter."""
    query = db.query(Settlement)
    if status:
        query = query.filter(Settlement.status == status)
    return query.order_by(Settlement.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/settlements/stats", response_model=GatewayStatsOut)
def get_settlement_stats(db: Session = Depends(get_db)):
    """Return aggregated payment gateway statistics."""
    total_events = db.query(func.count(PaymentEvent.id)).scalar() or 0
    total_settlements = db.query(func.count(Settlement.id)).scalar() or 0

    settled = db.query(Settlement).filter(Settlement.status == "settled").all()
    settled_count = len(settled)
    settled_amount = sum(s.amount_cents for s in settled)

    pending = db.query(Settlement).filter(Settlement.status == "pending").all()
    pending_count = len(pending)
    pending_amount = sum(s.amount_cents for s in pending)

    failed_count = db.query(func.count(Settlement.id)).filter(Settlement.status == "failed").scalar() or 0
    dead_letter_count = db.query(func.count(DeadLetterPayment.id)).scalar() or 0

    # Replay stats: settlements that were retried (attempts > 1) and succeeded
    replayed = db.query(Settlement).filter(Settlement.attempts > 1).all()
    replay_attempts = len(replayed)
    replay_successes = len([s for s in replayed if s.status == "settled"])
    replay_rate = (replay_successes / replay_attempts * 100) if replay_attempts > 0 else 0.0

    cb = get_circuit_breaker()

    return GatewayStatsOut(
        total_events=total_events,
        total_settlements=total_settlements,
        settled_count=settled_count,
        settled_amount_cents=settled_amount,
        pending_count=pending_count,
        pending_amount_cents=pending_amount,
        failed_count=failed_count,
        dead_letter_count=dead_letter_count,
        replay_attempts=replay_attempts,
        replay_successes=replay_successes,
        replay_success_rate=round(replay_rate, 1),
        circuit_breaker_status=cb.status_label,
    )


# ── Replay endpoint ──────────────────────────────────────────────

@router.post(
    "/settlements/{settlement_id}/replay",
    response_model=SettlementOut,
    dependencies=[Depends(require_auth)],
)
def replay_settlement(
    settlement_id: str,
    payload: ReplayRequest = ReplayRequest(),
    db: Session = Depends(get_db),
):
    """Replay a failed or dead-lettered settlement."""
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Settlement not found"})

    if settlement.status not in ("failed", "dead_letter"):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "invalid_replay",
                "message": f"Cannot replay settlement with status '{settlement.status}'",
            },
        )

    # Reset for retry
    if payload.force:
        settlement.attempts = 0
    settlement.status = "pending"
    settlement.processing_error = None

    # Remove dead-letter entry if one exists
    dl = db.query(DeadLetterPayment).filter(DeadLetterPayment.settlement_id == settlement_id).first()
    if dl:
        db.delete(dl)

    db.commit()
    db.refresh(settlement)

    enqueue_settlement(settlement.id)
    return settlement


# ── Dead Letter endpoints ────────────────────────────────────────

@router.get("/dead-letter", response_model=list[DeadLetterOut])
def list_dead_letter(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List dead-letter payment entries."""
    return (
        db.query(DeadLetterPayment)
        .order_by(DeadLetterPayment.failed_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
