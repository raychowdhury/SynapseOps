"""
Mandatory tests for the SaaS Notifications & Workflows service.

1. Auth guard – protected routes reject unauthenticated requests
2. Notification JSON validation – shared schema rejects bad payloads
3. Workflow duplicate heuristic – same name + trigger_source blocked
"""

import uuid

import pytest
import httpx
from pydantic import ValidationError

from app.main import app
from app.services.notifications.schemas import NotificationPayload


# ── Fixtures ──────────────────────────────────────────────────────

@pytest.fixture
def asgi_transport():
    return httpx.ASGITransport(app=app)


@pytest.fixture
async def client(asgi_transport):
    async with httpx.AsyncClient(transport=asgi_transport, base_url="http://testserver") as c:
        yield c


# ── 1. Auth guard test ────────────────────────────────────────────

@pytest.mark.anyio
async def test_create_channel_requires_auth(client):
    """POST /notifications/channels without API key → 401."""
    resp = await client.post(
        "/notifications/channels",
        json={"platform": "slack", "name": "Test Channel"},
    )
    assert resp.status_code == 401
    body = resp.json()
    assert body["error"]["code"] == "unauthorized"


@pytest.mark.anyio
async def test_create_workflow_requires_auth(client):
    """POST /notifications/workflows without API key → 401."""
    resp = await client.post(
        "/notifications/workflows",
        json={
            "name": "Test Workflow",
            "trigger_event": "new_lead",
            "trigger_source": "salesforce",
        },
    )
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_send_notification_requires_auth(client):
    """POST /notifications/send without API key → 401."""
    resp = await client.post(
        "/notifications/send",
        json={
            "channel_id": "fake-id",
            "payload": {"title": "Hi", "body": "Test"},
        },
    )
    assert resp.status_code == 401


# ── 2. Notification JSON validation ──────────────────────────────

def test_valid_notification_payload():
    """Valid payload passes schema validation."""
    payload = NotificationPayload(title="Alert", body="Something happened", priority="high")
    assert payload.title == "Alert"
    assert payload.priority == "high"


def test_notification_payload_rejects_empty_title():
    """Empty title is rejected."""
    with pytest.raises(ValidationError):
        NotificationPayload(title="", body="Something happened")


def test_notification_payload_rejects_invalid_priority():
    """Invalid priority value is rejected."""
    with pytest.raises(ValidationError):
        NotificationPayload(title="Alert", body="Something happened", priority="critical")


def test_notification_payload_default_priority():
    """Priority defaults to 'normal' when omitted."""
    payload = NotificationPayload(title="Alert", body="Something happened")
    assert payload.priority == "normal"


def test_notification_payload_rejects_missing_body():
    """Missing body is rejected."""
    with pytest.raises(ValidationError):
        NotificationPayload(title="Alert", body="")


# ── 3. Workflow duplicate heuristic ──────────────────────────────

@pytest.mark.anyio
async def test_duplicate_workflow_rejected(client):
    """Creating two workflows with same name + trigger_source → 409."""
    headers = {"x-api-key": "change-me-in-production"}
    unique_name = f"Lead Alert {uuid.uuid4().hex[:8]}"
    workflow_data = {
        "name": unique_name,
        "trigger_event": "new_lead",
        "trigger_source": "salesforce",
        "steps": [],
    }

    # First creation should succeed
    resp1 = await client.post("/notifications/workflows", json=workflow_data, headers=headers)
    assert resp1.status_code == 201

    # Duplicate should be rejected
    resp2 = await client.post("/notifications/workflows", json=workflow_data, headers=headers)
    assert resp2.status_code == 409
    body = resp2.json()
    assert body["error"]["code"] == "duplicate_workflow"


@pytest.mark.anyio
async def test_same_name_different_source_allowed(client):
    """Same workflow name with different trigger_source is allowed."""
    headers = {"x-api-key": "change-me-in-production"}
    unique_name = f"Deal Notification {uuid.uuid4().hex[:8]}"

    resp1 = await client.post(
        "/notifications/workflows",
        json={
            "name": unique_name,
            "trigger_event": "deal_closed",
            "trigger_source": "salesforce",
            "steps": [],
        },
        headers=headers,
    )
    assert resp1.status_code == 201

    resp2 = await client.post(
        "/notifications/workflows",
        json={
            "name": unique_name,
            "trigger_event": "deal_closed",
            "trigger_source": "webhook",
            "steps": [],
        },
        headers=headers,
    )
    assert resp2.status_code == 201
