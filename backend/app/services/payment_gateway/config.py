"""
Payment Gateway service configuration.
Single config module – all env vars for the payment gateway sub-product live here.
"""

import os

# ── Stripe settings ───────────────────────────────────────────────
STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_test_demo_secret")

# ── Finance API settings ─────────────────────────────────────────
FINANCE_API_BASE_URL: str = os.getenv("FINANCE_API_BASE_URL", "https://finance.internal.example.com")
FINANCE_API_KEY: str = os.getenv("FINANCE_API_KEY", "fin_demo_key")

# ── Circuit breaker settings ─────────────────────────────────────
CB_FAILURE_THRESHOLD: int = int(os.getenv("PG_CB_FAILURE_THRESHOLD", "5"))
CB_RECOVERY_TIMEOUT: float = float(os.getenv("PG_CB_RECOVERY_TIMEOUT", "30.0"))

# ── Worker / retry settings ─────────────────────────────────────
MAX_SETTLEMENT_RETRIES: int = int(os.getenv("PG_MAX_RETRIES", "3"))
BACKOFF_BASE_SECONDS: float = float(os.getenv("PG_BACKOFF_BASE", "2.0"))

# ── Rate-limit settings ─────────────────────────────────────────
RATE_LIMIT_WEBHOOKS: str = os.getenv("PG_RATE_LIMIT_WEBHOOKS", "60/minute")
