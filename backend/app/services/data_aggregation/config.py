"""
Data Aggregation service configuration.
All env vars for multi-source ingestion and warehouse operations live here.
"""

import os

# ── Source API settings ──────────────────────────────────────────
GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "gh_demo_token")
GITHUB_API_URL: str = os.getenv("GITHUB_API_URL", "https://api.github.com")

STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "sk_demo_key")
STRIPE_API_URL: str = os.getenv("STRIPE_API_URL", "https://api.stripe.com/v1")

INTERNAL_LOGS_URL: str = os.getenv("INTERNAL_LOGS_URL", "http://logs.internal:9200")
INTERNAL_LOGS_INDEX: str = os.getenv("INTERNAL_LOGS_INDEX", "app-logs-*")

# ── Warehouse settings ──────────────────────────────────────────
WAREHOUSE_DSN: str = os.getenv("WAREHOUSE_DSN", "sqlite:///./warehouse_demo.db")
WAREHOUSE_BATCH_SIZE: int = int(os.getenv("WAREHOUSE_BATCH_SIZE", "100"))

# ── Worker / retry settings ─────────────────────────────────────
AGG_MAX_RETRIES: int = int(os.getenv("AGG_MAX_RETRIES", "3"))
AGG_BACKOFF_BASE: float = float(os.getenv("AGG_BACKOFF_BASE", "2.0"))
