"""
Data Aggregation connectors.

1. GitHubConnector     – pull repo/PR/issue activity (demo mode)
2. StripeConnector     – pull charges/refunds (demo mode)
3. InternalLogsConnector – pull application log entries (demo mode)
4. WarehouseConnector  – bulk upsert canonical records (demo mode)

All return simulated results in demo mode.
"""

from __future__ import annotations

import logging
import random
import uuid
from dataclasses import dataclass, field

from app.services.data_aggregation.config import (
    GITHUB_TOKEN,
    STRIPE_SECRET_KEY,
    INTERNAL_LOGS_URL,
)

logger = logging.getLogger(__name__)


@dataclass
class ConnectorResult:
    success: bool
    records: list[dict] = field(default_factory=list)
    error_message: str | None = None
    records_affected: int = 0


# ── GitHub Connector ─────────────────────────────────────────────

class GitHubConnector:
    """GitHub API client (demo/simulated)."""

    @staticmethod
    def pull_events(since: str | None = None) -> ConnectorResult:
        try:
            if GITHUB_TOKEN == "gh_demo_token":
                if random.random() < 0.08:
                    return ConnectorResult(
                        success=False,
                        error_message="GitHub API rate limit exceeded — 403 Forbidden",
                    )
                return ConnectorResult(
                    success=True,
                    records=[
                        {"id": "evt_gh_001", "type": "PushEvent", "repo": "synapseops/core",
                         "actor": "dev-alice", "created_at": "2026-02-19T06:00:00Z",
                         "payload": {"commits": 3, "ref": "refs/heads/main"}},
                        {"id": "evt_gh_002", "type": "PullRequestEvent", "repo": "synapseops/core",
                         "actor": "dev-bob", "created_at": "2026-02-19T07:30:00Z",
                         "payload": {"action": "opened", "number": 142, "title": "Add caching layer"}},
                        {"id": "evt_gh_003", "type": "IssuesEvent", "repo": "synapseops/docs",
                         "actor": "dev-carol", "created_at": "2026-02-19T08:15:00Z",
                         "payload": {"action": "closed", "number": 87, "title": "Fix typo in README"}},
                        {"id": "evt_gh_004", "type": "PushEvent", "repo": "synapseops/frontend",
                         "actor": "dev-dave", "created_at": "2026-02-19T09:00:00Z",
                         "payload": {"commits": 1, "ref": "refs/heads/feature/dark-mode"}},
                    ],
                )
            return ConnectorResult(success=False, error_message="Live GitHub not configured")
        except Exception as exc:
            logger.exception("GitHub pull_events failed")
            return ConnectorResult(success=False, error_message=str(exc))


# ── Stripe Connector ─────────────────────────────────────────────

class StripeConnector:
    """Stripe API client (demo/simulated)."""

    @staticmethod
    def pull_transactions(since: str | None = None) -> ConnectorResult:
        try:
            if STRIPE_SECRET_KEY == "sk_demo_key":
                if random.random() < 0.10:
                    return ConnectorResult(
                        success=False,
                        error_message="Stripe API timeout — connection reset",
                    )
                return ConnectorResult(
                    success=True,
                    records=[
                        {"id": "ch_3Qa1b2c3", "type": "charge", "amount": 9900, "currency": "usd",
                         "status": "succeeded", "customer": "cus_Alice", "created": 1708300800},
                        {"id": "ch_4Rb2c3d4", "type": "charge", "amount": 14900, "currency": "usd",
                         "status": "succeeded", "customer": "cus_Bob", "created": 1708304400},
                        {"id": "re_5Sc3d4e5", "type": "refund", "amount": 4900, "currency": "usd",
                         "status": "succeeded", "charge": "ch_old001", "created": 1708308000},
                        {"id": "ch_6Td4e5f6", "type": "charge", "amount": 29900, "currency": "usd",
                         "status": "failed", "customer": "cus_Carol", "created": 1708311600},
                        {"id": "ch_7Ue5f6g7", "type": "charge", "amount": 5900, "currency": "usd",
                         "status": "succeeded", "customer": "cus_Dave", "created": 1708315200},
                    ],
                )
            return ConnectorResult(success=False, error_message="Live Stripe not configured")
        except Exception as exc:
            logger.exception("Stripe pull_transactions failed")
            return ConnectorResult(success=False, error_message=str(exc))


# ── Internal Logs Connector ──────────────────────────────────────

class InternalLogsConnector:
    """Internal logging/ELK connector (demo/simulated)."""

    @staticmethod
    def pull_logs(since: str | None = None) -> ConnectorResult:
        try:
            if INTERNAL_LOGS_URL == "http://logs.internal:9200":
                if random.random() < 0.05:
                    return ConnectorResult(
                        success=False,
                        error_message="Elasticsearch cluster unavailable — 503",
                    )
                return ConnectorResult(
                    success=True,
                    records=[
                        {"id": "log_001", "level": "ERROR", "service": "auth-service",
                         "message": "JWT validation failed for user u_123", "timestamp": "2026-02-19T06:12:00Z"},
                        {"id": "log_002", "level": "WARN", "service": "payment-service",
                         "message": "Retry #2 for settlement stl_abc", "timestamp": "2026-02-19T06:45:00Z"},
                        {"id": "log_003", "level": "INFO", "service": "api-gateway",
                         "message": "Rate limit threshold at 85%", "timestamp": "2026-02-19T07:00:00Z"},
                        {"id": "log_004", "level": "ERROR", "service": "notification-service",
                         "message": "Slack webhook returned 429", "timestamp": "2026-02-19T07:30:00Z"},
                        {"id": "log_005", "level": "INFO", "service": "crm-sync",
                         "message": "Batch sync completed: 142 records", "timestamp": "2026-02-19T08:00:00Z"},
                        {"id": "log_006", "level": "DEBUG", "service": "api-gateway",
                         "message": "Health check OK", "timestamp": "2026-02-19T08:30:00Z"},
                    ],
                )
            return ConnectorResult(success=False, error_message="Live ELK not configured")
        except Exception as exc:
            logger.exception("InternalLogs pull_logs failed")
            return ConnectorResult(success=False, error_message=str(exc))


# ── Warehouse Connector ──────────────────────────────────────────

class WarehouseConnector:
    """Simulated data warehouse bulk upsert connector."""

    @staticmethod
    def bulk_upsert(records: list[dict]) -> ConnectorResult:
        try:
            if random.random() < 0.05:
                return ConnectorResult(
                    success=False,
                    error_message="Warehouse connection pool exhausted",
                )
            return ConnectorResult(
                success=True,
                records_affected=len(records),
            )
        except Exception as exc:
            logger.exception("Warehouse bulk_upsert failed")
            return ConnectorResult(success=False, error_message=str(exc))


def get_source_connector(source_type: str):
    """Return the appropriate connector class based on source type."""
    connectors = {
        "github": GitHubConnector,
        "stripe": StripeConnector,
        "internal_logs": InternalLogsConnector,
    }
    connector = connectors.get(source_type)
    if not connector:
        raise ValueError(f"Unsupported source type: {source_type}")
    return connector
