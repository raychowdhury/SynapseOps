"""
CRM Automation connectors.

1. SalesforceConnector – push/pull leads via Salesforce REST API (demo mode).
2. HubSpotConnector   – push/pull contacts via HubSpot API (demo mode).

Both return simulated results in demo mode to avoid requiring live API keys.
"""

from __future__ import annotations

import logging
import random
import uuid
from dataclasses import dataclass

from app.services.crm_automation.config import (
    SALESFORCE_CLIENT_ID,
    SALESFORCE_INSTANCE_URL,
    HUBSPOT_API_KEY,
    HUBSPOT_BASE_URL,
)

logger = logging.getLogger(__name__)


@dataclass
class ConnectorResult:
    """Standardised result from any CRM connector call."""
    success: bool
    remote_id: str | None = None
    records: list[dict] | None = None
    error_message: str | None = None


# ── Salesforce Connector ─────────────────────────────────────────

class SalesforceConnector:
    """Salesforce REST API client (demo/simulated)."""

    @staticmethod
    def push_contact(payload: dict) -> ConnectorResult:
        """Push a contact/lead record to Salesforce."""
        try:
            # Demo mode – simulate API call
            if SALESFORCE_CLIENT_ID == "sf_demo_client_id":
                if random.random() < 0.15:
                    return ConnectorResult(
                        success=False,
                        error_message="Salesforce API timeout – INVALID_SESSION_ID",
                    )
                return ConnectorResult(
                    success=True,
                    remote_id=f"003{uuid.uuid4().hex[:15].upper()}",
                )

            # Real implementation would use requests + OAuth2 here
            return ConnectorResult(success=False, error_message="Live Salesforce not configured")
        except Exception as exc:
            logger.exception("Salesforce push_contact failed")
            return ConnectorResult(success=False, error_message=str(exc))

    @staticmethod
    def pull_leads(since: str | None = None) -> ConnectorResult:
        """Pull lead records from Salesforce since a given timestamp."""
        try:
            if SALESFORCE_CLIENT_ID == "sf_demo_client_id":
                return ConnectorResult(
                    success=True,
                    records=[
                        {"Id": "00Q1234567890AB", "FirstName": "Jane", "LastName": "Doe",
                         "Email": "jane.doe@acme.com", "Company": "Acme Corp"},
                        {"Id": "00Q1234567890CD", "FirstName": "John", "LastName": "Smith",
                         "Email": "john.smith@globex.io", "Company": "Globex Inc"},
                    ],
                )
            return ConnectorResult(success=False, error_message="Live Salesforce not configured")
        except Exception as exc:
            logger.exception("Salesforce pull_leads failed")
            return ConnectorResult(success=False, error_message=str(exc))


# ── HubSpot Connector ───────────────────────────────────────────

class HubSpotConnector:
    """HubSpot CRM API client (demo/simulated)."""

    @staticmethod
    def push_contact(payload: dict) -> ConnectorResult:
        """Create or update a contact in HubSpot."""
        try:
            if HUBSPOT_API_KEY == "hs_demo_api_key":
                if random.random() < 0.10:
                    return ConnectorResult(
                        success=False,
                        error_message="HubSpot rate limit exceeded – 429 Too Many Requests",
                    )
                return ConnectorResult(
                    success=True,
                    remote_id=f"hs_{uuid.uuid4().hex[:12]}",
                )
            return ConnectorResult(success=False, error_message="Live HubSpot not configured")
        except Exception as exc:
            logger.exception("HubSpot push_contact failed")
            return ConnectorResult(success=False, error_message=str(exc))

    @staticmethod
    def pull_contacts(since: str | None = None) -> ConnectorResult:
        """Pull contact records from HubSpot since a given timestamp."""
        try:
            if HUBSPOT_API_KEY == "hs_demo_api_key":
                return ConnectorResult(
                    success=True,
                    records=[
                        {"vid": 101, "firstname": "Alice", "lastname": "Wong",
                         "email": "alice@startup.io", "company": "Startup Inc"},
                        {"vid": 102, "firstname": "Bob", "lastname": "Chen",
                         "email": "bob.chen@enterprise.co", "company": "Enterprise Co"},
                    ],
                )
            return ConnectorResult(success=False, error_message="Live HubSpot not configured")
        except Exception as exc:
            logger.exception("HubSpot pull_contacts failed")
            return ConnectorResult(success=False, error_message=str(exc))


def get_connector(platform_type: str):
    """Return the appropriate connector class based on platform type."""
    connectors = {
        "salesforce": SalesforceConnector,
        "hubspot": HubSpotConnector,
    }
    connector = connectors.get(platform_type)
    if not connector:
        raise ValueError(f"Unsupported platform type: {platform_type}")
    return connector
