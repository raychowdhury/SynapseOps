"""
CRM Automation service configuration.
Single config module – all env vars for the CRM automation sub-product live here.
"""

import os

# ── Salesforce settings ──────────────────────────────────────────
SALESFORCE_CLIENT_ID: str = os.getenv("SALESFORCE_CLIENT_ID", "sf_demo_client_id")
SALESFORCE_CLIENT_SECRET: str = os.getenv("SALESFORCE_CLIENT_SECRET", "sf_demo_client_secret")
SALESFORCE_INSTANCE_URL: str = os.getenv("SALESFORCE_INSTANCE_URL", "https://demo.salesforce.com")

# ── HubSpot settings ────────────────────────────────────────────
HUBSPOT_API_KEY: str = os.getenv("HUBSPOT_API_KEY", "hs_demo_api_key")
HUBSPOT_BASE_URL: str = os.getenv("HUBSPOT_BASE_URL", "https://api.hubapi.com")

# ── Worker / retry settings ─────────────────────────────────────
CRM_MAX_RETRIES: int = int(os.getenv("CRM_MAX_RETRIES", "3"))
CRM_BACKOFF_BASE: float = float(os.getenv("CRM_BACKOFF_BASE", "2.0"))

# ── Batch window ─────────────────────────────────────────────────
CRM_BATCH_SIZE: int = int(os.getenv("CRM_BATCH_SIZE", "50"))
