"""
Tests for the CRM Automation service.

1. Platforms endpoint – returns a list of configured platforms
2. Mappings CRUD – create, list, delete field mappings
3. Sync states – returns sync status per platform
4. Events – returns sync event history
5. Stats – returns correct aggregated structure
6. Dead letter – returns dead-letter entries
7. Sync trigger – enqueues a sync job
8. Schema validation – Pydantic schemas validate correctly
"""

import uuid

import pytest
import httpx
from pydantic import ValidationError

from app.main import app
from app.database import SessionLocal
from app.services.crm_automation.seed import seed_crm_automation
from app.services.crm_automation.schemas import (
    FieldMappingCreate,
    SyncTriggerRequest,
    CrmStatsOut,
)


# ── Fixtures ──────────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def seed_crm_data():
    """Ensure CRM demo data exists before tests run."""
    db = SessionLocal()
    try:
        seed_crm_automation(db)
    finally:
        db.close()


@pytest.fixture
def asgi_transport():
    return httpx.ASGITransport(app=app)


@pytest.fixture
async def client(asgi_transport):
    async with httpx.AsyncClient(transport=asgi_transport, base_url="http://testserver") as c:
        yield c


# ── Helpers ──────────────────────────────────────────────────────

async def _get_platform_ids(client):
    """Return (salesforce_id, hubspot_id)."""
    platforms = (await client.get("/crm/platforms")).json()
    src = next(p for p in platforms if p["platform_type"] == "salesforce")
    tgt = next(p for p in platforms if p["platform_type"] == "hubspot")
    return src["id"], tgt["id"]


# ── 1. Platforms endpoint ────────────────────────────────────────

@pytest.mark.anyio
async def test_platforms_endpoint(client):
    """GET /crm/platforms returns a list with Salesforce + HubSpot."""
    resp = await client.get("/crm/platforms")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2  # Salesforce + HubSpot
    platform_types = {p["platform_type"] for p in data}
    assert "salesforce" in platform_types
    assert "hubspot" in platform_types


# ── 2. Mappings CRUD ────────────────────────────────────────────

@pytest.mark.anyio
async def test_mappings_endpoint(client):
    """GET /crm/mappings returns seeded mappings."""
    resp = await client.get("/crm/mappings")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 6  # 6 seed mappings


