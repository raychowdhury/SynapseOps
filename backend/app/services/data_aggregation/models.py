"""
SQLAlchemy models for the Data Aggregation service.

Tables:
  agg_data_sources     – Registered ingestion sources
  agg_ingestion_runs   – Per-source run history with latency/volume
  agg_warehouse_records – Canonical normalized records
  agg_events           – Ingestion/upsert event log
  agg_dead_letter      – Permanently failed events
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Text,
    DateTime,
    Integer,
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


# ── Data Source ──────────────────────────────────────────────────

class DataSource(Base):
    __tablename__ = "agg_data_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # github | stripe | internal_logs
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | paused | error
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    runs: Mapped[list["IngestionRun"]] = relationship(back_populates="source")


# ── Ingestion Run ────────────────────────────────────────────────

class IngestionRun(Base):
    __tablename__ = "agg_ingestion_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source_id: Mapped[str] = mapped_column(ForeignKey("agg_data_sources.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="running")  # running | completed | failed
    records_ingested: Mapped[int] = mapped_column(Integer, default=0)
    records_upserted: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    source: Mapped["DataSource"] = relationship(back_populates="runs")


# ── Warehouse Record ─────────────────────────────────────────────

class WarehouseRecord(Base):
    __tablename__ = "agg_warehouse_records"
    __table_args__ = (
        UniqueConstraint("source_type", "entity_type", "external_id", name="uq_warehouse_record"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # activity | transaction | log_entry
    external_id: Mapped[str] = mapped_column(String(200), nullable=False)
    canonical_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


# ── Aggregation Event ────────────────────────────────────────────

class AggEvent(Base):
    __tablename__ = "agg_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source_id: Mapped[str] = mapped_column(ForeignKey("agg_data_sources.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # ingestion | normalization | upsert
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | processing | completed | failed | dead_letter
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    dead_letter_entry: Mapped["DeadLetterAgg | None"] = relationship(back_populates="event", uselist=False)


# ── Dead Letter ──────────────────────────────────────────────────

class DeadLetterAgg(Base):
    __tablename__ = "agg_dead_letter"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    event_id: Mapped[str] = mapped_column(ForeignKey("agg_events.id"), nullable=False, unique=True)
    error: Mapped[str] = mapped_column(Text, nullable=False)
    failed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    event: Mapped["AggEvent"] = relationship(back_populates="dead_letter_entry")
