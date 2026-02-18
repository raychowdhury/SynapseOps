"""
Async notification dispatch worker.

Implements exponential backoff (2^attempt seconds, max 3 retries) and
dead-letter behavior: on final failure the notification is marked
`dead_letter` with the error stored in `processing_error`.
"""

import logging
import threading
import time
from datetime import datetime, timezone

from app.database import SessionLocal
from app.services.notifications.models import Channel, Notification
from app.services.notifications.connectors import get_connector
from app.services.notifications.config import MAX_DISPATCH_RETRIES, BACKOFF_BASE_SECONDS

logger = logging.getLogger(__name__)


def _dispatch_single(db, notification: Notification) -> None:
    """Attempt to dispatch a single notification to its channel."""
    channel = db.query(Channel).filter(Channel.id == notification.channel_id).first()
    if not channel:
        notification.status = "dead_letter"
        notification.processing_error = "Channel not found"
        db.commit()
        return

    connector_cls = get_connector(channel.platform)

    if channel.platform in ("slack", "teams"):
        if not channel.webhook_url:
            notification.status = "dead_letter"
            notification.processing_error = f"No webhook_url configured for {channel.platform} channel"
            db.commit()
            return
        result = connector_cls.send(channel.webhook_url, notification.payload)
    elif channel.platform == "salesforce":
        from app.services.notifications.config import SALESFORCE_INSTANCE_URL
        token = channel.api_token or ""
        instance_url = SALESFORCE_INSTANCE_URL
        result = connector_cls.send(instance_url, token, notification.payload)
    else:
        notification.status = "dead_letter"
        notification.processing_error = f"Unsupported platform: {channel.platform}"
        db.commit()
        return

    notification.attempts += 1

    if result.success:
        notification.status = "sent"
        notification.sent_at = datetime.now(timezone.utc)
        notification.processing_error = None
        db.commit()
        logger.info("Notification %s dispatched successfully", notification.id)
    else:
        notification.processing_error = result.error_message
        if notification.attempts >= MAX_DISPATCH_RETRIES:
            notification.status = "dead_letter"
            db.commit()
            logger.warning(
                "Notification %s dead-lettered after %d attempts: %s",
                notification.id,
                notification.attempts,
                result.error_message,
            )
        else:
            notification.status = "failed"
            db.commit()
            # Exponential backoff before next retry
            delay = BACKOFF_BASE_SECONDS ** notification.attempts
            logger.info(
                "Notification %s failed (attempt %d), retrying in %.1fs",
                notification.id,
                notification.attempts,
                delay,
            )
            time.sleep(delay)
            _dispatch_single(db, notification)


def _process_pending_notifications() -> None:
    """Pick all pending notifications and dispatch them."""
    db = SessionLocal()
    try:
        pending = (
            db.query(Notification)
            .filter(Notification.status.in_(["pending", "failed"]))
            .filter(Notification.attempts < MAX_DISPATCH_RETRIES)
            .all()
        )
        for notif in pending:
            try:
                _dispatch_single(db, notif)
            except Exception as exc:
                logger.exception("Unexpected error dispatching notification %s", notif.id)
                notif.processing_error = str(exc)
                notif.status = "dead_letter"
                db.commit()
    finally:
        db.close()


def dispatch_notification(notification_id: str) -> None:
    """Dispatch a single notification by ID."""
    db = SessionLocal()
    try:
        notif = db.query(Notification).filter(Notification.id == notification_id).first()
        if notif and notif.status in ("pending", "failed"):
            _dispatch_single(db, notif)
    finally:
        db.close()


def enqueue_notification(notification_id: str) -> None:
    """Enqueue a notification for async dispatch (never blocks the request thread)."""
    from app.config import USE_CELERY

    if USE_CELERY:
        from app.celery_app import celery
        celery.send_task("dispatch_notification", args=[notification_id])
    else:
        t = threading.Thread(target=dispatch_notification, args=(notification_id,), daemon=True)
        t.start()
