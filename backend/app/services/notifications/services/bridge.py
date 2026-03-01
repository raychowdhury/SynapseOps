from sqlalchemy.orm import Session
from app.services.notifications.models import Workflow, Notification
from app.services.notifications.worker import enqueue_notification

class NotificationBridge:
    @staticmethod
    def trigger_system_alert(db: Session, alert_type: str, payload: dict):
        """
        Triggers a notification for a system alert (e.g., integration failure).
        Finds an active workflow with trigger_source='system' and trigger_event=alert_type.
        """
        workflow = (
            db.query(Workflow)
            .filter(
                Workflow.trigger_source == "system",
                Workflow.trigger_event == alert_type,
                Workflow.status == "active"
            )
            .first()
        )

        if not workflow:
            # Fallback or silent return if no system workflow is configured
            return

        created_notifications = []
        for step in workflow.steps:
            if step.action_type == "notify" and step.channel_id:
                notif = Notification(
                    workflow_id=workflow.id,
                    channel_id=step.channel_id,
                    status="pending",
                    payload=payload
                )
                db.add(notif)
                db.flush()
                created_notifications.append(notif)

        db.commit()

        for notif in created_notifications:
            enqueue_notification(notif.id)

notification_bridge = NotificationBridge()
