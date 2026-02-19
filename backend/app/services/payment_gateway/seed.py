"""
Seed data for the Payment Gateway Integration service.

Creates a "Payment to Finance" demo flow with sample Stripe events,
settlements in various states, and a dead-letter entry.
"""

import uuid
import json
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.services.payment_gateway.models import (
    PaymentEvent,
    Settlement,
    IdempotencyKey,
    DeadLetterPayment,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def seed_payment_gateway(db: Session) -> None:
    """Seed the payment gateway with demo data if tables are empty."""
    existing = db.query(PaymentEvent).first()
    if existing:
        return  # Already seeded

    now = _utcnow()

    # ── Sample Stripe events ─────────────────────────────────────
    events_data = [
        {
            "stripe_event_id": "evt_demo_001_succeeded",
            "event_type": "payment_intent.succeeded",
            "amount": 250000,  # $2,500.00
            "currency": "usd",
            "status": "processed",
            "offset_hours": -48,
        },
        {
            "stripe_event_id": "evt_demo_002_succeeded",
            "event_type": "payment_intent.succeeded",
            "amount": 99900,  # $999.00
            "currency": "usd",
            "status": "processed",
            "offset_hours": -36,
        },
        {
            "stripe_event_id": "evt_demo_003_captured",
            "event_type": "charge.captured",
            "amount": 450000,  # $4,500.00
            "currency": "usd",
            "status": "processed",
            "offset_hours": -24,
        },
        {
            "stripe_event_id": "evt_demo_004_invoice",
            "event_type": "invoice.paid",
            "amount": 1200000,  # $12,000.00
            "currency": "usd",
            "status": "processed",
            "offset_hours": -18,
        },
        {
            "stripe_event_id": "evt_demo_005_checkout",
            "event_type": "checkout.session.completed",
            "amount": 7500,  # $75.00
            "currency": "usd",
            "status": "processed",
            "offset_hours": -12,
        },
        {
            "stripe_event_id": "evt_demo_006_refund",
            "event_type": "charge.refunded",
            "amount": 50000,  # $500.00
            "currency": "usd",
            "status": "processed",
            "offset_hours": -6,
        },
        {
            "stripe_event_id": "evt_demo_007_failed",
            "event_type": "payment_intent.succeeded",
            "amount": 330000,  # $3,300.00
            "currency": "usd",
            "status": "processed",
            "offset_hours": -3,
        },
        {
            "stripe_event_id": "evt_demo_008_pending",
            "event_type": "payment_intent.succeeded",
            "amount": 185000,  # $1,850.00
            "currency": "usd",
            "status": "processing",
            "offset_hours": -1,
        },
    ]

    settlement_states = [
        {"status": "settled", "attempts": 1, "finance_ref": "FIN-REF-2024-001"},
        {"status": "settled", "attempts": 2, "finance_ref": "FIN-REF-2024-002"},  # replay success
        {"status": "settled", "attempts": 1, "finance_ref": "FIN-REF-2024-003"},
        {"status": "settled", "attempts": 1, "finance_ref": "FIN-REF-2024-004"},
        {"status": "pending", "attempts": 0, "finance_ref": None},
        None,  # No settlement for refund events
        {"status": "failed", "attempts": 2, "finance_ref": None, "error": "Finance API timeout after 15s"},
        {"status": "pending", "attempts": 0, "finance_ref": None},
    ]

    dead_letter_idx = None  # We'll create a separate DL entry

    for i, evt_data in enumerate(events_data):
        created_at = now + timedelta(hours=evt_data["offset_hours"])
        idem_key = f"stripe:{evt_data['stripe_event_id']}"

        event = PaymentEvent(
            stripe_event_id=evt_data["stripe_event_id"],
            event_type=evt_data["event_type"],
            payload={
                "id": evt_data["stripe_event_id"],
                "type": evt_data["event_type"],
                "created": int(created_at.timestamp()),
                "data": {
                    "object": {
                        "amount": evt_data["amount"],
                        "currency": evt_data["currency"],
                    }
                },
            },
            status=evt_data["status"],
            idempotency_key=idem_key,
            created_at=created_at,
        )
        db.add(event)
        db.flush()

        # Create idempotency key
        idem = IdempotencyKey(key=idem_key, event_id=event.id, created_at=created_at)
        db.add(idem)

        # Create settlement if applicable
        sdata = settlement_states[i]
        if sdata is not None:
            settled_at = created_at + timedelta(seconds=5) if sdata["status"] == "settled" else None
            settlement = Settlement(
                event_id=event.id,
                amount_cents=evt_data["amount"],
                currency=evt_data["currency"],
                destination="acct_finance_primary",
                finance_ref=sdata.get("finance_ref"),
                status=sdata["status"],
                attempts=sdata["attempts"],
                processing_error=sdata.get("error"),
                settled_at=settled_at,
                created_at=created_at,
            )
            db.add(settlement)
            db.flush()

            # Track the failed one for dead-letter demo
            if sdata["status"] == "failed" and dead_letter_idx is None:
                dead_letter_idx = settlement.id

    # ── Create one dead-letter entry ─────────────────────────────
    # Add a separate event + settlement that's fully dead-lettered
    dl_created = now + timedelta(hours=-72)
    dl_event = PaymentEvent(
        stripe_event_id="evt_demo_DL_001",
        event_type="payment_intent.succeeded",
        payload={
            "id": "evt_demo_DL_001",
            "type": "payment_intent.succeeded",
            "created": int(dl_created.timestamp()),
            "data": {"object": {"amount": 500000, "currency": "usd"}},
        },
        status="processed",
        idempotency_key="stripe:evt_demo_DL_001",
        created_at=dl_created,
    )
    db.add(dl_event)
    db.flush()

    dl_idem = IdempotencyKey(key="stripe:evt_demo_DL_001", event_id=dl_event.id, created_at=dl_created)
    db.add(dl_idem)

    dl_settlement = Settlement(
        event_id=dl_event.id,
        amount_cents=500000,
        currency="usd",
        destination="acct_finance_primary",
        status="dead_letter",
        attempts=3,
        processing_error="Finance API returned 503 – Service Unavailable (circuit breaker tripped)",
        created_at=dl_created,
    )
    db.add(dl_settlement)
    db.flush()

    dl_entry = DeadLetterPayment(
        settlement_id=dl_settlement.id,
        error="Finance API returned 503 – Service Unavailable after 3 retries (circuit breaker tripped)",
        failed_at=dl_created + timedelta(minutes=5),
    )
    db.add(dl_entry)

    db.commit()
