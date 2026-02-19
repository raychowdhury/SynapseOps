"""
SQLAlchemy models for the CRM Automation service.

Tables:
  crm_platforms       – Registered CRM platform instances
  crm_field_mappings  – Source→target field mapping rules
  crm_sync_states     – Per-platform last-synced timestamps
  crm_events          – Inbound/outbound sync event records
  crm_dead_letter     – Permanently failed sync records
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


# ── CRM Platform ────────────────────────────────────────────────

class CrmPlatform(Base):
    __tablename__ = "crm_platforms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)  # salesforce | hubspot
    label: Mapped[str] = mapped_column(String(200), nullable=False)  # Human-readable label
    platform_type: Mapped[str] = mapped_column(String(50), nullable=False)  # salesforce | hubspot
    auth_config: Mapped[dict] = mapped_column(JSON, default=dict)  # Encrypted credentials
    status: Mapped[str] = mapped_column(String(20), default="connected")  # connected | disconnected | error
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    mappings_as_source: Mapped[list["FieldMapping"]] = relationship(
        back_populates="source_platform",
        foreign_keys="FieldMapping.source_platform_id",
    )
    mappings_as_target: Mapped[list["FieldMapping"]] = relationship(
        back_populates="target_platform",
        foreign_keys="FieldMapping.target_platform_id",
    )
    sync_states: Mapped[list["SyncState"]] = relationship(back_populates="platform")


# ── Field Mapping ────────────────────────────────────────────────

class FieldMapping(Base):
    __tablename__ = "crm_field_mappings"
    __table_args__ = (
        UniqueConstraint(
            "source_platform_id", "source_field", "target_platform_id", "target_field",
            name="uq_crm_field_mapping",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source_platform_id: Mapped[str] = mapped_column(ForeignKey("crm_platforms.id"), nullable=False)
    target_platform_id: Mapped[str] = mapped_column(ForeignKey("crm_platforms.id"), nullable=False)
    source_object: Mapped[str] = mapped_column(String(100), nullable=False)  # Lead, Contact, Account
    target_object: Mapped[str] = mapped_column(String(100), nullable=False)
    source_field: Mapped[str] = mapped_column(String(200), nullable=False)
    target_field: Mapped[str] = mapped_column(String(200), nullable=False)
    transform_rule: Mapped[str | None] = mapped_column(String(50), nullable=True)  # direct | uppercase | lowercase | date_format
    is_active: Mapped[int] = mapped_column(Integer, default=1)  # 1=active, 0=disabled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    source_platform: Mapped["CrmPlatform"] = relationship(
        back_populates="mappings_as_source",
        foreign_keys=[source_platform_id],
    )
    target_platform: Mapped["CrmPlatform"] = relationship(
        back_populates="mappings_as_target",
        foreign_keys=[target_platform_id],
    )


# ── Sync State ───────────────────────────────────────────────────

class SyncState(Base):
    __tablename__ = "crm_sync_states"
    __table_args__ = (
        UniqueConstraint("platform_id", "direction", name="uq_crm_sync_state"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform_id: Mapped[str] = mapped_column(ForeignKey("crm_platforms.id"), nullable=False)
    direction: Mapped[str] = mapped_column(String(20), nullable=False)  # inbound | outbound
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    records_synced: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="idle")  # idle | syncing | error

    platform: Mapped["CrmPlatform"] = relationship(back_populates="sync_states")


# ── CRM Event ───────────────────────────────────────────────────

class CrmEvent(Base):
    __tablename__ = "crm_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source_platform_id: Mapped[str] = mapped_column(ForeignKey("crm_platforms.id"), nullable=False)
    target_platform_id: Mapped[str] = mapped_column(ForeignKey("crm_platforms.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # lead_sync | contact_sync | account_sync
    direction: Mapped[str] = mapped_column(String(20), nullable=False)  # inbound | outbound
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | processing | synced | failed | dead_letter
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    dead_letter_entry: Mapped["DeadLetterCrm | None"] = relationship(back_populates="event", uselist=False)


# ── Dead Letter ──────────────────────────────────────────────────

class DeadLetterCrm(Base):
    __tablename__ = "crm_dead_letter"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    event_id: Mapped[str] = mapped_column(ForeignKey("crm_events.id"), nullable=False, unique=True)
    error: Mapped[str] = mapped_column(Text, nullable=False)
    failed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    event: Mapped["CrmEvent"] = relationship(back_populates="dead_letter_entry")
