"""
SQLAlchemy models for the Payment Gateway Integration service.

Tables:
  pg_events           – Inbound Stripe webhook events
  pg_settlements      – Outbound settlement records sent to Finance API
  pg_idempotency_keys – Deduplication keys for webhook events
  pg_dead_letter      – Permanently failed settlement records
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Text,
    DateTime,
    Integer,
    BigInteger,
    Float,
    ForeignKey,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Payment Event ────────────────────────────────────────────────

class PaymentEvent(Base):
    __tablename__ = "pg_events"
    __table_args__ = (
        UniqueConstraint("stripe_event_id", name="uq_pg_stripe_event_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    stripe_event_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. payment_intent.succeeded
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="received")  # received | processing | processed | failed
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    settlements: Mapped[list["Settlement"]] = relationship(back_populates="event")
    idem_key: Mapped["IdempotencyKey | None"] = relationship(back_populates="event", uselist=False)


# ── Settlement ───────────────────────────────────────────────────

class Settlement(Base):
    __tablename__ = "pg_settlements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    event_id: Mapped[str] = mapped_column(ForeignKey("pg_events.id"), nullable=False)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="usd")
    destination: Mapped[str] = mapped_column(String(255), nullable=False)  # Finance account / entity
    finance_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Reference from Finance API
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | processing | settled | failed | dead_letter
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    event: Mapped["PaymentEvent"] = relationship(back_populates="settlements")
    dead_letter_entry: Mapped["DeadLetterPayment | None"] = relationship(back_populates="settlement", uselist=False)


# ── Idempotency Key ──────────────────────────────────────────────

class IdempotencyKey(Base):
    __tablename__ = "pg_idempotency_keys"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("pg_events.id"), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    event: Mapped["PaymentEvent"] = relationship(back_populates="idem_key")


# ── Dead Letter ──────────────────────────────────────────────────

class DeadLetterPayment(Base):
    __tablename__ = "pg_dead_letter"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    settlement_id: Mapped[str] = mapped_column(ForeignKey("pg_settlements.id"), nullable=False, unique=True)
    error: Mapped[str] = mapped_column(Text, nullable=False)
    failed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    settlement: Mapped["Settlement"] = relationship(back_populates="dead_letter_entry")
