"""
SQLAlchemy models for the SaaS Notifications & Workflows service.

Tables:
  notif_channels        – Connected SaaS platform channels
  notif_workflows       – Trigger-based workflow definitions
  notif_workflow_steps  – Ordered steps within a workflow
  notif_notifications   – Dispatched notification records
  notif_approval_requests – Human approval gates
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Text,
    DateTime,
    Integer,
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


# ── Channel ───────────────────────────────────────────────────────

class Channel(Base):
    __tablename__ = "notif_channels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform: Mapped[str] = mapped_column(String(30), nullable=False)  # slack | teams | salesforce
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    webhook_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    api_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | inactive
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    steps: Mapped[list["WorkflowStep"]] = relationship(back_populates="channel")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="channel")


# ── Workflow ──────────────────────────────────────────────────────

class Workflow(Base):
    __tablename__ = "notif_workflows"
    __table_args__ = (
        UniqueConstraint("name", "trigger_source", name="uq_workflow_name_source"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_event: Mapped[str] = mapped_column(String(120), nullable=False)  # e.g. "new_lead", "deal_closed"
    trigger_source: Mapped[str] = mapped_column(String(120), nullable=False)  # e.g. "salesforce", "webhook"
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | active | paused
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    steps: Mapped[list["WorkflowStep"]] = relationship(
        back_populates="workflow", cascade="all, delete-orphan", order_by="WorkflowStep.step_order"
    )
    notifications: Mapped[list["Notification"]] = relationship(back_populates="workflow")


# ── WorkflowStep ──────────────────────────────────────────────────

class WorkflowStep(Base):
    __tablename__ = "notif_workflow_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    workflow_id: Mapped[str] = mapped_column(ForeignKey("notif_workflows.id"), nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    action_type: Mapped[str] = mapped_column(String(30), nullable=False)  # notify | approve | wait | condition
    config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    channel_id: Mapped[str | None] = mapped_column(ForeignKey("notif_channels.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    workflow: Mapped["Workflow"] = relationship(back_populates="steps")
    channel: Mapped["Channel | None"] = relationship(back_populates="steps")


# ── Notification ──────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notif_notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    workflow_id: Mapped[str | None] = mapped_column(ForeignKey("notif_workflows.id"), nullable=True)
    channel_id: Mapped[str] = mapped_column(ForeignKey("notif_channels.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | sent | failed | dead_letter
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    workflow: Mapped["Workflow | None"] = relationship(back_populates="notifications")
    channel: Mapped["Channel"] = relationship(back_populates="notifications")
    approval_request: Mapped["ApprovalRequest | None"] = relationship(back_populates="notification", uselist=False)


# ── ApprovalRequest ───────────────────────────────────────────────

class ApprovalRequest(Base):
    __tablename__ = "notif_approval_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    notification_id: Mapped[str] = mapped_column(ForeignKey("notif_notifications.id"), nullable=False)
    approver_email: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | approved | rejected | expired
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    notification: Mapped["Notification"] = relationship(back_populates="approval_request")
