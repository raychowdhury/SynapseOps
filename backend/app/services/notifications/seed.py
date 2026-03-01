from sqlalchemy.orm import Session
from app.services.notifications.models import Channel, Workflow, WorkflowStep

def seed_notifications(db: Session):
    # 1. Create a "Mock Slack" channel for system alerts if it doesn't exist
    system_channel = db.query(Channel).filter(Channel.name == "System Slack Alerts").first()
    if not system_channel:
        system_channel = Channel(
            platform="slack",
            name="System Slack Alerts",
            webhook_url="https://hooks.slack.com/services/MOCK/SYSTEM/ALERTS",
            status="active"
        )
        db.add(system_channel)
        db.flush()

    # 2. Create "Integration Failure" workflow if it doesn't exist
    failure_workflow = (
        db.query(Workflow)
        .filter(Workflow.trigger_source == "system", Workflow.trigger_event == "integration_failure")
        .first()
    )
    if not failure_workflow:
        failure_workflow = Workflow(
            name="API Integration Failure Alert",
            description="Triggered when an API integration flow fails and moves to DLQ.",
            trigger_event="integration_failure",
            trigger_source="system",
            status="active"
        )
        db.add(failure_workflow)
        db.flush()

        # Add a step to notify via the system channel
        step = WorkflowStep(
            workflow_id=failure_workflow.id,
            step_order=1,
            action_type="notify",
            config={},
            channel_id=system_channel.id
        )
        db.add(step)

    db.commit()
