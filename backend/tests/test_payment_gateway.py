"""
Tests for the Payment Gateway Integration service.

1. Auth guard – protected routes reject unauthenticated requests
2. Idempotency – duplicate Stripe events are rejected (409)
3. Schema validation – StripeWebhookPayload validates correctly
4. Stats endpoint – returns correct aggregated structure
"""

import uuid
import json

import pytest
import httpx
from pydantic import ValidationError

from app.main import app
from app.services.payment_gateway.schemas import StripeWebhookPayload, GatewayStatsOut


# ── Fixtures ──────────────────────────────────────────────────────

@pytest.fixture
def asgi_transport():
    return httpx.ASGITransport(app=app)


@pytest.fixture
async def client(asgi_transport):
    async with httpx.AsyncClient(transport=asgi_transport, base_url="http://testserver") as c:
        yield c


# ── 1. Auth guard tests ──────────────────────────────────────────

@pytest.mark.anyio
async def test_replay_requires_auth(client):
    """POST /payments/settlements/{id}/replay without API key → 401."""
    resp = await client.post("/payments/settlements/fake-id/replay", json={})
    assert resp.status_code == 401
    body = resp.json()
    assert body["error"]["code"] == "unauthorized"


# ── 2. Idempotency tests ────────────────────────────────────────

@pytest.mark.anyio
async def test_duplicate_stripe_event_rejected(client):
    """Posting the same Stripe event twice → 409 duplicate_event."""
    unique_id = f"evt_test_{uuid.uuid4().hex[:8]}"
    event_body = json.dumps({
        "id": unique_id,
        "type": "payment_intent.succeeded",
        "created": 1700000000,
        "data": {"object": {"amount": 5000, "currency": "usd"}},
    })

    # First post should succeed
    resp1 = await client.post(
        "/payments/webhooks/stripe",
        content=event_body,
        headers={"Content-Type": "application/json"},
    )
    assert resp1.status_code == 201

    # Duplicate should be rejected
    resp2 = await client.post(
        "/payments/webhooks/stripe",
        content=event_body,
        headers={"Content-Type": "application/json"},
    )
    assert resp2.status_code == 409
    body = resp2.json()
    assert body["error"]["code"] == "duplicate_event"


# ── 3. Schema validation tests ──────────────────────────────────

def test_valid_stripe_webhook_payload():
    """Valid payload passes schema validation."""
    payload = StripeWebhookPayload(
        id="evt_test_123",
        type="payment_intent.succeeded",
        data={"object": {"amount": 5000}},
        created=1700000000,
    )
    assert payload.id == "evt_test_123"
    assert payload.type == "payment_intent.succeeded"


def test_stripe_payload_rejects_empty_id():
    """Empty event ID is rejected."""
    with pytest.raises(ValidationError):
        StripeWebhookPayload(id="", type="payment_intent.succeeded")


def test_stripe_payload_rejects_empty_type():
    """Empty event type is rejected."""
    with pytest.raises(ValidationError):
        StripeWebhookPayload(id="evt_123", type="")


def test_stripe_payload_default_data():
    """Data defaults to empty dict when omitted."""
    payload = StripeWebhookPayload(id="evt_123", type="charge.captured")
    assert payload.data == {}
    assert payload.created == 0


# ── 4. Stats endpoint tests ─────────────────────────────────────

@pytest.mark.anyio
async def test_stats_endpoint_returns_correct_structure(client):
    """GET /payments/settlements/stats returns all expected fields."""
    resp = await client.get("/payments/settlements/stats")
    assert resp.status_code == 200
    body = resp.json()

    expected_fields = [
        "total_events", "total_settlements", "settled_count",
        "settled_amount_cents", "pending_count", "pending_amount_cents",
        "failed_count", "dead_letter_count", "replay_attempts",
        "replay_successes", "replay_success_rate", "circuit_breaker_status",
    ]
    for field in expected_fields:
        assert field in body, f"Missing field: {field}"


@pytest.mark.anyio
async def test_events_endpoint(client):
    """GET /payments/events returns a list."""
    resp = await client.get("/payments/events")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.anyio
async def test_settlements_endpoint(client):
    """GET /payments/settlements returns a list."""
    resp = await client.get("/payments/settlements")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.anyio
async def test_dead_letter_endpoint(client):
    """GET /payments/dead-letter returns a list."""
    resp = await client.get("/payments/dead-letter")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── 5. Webhook validation tests ─────────────────────────────────

@pytest.mark.anyio
async def test_invalid_webhook_body_rejected(client):
    """Malformed JSON body → 400."""
    resp = await client.post(
        "/payments/webhooks/stripe",
        content=b"not json",
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400


@pytest.mark.anyio
async def test_webhook_missing_id_rejected(client):
    """Missing event ID → 400."""
    resp = await client.post(
        "/payments/webhooks/stripe",
        content=json.dumps({"type": "payment_intent.succeeded"}).encode(),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400
