"""
Platform connectors for SaaS notification dispatch.

Each connector implements a `send()` method that returns a `DispatchResult`.
Connectors are stateless – credentials come from the Channel row or config module.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import requests

logger = logging.getLogger(__name__)


@dataclass
class DispatchResult:
    success: bool
    error_message: str | None = None


class SlackConnector:
    """Send notifications via Slack Incoming Webhooks."""

    @staticmethod
    def send(webhook_url: str, payload: dict) -> DispatchResult:
        try:
            body = {
                "text": f"*{payload.get('title', '')}*\n{payload.get('body', '')}",
            }
            resp = requests.post(webhook_url, json=body, timeout=10)
            if resp.status_code == 200 and resp.text == "ok":
                return DispatchResult(success=True)
            return DispatchResult(success=False, error_message=f"Slack {resp.status_code}: {resp.text[:200]}")
        except requests.RequestException as exc:
            logger.exception("Slack dispatch failed")
            return DispatchResult(success=False, error_message=str(exc))


class TeamsConnector:
    """Send notifications via Microsoft Teams Incoming Webhooks."""

    @staticmethod
    def send(webhook_url: str, payload: dict) -> DispatchResult:
        try:
            body = {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "summary": payload.get("title", "Notification"),
                "themeColor": "0076D7",
                "title": payload.get("title", ""),
                "sections": [
                    {
                        "activityTitle": payload.get("title", ""),
                        "text": payload.get("body", ""),
                    }
                ],
            }
            resp = requests.post(webhook_url, json=body, timeout=10)
            if resp.status_code == 200:
                return DispatchResult(success=True)
            return DispatchResult(success=False, error_message=f"Teams {resp.status_code}: {resp.text[:200]}")
        except requests.RequestException as exc:
            logger.exception("Teams dispatch failed")
            return DispatchResult(success=False, error_message=str(exc))


class SalesforceConnector:
    """Send notifications via Salesforce REST API (Chatter post)."""

    @staticmethod
    def send(instance_url: str, api_token: str, payload: dict) -> DispatchResult:
        try:
            url = f"{instance_url}/services/data/v58.0/chatter/feed-elements"
            headers = {
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            }
            body = {
                "feedElementType": "FeedItem",
                "subjectId": "me",
                "body": {
                    "messageSegments": [
                        {"type": "Text", "text": f"{payload.get('title', '')}: {payload.get('body', '')}"}
                    ]
                },
            }
            resp = requests.post(url, json=body, headers=headers, timeout=15)
            if resp.status_code in (200, 201):
                return DispatchResult(success=True)
            return DispatchResult(success=False, error_message=f"Salesforce {resp.status_code}: {resp.text[:200]}")
        except requests.RequestException as exc:
            logger.exception("Salesforce dispatch failed")
            return DispatchResult(success=False, error_message=str(exc))


# ── Connector registry ───────────────────────────────────────────

CONNECTORS = {
    "slack": SlackConnector,
    "teams": TeamsConnector,
    "salesforce": SalesforceConnector,
}


def get_connector(platform: str):
    """Return the connector class for a given platform."""
    connector = CONNECTORS.get(platform.lower())
    if not connector:
        raise ValueError(f"Unsupported platform: {platform}")
    return connector
