"""
Shared Pydantic schemas for the SaaS Notifications & Workflows service.

The `NotificationPayload` schema is the single source of truth – it is
validated on the backend and mirrored as a TypeScript interface on the frontend.
"""

from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


# ── Shared payload schema (backend + frontend) ───────────────────

class NotificationPayload(BaseModel):
    """Canonical notification payload – defined once, reused everywhere."""
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=4000)
    priority: str = Field(default="normal", pattern=r"^(low|normal|high|urgent)$")
    metadata: dict = Field(default_factory=dict)


# ── Channel schemas ───────────────────────────────────────────────

class ChannelCreate(BaseModel):
    platform: str = Field(..., pattern=r"^(slack|teams|salesforce)$")
    name: str = Field(..., min_length=1, max_length=120)
    webhook_url: str | None = None
    api_token: str | None = None


class ChannelOut(BaseModel):
    id: str
    platform: str
    name: str
    webhook_url: str | None = None
    api_token: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChannelUpdate(BaseModel):
    name: str | None = None
    webhook_url: str | None = None
    api_token: str | None = None
    status: str | None = Field(default=None, pattern=r"^(active|inactive)$")


# ── Workflow Step schemas ─────────────────────────────────────────

class WorkflowStepCreate(BaseModel):
    step_order: int = Field(..., ge=1)
    action_type: str = Field(..., pattern=r"^(notify|approve|wait|condition)$")
    config: dict = Field(default_factory=dict)
    channel_id: str | None = None


class WorkflowStepOut(BaseModel):
    id: str
    step_order: int
    action_type: str
    config: dict
    channel_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Workflow schemas ──────────────────────────────────────────────

class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    trigger_event: str = Field(..., min_length=1, max_length=120)
    trigger_source: str = Field(..., pattern=r"^(slack|teams|salesforce|webhook|manual)$")
    steps: list[WorkflowStepCreate] = Field(default_factory=list)


class WorkflowOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    trigger_event: str
    trigger_source: str
    status: str
    steps: list[WorkflowStepOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = Field(default=None, pattern=r"^(draft|active|paused)$")


# ── Notification schemas ─────────────────────────────────────────

class NotificationCreate(BaseModel):
    channel_id: str
    workflow_id: str | None = None
    payload: NotificationPayload


class NotificationOut(BaseModel):
    id: str
    workflow_id: str | None = None
    channel_id: str
    status: str
    payload: dict
    attempts: int
    processing_error: str | None = None
    sent_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Approval schemas ─────────────────────────────────────────────

class ApprovalRequestOut(BaseModel):
    id: str
    notification_id: str
    approver_email: str
    status: str
    responded_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApprovalResponseIn(BaseModel):
    decision: str = Field(..., pattern=r"^(approved|rejected)$")


# ── Workflow trigger schema ───────────────────────────────────────

class WorkflowTriggerIn(BaseModel):
    payload: NotificationPayload
    approver_email: str | None = None
