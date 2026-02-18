"""
Notifications service configuration.
Single config module – all env vars for the notifications sub-product live here.
"""

import os

# ── Platform credentials ──────────────────────────────────────────
SLACK_DEFAULT_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
TEAMS_DEFAULT_WEBHOOK_URL = os.getenv("TEAMS_WEBHOOK_URL", "")
SALESFORCE_CLIENT_ID = os.getenv("SALESFORCE_CLIENT_ID", "")
SALESFORCE_CLIENT_SECRET = os.getenv("SALESFORCE_CLIENT_SECRET", "")
SALESFORCE_INSTANCE_URL = os.getenv("SALESFORCE_INSTANCE_URL", "")

# ── Worker / retry settings ──────────────────────────────────────
MAX_DISPATCH_RETRIES: int = int(os.getenv("NOTIF_MAX_RETRIES", "3"))
BACKOFF_BASE_SECONDS: float = float(os.getenv("NOTIF_BACKOFF_BASE", "2.0"))

# ── Rate-limit settings ──────────────────────────────────────────
RATE_LIMIT_NOTIFICATIONS = os.getenv("NOTIF_RATE_LIMIT", "30/minute")
RATE_LIMIT_AUTH = os.getenv("AUTH_RATE_LIMIT", "10/minute")

# ── Security defaults ────────────────────────────────────────────
MAX_CONTENT_LENGTH_BYTES: int = int(os.getenv("MAX_CONTENT_LENGTH", str(5 * 1024 * 1024)))  # 5 MB
ALLOWED_MIME_TYPES: list[str] = [
    "application/json",
    "text/plain",
    "multipart/form-data",
]

# ── Approval TTL ──────────────────────────────────────────────────
APPROVAL_EXPIRY_HOURS: int = int(os.getenv("APPROVAL_EXPIRY_HOURS", "72"))
