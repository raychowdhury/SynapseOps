"""
Normalization transformer for the Data Aggregation service.

Merges raw payloads from multiple sources (GitHub, Stripe, internal logs)
into a single canonical JSON schema suitable for warehouse upsert.

Canonical schema:
{
    "source": "github" | "stripe" | "internal_logs",
    "entity_type": "activity" | "transaction" | "log_entry",
    "external_id": "<source-unique-id>",
    "timestamp": "<ISO-8601>",
    "actor": "<who>",
    "action": "<what>",
    "resource": "<target>",
    "metadata": { ... }
}
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


def normalize_github(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize a GitHub event into canonical format."""
    payload = raw.get("payload", {})
    event_type = raw.get("type", "UnknownEvent")

    # Derive human-readable action
    action_map = {
        "PushEvent": f"pushed {payload.get('commits', 0)} commit(s)",
        "PullRequestEvent": f"{payload.get('action', 'opened')} PR #{payload.get('number', '?')}",
        "IssuesEvent": f"{payload.get('action', 'opened')} issue #{payload.get('number', '?')}",
        "CreateEvent": f"created {payload.get('ref_type', 'branch')}",
        "DeleteEvent": f"deleted {payload.get('ref_type', 'branch')}",
        "WatchEvent": "starred repository",
        "ForkEvent": "forked repository",
    }

    return {
        "source": "github",
        "entity_type": "activity",
        "external_id": str(raw.get("id", "")),
        "timestamp": raw.get("created_at", datetime.now(timezone.utc).isoformat()),
        "actor": raw.get("actor", "unknown"),
        "action": action_map.get(event_type, event_type),
        "resource": raw.get("repo", "unknown/repo"),
        "metadata": {
            "event_type": event_type,
            "ref": payload.get("ref"),
            "title": payload.get("title"),
            **{k: v for k, v in payload.items() if k not in ("ref", "title")},
        },
    }


def normalize_stripe(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize a Stripe transaction into canonical format."""
    txn_type = raw.get("type", "charge")
    amount_cents = raw.get("amount", 0)
    currency = raw.get("currency", "usd").upper()
    amount_display = f"{amount_cents / 100:.2f} {currency}"

    # Convert Unix timestamp to ISO-8601
    created = raw.get("created")
    if isinstance(created, (int, float)):
        ts = datetime.fromtimestamp(created, tz=timezone.utc).isoformat()
    else:
        ts = datetime.now(timezone.utc).isoformat()

    actor = raw.get("customer") or raw.get("charge") or "unknown"

    return {
        "source": "stripe",
        "entity_type": "transaction",
        "external_id": str(raw.get("id", "")),
        "timestamp": ts,
        "actor": actor,
        "action": f"{txn_type} {amount_display}",
        "resource": f"{txn_type}/{raw.get('id', '')}",
        "metadata": {
            "type": txn_type,
            "amount": amount_cents,
            "currency": raw.get("currency", "usd"),
            "status": raw.get("status", "unknown"),
            "customer": raw.get("customer"),
        },
    }


def normalize_logs(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize an internal log entry into canonical format."""
    return {
        "source": "internal_logs",
        "entity_type": "log_entry",
        "external_id": str(raw.get("id", "")),
        "timestamp": raw.get("timestamp", datetime.now(timezone.utc).isoformat()),
        "actor": raw.get("service", "unknown-service"),
        "action": raw.get("message", ""),
        "resource": raw.get("service", "unknown-service"),
        "metadata": {
            "level": raw.get("level", "INFO"),
            "service": raw.get("service"),
            "raw_message": raw.get("message"),
        },
    }


# ── Dispatcher ───────────────────────────────────────────────────

_NORMALIZERS = {
    "github": normalize_github,
    "stripe": normalize_stripe,
    "internal_logs": normalize_logs,
}


def normalize(source_type: str, raw: dict[str, Any]) -> dict[str, Any]:
    """Dispatch to the appropriate normalizer based on source type."""
    normalizer = _NORMALIZERS.get(source_type)
    if not normalizer:
        raise ValueError(f"No normalizer for source type: {source_type}")
    return normalizer(raw)


def normalize_batch(source_type: str, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize a batch of raw records from a single source."""
    results = []
    for raw in records:
        try:
            results.append(normalize(source_type, raw))
        except Exception:
            logger.exception("Failed to normalize record from %s: %s", source_type, raw.get("id"))
    return results


def merge_and_deduplicate(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Deduplicate canonical records by (source, entity_type, external_id).
    Later records overwrite earlier ones (last-write-wins).
    """
    seen: dict[tuple[str, str, str], dict[str, Any]] = {}
    for rec in records:
        key = (rec["source"], rec["entity_type"], rec["external_id"])
        seen[key] = rec  # Last-write wins
    return list(seen.values())
