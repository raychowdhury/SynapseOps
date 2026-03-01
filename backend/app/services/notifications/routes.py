"""
FastAPI routes for the SaaS Notifications & Workflows service.

Prefix: /notifications
Tags:  notif-channels, notif-workflows, notifications, notif-approvals
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.notifications.models import (
    Channel,
    Workflow,
    WorkflowStep,
    Notification,
    ApprovalRequest,
)
from app.services.notifications.schemas import (
    ChannelCreate,
    ChannelOut,
    ChannelUpdate,
    WorkflowCreate,
    WorkflowOut,
    WorkflowUpdate,
    WorkflowTriggerIn,
    NotificationCreate,
    NotificationOut,
    ApprovalRequestOut,
    ApprovalResponseIn,
)
from app.services.notifications.worker import enqueue_notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


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


# ── Channel endpoints ────────────────────────────────────────────

@router.post("/channels", response_model=ChannelOut, status_code=201, dependencies=[Depends(require_auth)])
def create_channel(payload: ChannelCreate, db: Session = Depends(get_db)):
    channel = Channel(
        platform=payload.platform,
        name=payload.name,
        webhook_url=payload.webhook_url,
        api_token=payload.api_token,
        status="active",
    )
    db.add(channel)
    db.commit()
    db.refresh(channel)
    return channel


@router.get("/channels", response_model=list[ChannelOut])
def list_channels(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Channel).offset(skip).limit(limit).all()


@router.get("/channels/{channel_id}", response_model=ChannelOut)
def get_channel(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Channel not found"})
    return channel


@router.patch("/channels/{channel_id}", response_model=ChannelOut, dependencies=[Depends(require_auth)])
def update_channel(channel_id: str, payload: ChannelUpdate, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Channel not found"})
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(channel, key, value)
    db.commit()
    db.refresh(channel)
    return channel


@router.delete("/channels/{channel_id}", status_code=204, dependencies=[Depends(require_auth)])
def delete_channel(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Channel not found"})
    db.delete(channel)
    db.commit()


# ── Workflow endpoints ───────────────────────────────────────────

@router.post("/workflows", response_model=WorkflowOut, status_code=201, dependencies=[Depends(require_auth)])
def create_workflow(payload: WorkflowCreate, db: Session = Depends(get_db)):
    # Duplicate heuristic: same name + trigger_source is not allowed
    existing = (
        db.query(Workflow)
        .filter(Workflow.name == payload.name, Workflow.trigger_source == payload.trigger_source)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "duplicate_workflow",
                "message": f"Workflow '{payload.name}' already exists for trigger source '{payload.trigger_source}'",
            },
        )

    workflow = Workflow(
        name=payload.name,
        description=payload.description,
        trigger_event=payload.trigger_event,
        trigger_source=payload.trigger_source,
        status="draft",
    )
    db.add(workflow)
    db.flush()  # get workflow.id before adding steps

    for step_data in payload.steps:
        step = WorkflowStep(
            workflow_id=workflow.id,
            step_order=step_data.step_order,
            action_type=step_data.action_type,
            config=step_data.config,
            channel_id=step_data.channel_id,
        )
        db.add(step)

    db.commit()
    db.refresh(workflow)
    return workflow


@router.get("/workflows", response_model=list[WorkflowOut])
def list_workflows(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Workflow).offset(skip).limit(limit).all()


@router.get("/workflows/{workflow_id}", response_model=WorkflowOut)
def get_workflow(workflow_id: str, db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Workflow not found"})
    return workflow


@router.patch("/workflows/{workflow_id}", response_model=WorkflowOut, dependencies=[Depends(require_auth)])
def update_workflow(workflow_id: str, payload: WorkflowUpdate, db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Workflow not found"})
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(workflow, key, value)
    db.commit()
    db.refresh(workflow)
    return workflow


@router.post("/workflows/{workflow_id}/trigger", response_model=list[NotificationOut], dependencies=[Depends(require_auth)])
def trigger_workflow(workflow_id: str, payload: WorkflowTriggerIn, db: Session = Depends(get_db)):
    """Manually trigger a workflow – creates notifications for each 'notify' step."""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Workflow not found"})
    if workflow.status != "active":
        raise HTTPException(
            status_code=400,
            detail={"code": "workflow_inactive", "message": "Workflow must be active to trigger"},
        )

    created_notifications: list[Notification] = []

    for step in workflow.steps:
        if step.action_type == "notify" and step.channel_id:
            notif = Notification(
                workflow_id=workflow.id,
                channel_id=step.channel_id,
                status="pending",
                payload=payload.payload.model_dump(),
            )
            db.add(notif)
            db.flush()
            created_notifications.append(notif)

        elif step.action_type == "approve" and payload.approver_email:
            # Create notification + approval request
            notif = Notification(
                workflow_id=workflow.id,
                channel_id=step.channel_id or "",
                status="pending",
                payload=payload.payload.model_dump(),
            )
            db.add(notif)
            db.flush()

            approval = ApprovalRequest(
                notification_id=notif.id,
                approver_email=payload.approver_email,
                status="pending",
            )
            db.add(approval)
            created_notifications.append(notif)

    db.commit()

    # Enqueue dispatches asynchronously
    for notif in created_notifications:
        if notif.channel_id:
            enqueue_notification(notif.id)

    db.expire_all()
    return created_notifications


# ── Notification endpoints ───────────────────────────────────────

@router.post("/send", response_model=NotificationOut, status_code=201, dependencies=[Depends(require_auth)])
def send_notification(payload: NotificationCreate, db: Session = Depends(get_db)):
    """Send a one-off notification outside of a workflow."""
    channel = db.query(Channel).filter(Channel.id == payload.channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Channel not found"})

    notif = Notification(
        channel_id=payload.channel_id,
        workflow_id=payload.workflow_id,
        status="pending",
        payload=payload.payload.model_dump(),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    enqueue_notification(notif.id)
    return notif


@router.get("/list", response_model=list[NotificationOut])
def list_notifications(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Notification)
    if status:
        query = query.filter(Notification.status == status)
    return query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()


# ── Approval endpoints ───────────────────────────────────────────

@router.get("/approvals", response_model=list[ApprovalRequestOut])
def list_approvals(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(ApprovalRequest)
    if status:
        query = query.filter(ApprovalRequest.status == status)
    return query.order_by(ApprovalRequest.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/approvals/{approval_id}/respond", response_model=ApprovalRequestOut, dependencies=[Depends(require_auth)])
def respond_to_approval(approval_id: str, payload: ApprovalResponseIn, db: Session = Depends(get_db)):
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Approval request not found"})
    if approval.status != "pending":
        raise HTTPException(
            status_code=400,
            detail={"code": "already_responded", "message": f"Approval already {approval.status}"},
        )

    approval.status = payload.decision
    approval.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(approval)
    return approval