@pytest.mark.anyio
async def test_create_mapping(client):
    """POST /crm/mappings creates a new mapping."""
    sf_id, hs_id = await _get_platform_ids(client)

    unique_field = f"CustomField_{uuid.uuid4().hex[:6]}"
    resp = await client.post("/crm/mappings", json={
        "source_platform_id": sf_id,
        "target_platform_id": hs_id,
        "source_object": "Lead",
        "target_object": "Contact",
        "source_field": unique_field,
        "target_field": f"hs_{unique_field.lower()}",
        "transform_rule": "direct",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["source_field"] == unique_field


@pytest.mark.anyio
async def test_create_duplicate_mapping_rejected(client):
    """POST /crm/mappings with duplicate → 409."""
    sf_id, hs_id = await _get_platform_ids(client)

    resp = await client.post("/crm/mappings", json={
        "source_platform_id": sf_id,
        "target_platform_id": hs_id,
        "source_object": "Lead",
        "target_object": "Contact",
        "source_field": "FirstName",
        "target_field": "firstname",
        "transform_rule": "direct",
    })
    assert resp.status_code == 409


@pytest.mark.anyio
async def test_delete_mapping(client):
    """DELETE /crm/mappings/{id} removes a mapping."""
    sf_id, hs_id = await _get_platform_ids(client)

    unique_field = f"TempField_{uuid.uuid4().hex[:6]}"
    create_resp = await client.post("/crm/mappings", json={
        "source_platform_id": sf_id,
        "target_platform_id": hs_id,
        "source_object": "Lead",
        "target_object": "Contact",
        "source_field": unique_field,
        "target_field": f"hs_{unique_field.lower()}",
    })
    mapping_id = create_resp.json()["id"]

    resp = await client.delete(f"/crm/mappings/{mapping_id}")
    assert resp.status_code == 204


@pytest.mark.anyio
async def test_delete_nonexistent_mapping(client):
    """DELETE /crm/mappings/{id} with fake ID → 404."""
    resp = await client.delete("/crm/mappings/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_create_mapping_invalid_platform(client):
    """POST /crm/mappings with invalid platform → 404."""
    resp = await client.post("/crm/mappings", json={
        "source_platform_id": "fake-platform-id",
        "target_platform_id": "fake-platform-id",
        "source_object": "Lead",
        "target_object": "Contact",
        "source_field": "Email",
        "target_field": "email",
    })
    assert resp.status_code == 404


# ── 3. Sync states ──────────────────────────────────────────────

@pytest.mark.anyio
async def test_sync_states_endpoint(client):
    """GET /crm/sync-states returns a list."""
    resp = await client.get("/crm/sync-states")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 4  # 2 platforms × 2 directions


# ── 4. Events endpoint ──────────────────────────────────────────

@pytest.mark.anyio
async def test_events_endpoint(client):
    """GET /crm/events returns a list."""
    resp = await client.get("/crm/events")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.anyio
async def test_events_filter_by_status(client):
    """GET /crm/events?status=synced filters correctly."""
    resp = await client.get("/crm/events?status=synced")
    assert resp.status_code == 200
    data = resp.json()
    assert all(e["status"] == "synced" for e in data)


# ── 5. Stats endpoint ───────────────────────────────────────────

@pytest.mark.anyio
async def test_stats_endpoint(client):
    """GET /crm/stats returns all expected fields."""
    resp = await client.get("/crm/stats")
    assert resp.status_code == 200
    body = resp.json()

    expected_fields = [
        "total_platforms", "total_mappings", "active_mappings",
        "total_events", "synced_count", "pending_count",
        "failed_count", "dead_letter_count", "total_records_synced",
    ]
    for field in expected_fields:
        assert field in body, f"Missing field: {field}"

    # Should have data from seed
    assert body["total_platforms"] >= 2
    assert body["total_mappings"] >= 6


# ── 6. Dead letter ──────────────────────────────────────────────

@pytest.mark.anyio
async def test_dead_letter_endpoint(client):
    """GET /crm/dead-letter returns a list."""
    resp = await client.get("/crm/dead-letter")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1  # 1 seed dead-letter


# ── 7. Sync trigger ─────────────────────────────────────────────

@pytest.mark.anyio
async def test_trigger_sync(client):
    """POST /crm/sync/trigger enqueues a sync job."""
    sf_id, hs_id = await _get_platform_ids(client)

    resp = await client.post("/crm/sync/trigger", json={
        "source_platform_id": sf_id,
        "target_platform_id": hs_id,
        "direction": "outbound",
    })
    assert resp.status_code == 202
    body = resp.json()
    assert "event_id" in body
    assert "message" in body


@pytest.mark.anyio
async def test_trigger_sync_invalid_platform(client):
    """POST /crm/sync/trigger with invalid platform → 404."""
    resp = await client.post("/crm/sync/trigger", json={
        "source_platform_id": "nonexistent",
        "target_platform_id": "also-nonexistent",
        "direction": "outbound",
    })
    assert resp.status_code == 404


# ── 8. Schema validation ────────────────────────────────────────

def test_valid_field_mapping_create():
    """Valid mapping payload passes schema validation."""
    payload = FieldMappingCreate(
        source_platform_id="p1",
        target_platform_id="p2",
        source_object="Lead",
        target_object="Contact",
        source_field="Email",
        target_field="email",
        transform_rule="lowercase",
    )
    assert payload.source_field == "Email"
    assert payload.transform_rule == "lowercase"


def test_mapping_rejects_empty_field():
    """Empty source_field is rejected."""
    with pytest.raises(ValidationError):
        FieldMappingCreate(
            source_platform_id="p1",
            target_platform_id="p2",
            source_object="Lead",
            target_object="Contact",
            source_field="",
            target_field="email",
        )


def test_sync_trigger_defaults():
    """Direction defaults to outbound."""
    req = SyncTriggerRequest(
        source_platform_id="p1",
        target_platform_id="p2",
    )
    assert req.direction == "outbound"
