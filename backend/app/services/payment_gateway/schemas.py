"""
Shared Pydantic schemas for the Payment Gateway Integration service.

These schemas are the single source of truth – validated on the backend
and mirrored as TypeScript interfaces on the frontend.
"""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Stripe Webhook inbound ───────────────────────────────────────

class StripeWebhookPayload(BaseModel):
    """Canonical inbound Stripe event payload."""
    id: str = Field(..., min_length=1, description="Stripe event ID (evt_xxx)")
    type: str = Field(..., min_length=1, description="Event type e.g. payment_intent.succeeded")
    data: dict = Field(default_factory=dict, description="Event data object")
    created: int = Field(default=0, description="Unix timestamp of event creation")


# ── Event schemas ────────────────────────────────────────────────

class EventOut(BaseModel):
    id: str
    stripe_event_id: str
    event_type: str
    payload: dict
    status: str
    idempotency_key: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Settlement schemas ───────────────────────────────────────────

class SettlementOut(BaseModel):
    id: str
    event_id: str
    amount_cents: int
    currency: str
    destination: str
    finance_ref: str | None = None
    status: str
    attempts: int
    processing_error: str | None = None
    settled_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReplayRequest(BaseModel):
    """Request body for replaying a failed settlement."""
    force: bool = Field(default=False, description="Force replay even if max retries exceeded")


# ── Dead Letter schemas ──────────────────────────────────────────

class DeadLetterOut(BaseModel):
    id: str
    settlement_id: str
    error: str
    failed_at: datetime

    model_config = {"from_attributes": True}


# ── Aggregated stats ─────────────────────────────────────────────

class GatewayStatsOut(BaseModel):
    """Aggregated payment gateway statistics."""
    total_events: int = 0
    total_settlements: int = 0
    settled_count: int = 0
    settled_amount_cents: int = 0
    pending_count: int = 0
    pending_amount_cents: int = 0
    failed_count: int = 0
    dead_letter_count: int = 0
    replay_attempts: int = 0
    replay_successes: int = 0
    replay_success_rate: float = 0.0
    circuit_breaker_status: str = "closed"
