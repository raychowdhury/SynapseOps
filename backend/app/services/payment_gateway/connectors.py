"""
Payment Gateway connectors.

1. StripeWebhookConnector – verifies Stripe-Signature and parses inbound events.
2. FinanceAPIClient – outbound HTTP client with circuit-breaker protection.

Circuit breaker states: CLOSED → OPEN (after N failures) → HALF_OPEN (probe).
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from dataclasses import dataclass, field
from enum import Enum

import requests

from app.services.payment_gateway.config import (
    STRIPE_WEBHOOK_SECRET,
    FINANCE_API_BASE_URL,
    FINANCE_API_KEY,
    CB_FAILURE_THRESHOLD,
    CB_RECOVERY_TIMEOUT,
)

logger = logging.getLogger(__name__)


# ── Stripe Webhook Connector ─────────────────────────────────────

@dataclass
class WebhookVerifyResult:
    valid: bool
    event_id: str | None = None
    event_type: str | None = None
    data: dict | None = None
    error_message: str | None = None


class StripeWebhookConnector:
    """Verify and parse Stripe webhook payloads."""

    @staticmethod
    def verify_and_parse(
        raw_body: bytes,
        signature_header: str | None,
    ) -> WebhookVerifyResult:
        """
        Verify Stripe-Signature header and parse the event.

        In demo/dev mode (default secret), signature check is skipped
        to allow local testing without a real Stripe account.
        """
        try:
            import json
            payload = json.loads(raw_body)

            # Skip signature verification in demo mode
            if STRIPE_WEBHOOK_SECRET != "whsec_test_demo_secret" and signature_header:
                if not StripeWebhookConnector._verify_signature(
                    raw_body, signature_header, STRIPE_WEBHOOK_SECRET
                ):
                    return WebhookVerifyResult(valid=False, error_message="Invalid Stripe signature")

            event_id = payload.get("id", "")
            event_type = payload.get("type", "")
            data = payload.get("data", {})

            if not event_id or not event_type:
                return WebhookVerifyResult(valid=False, error_message="Missing id or type in event")

            return WebhookVerifyResult(
                valid=True,
                event_id=event_id,
                event_type=event_type,
                data=data,
            )
        except Exception as exc:
            logger.exception("Failed to parse Stripe webhook")
            return WebhookVerifyResult(valid=False, error_message=str(exc))

    @staticmethod
    def _verify_signature(raw_body: bytes, sig_header: str, secret: str) -> bool:
        """Verify Stripe webhook signature (v1 scheme)."""
        try:
            parts = dict(item.split("=", 1) for item in sig_header.split(","))
            timestamp = parts.get("t", "")
            expected_sig = parts.get("v1", "")

            signed_payload = f"{timestamp}.".encode() + raw_body
            computed = hmac.new(
                secret.encode(), signed_payload, hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(computed, expected_sig)
        except Exception:
            return False


# ── Circuit Breaker ──────────────────────────────────────────────

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreakerOpenError(Exception):
    """Raised when the circuit breaker is open and calls are rejected."""
    pass


@dataclass
class CircuitBreaker:
    """
    Simple circuit breaker implementation.

    CLOSED: Normal operation – calls pass through.
    OPEN: After `failure_threshold` consecutive failures, reject all calls
           for `recovery_timeout` seconds.
    HALF_OPEN: After timeout expires, allow one probe call.
               If it succeeds → CLOSED. If it fails → OPEN again.
    """
    failure_threshold: int = CB_FAILURE_THRESHOLD
    recovery_timeout: float = CB_RECOVERY_TIMEOUT
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure_time: float = 0.0

    def can_execute(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                logger.info("Circuit breaker → HALF_OPEN (probe allowed)")
                return True
            return False
        # HALF_OPEN – allow one probe
        return True

    def record_success(self) -> None:
        self.failure_count = 0
        if self.state != CircuitState.CLOSED:
            logger.info("Circuit breaker → CLOSED (success)")
        self.state = CircuitState.CLOSED

    def record_failure(self) -> None:
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(
                "Circuit breaker → OPEN after %d consecutive failures", self.failure_count
            )
        elif self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            logger.warning("Circuit breaker → OPEN (half-open probe failed)")

    @property
    def status_label(self) -> str:
        return self.state.value


# ── Finance API Client ───────────────────────────────────────────

@dataclass
class SettlementResult:
    success: bool
    finance_ref: str | None = None
    error_message: str | None = None


# Global circuit breaker instance (shared across requests)
_finance_circuit_breaker = CircuitBreaker()


def get_circuit_breaker() -> CircuitBreaker:
    """Return the global circuit breaker (for status reporting)."""
    return _finance_circuit_breaker


class FinanceAPIClient:
    """
    Outbound HTTP client for the downstream Finance API.

    Wraps all calls through a circuit breaker.
    """

    @staticmethod
    def post_settlement(
        amount_cents: int,
        currency: str,
        destination: str,
        reference_id: str,
    ) -> SettlementResult:
        cb = _finance_circuit_breaker

        if not cb.can_execute():
            return SettlementResult(
                success=False,
                error_message=f"Circuit breaker OPEN – calls rejected (recovery in {cb.recovery_timeout}s)",
            )

        try:
            resp = requests.post(
                f"{FINANCE_API_BASE_URL}/api/v1/settlements",
                json={
                    "amount_cents": amount_cents,
                    "currency": currency,
                    "destination": destination,
                    "reference_id": reference_id,
                },
                headers={
                    "Authorization": f"Bearer {FINANCE_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=15,
            )

            if resp.status_code in (200, 201):
                cb.record_success()
                data = resp.json()
                return SettlementResult(
                    success=True,
                    finance_ref=data.get("settlement_id", data.get("id", "")),
                )

            cb.record_failure()
            return SettlementResult(
                success=False,
                error_message=f"Finance API {resp.status_code}: {resp.text[:200]}",
            )
        except requests.RequestException as exc:
            cb.record_failure()
            logger.exception("Finance API call failed")
            return SettlementResult(success=False, error_message=str(exc))
