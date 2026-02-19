"""
Tests for the Data Aggregation service.

1. Sources endpoint – returns configured data sources
2. Runs endpoint – returns ingestion runs
3. Warehouse endpoint – returns canonical records
4. Events endpoint – returns aggregation events
5. Stats endpoint – returns aggregated stats structure
6. Dead letter endpoint – returns dead-letter entries
7. Ingestion trigger – enqueues an ingestion run
8. Schema validation – Pydantic schemas validate correctly
"""

import uuid

import pytest
import httpx
from pydantic import ValidationError

from app.main import app
from app.database import SessionLocal
from app.services.data_aggregation.seed import seed_data_aggregation
from app.services.data_aggregation.schemas import (
    IngestionTriggerRequest,
    AggStatsOut,
)
from app.services.data_aggregation.logic import (
    normalize_github,
    normalize_stripe,
    normalize_logs,
    merge_and_deduplicate,
)


# ── Fixtures ──────────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def seed_agg_data():
    """Ensure Data Aggregation demo data exists before tests run."""
    db = SessionLocal()
    try:
        seed_data_aggregation(db)
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

async def _get_source_id(client, source_type: str = "github") -> str:
    """Return the ID of a data source by type."""
    sources = (await client.get("/aggregation/sources")).json()
    src = next(s for s in sources if s["source_type"] == source_type)
    return src["id"]


# ── 1. Sources endpoint ─────────────────────────────────────────

@pytest.mark.anyio
async def test_sources_endpoint(client):
    """GET /aggregation/sources returns a list with 3 sources."""
    resp = await client.get("/aggregation/sources")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    source_types = {s["source_type"] for s in data}
    assert "github" in source_types
    assert "stripe" in source_types
    assert "internal_logs" in source_types


# ── 2. Runs endpoint ────────────────────────────────────────────

@pytest.mark.anyio
async def test_runs_endpoint(client):
    """GET /aggregation/runs returns seeded runs."""
    resp = await client.get("/aggregation/runs")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 6


@pytest.mark.anyio
async def test_runs_filter_by_status(client):
    """GET /aggregation/runs?status=completed filters correctly."""
    resp = await client.get("/aggregation/runs?status=completed")
    assert resp.status_code == 200
    data = resp.json()
    assert all(r["status"] == "completed" for r in data)


# ── 3. Warehouse endpoint ───────────────────────────────────────

@pytest.mark.anyio
async def test_warehouse_endpoint(client):
    """GET /aggregation/warehouse returns canonical records."""
    resp = await client.get("/aggregation/warehouse")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 15


@pytest.mark.anyio
async def test_warehouse_filter_by_source(client):
    """GET /aggregation/warehouse?source_type=github filters correctly."""
    resp = await client.get("/aggregation/warehouse?source_type=github")
    assert resp.status_code == 200
    data = resp.json()
    assert all(r["source_type"] == "github" for r in data)


@pytest.mark.anyio
async def test_warehouse_filter_by_entity_type(client):
    """GET /aggregation/warehouse?entity_type=transaction filters correctly."""
    resp = await client.get("/aggregation/warehouse?entity_type=transaction")
    assert resp.status_code == 200
    data = resp.json()
    assert all(r["entity_type"] == "transaction" for r in data)


# ── 4. Events endpoint ──────────────────────────────────────────

@pytest.mark.anyio
async def test_events_endpoint(client):
    """GET /aggregation/events returns a list."""
    resp = await client.get("/aggregation/events")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.anyio
async def test_events_filter_by_status(client):
    """GET /aggregation/events?status=completed returns only completed."""
    resp = await client.get("/aggregation/events?status=completed")
    assert resp.status_code == 200
    data = resp.json()
    assert all(e["status"] == "completed" for e in data)


# ── 5. Stats endpoint ───────────────────────────────────────────

@pytest.mark.anyio
async def test_stats_endpoint(client):
    """GET /aggregation/stats returns all expected fields."""
    resp = await client.get("/aggregation/stats")
    assert resp.status_code == 200
    body = resp.json()

    expected_fields = [
        "total_sources", "active_sources", "total_runs", "completed_runs",
        "failed_runs", "total_records_ingested", "total_records_upserted",
        "total_warehouse_records", "avg_latency_ms", "total_events",
        "pending_events", "dead_letter_count",
    ]
    for field in expected_fields:
        assert field in body, f"Missing field: {field}"

    assert body["total_sources"] >= 3
    assert body["active_sources"] >= 3
    assert body["total_runs"] >= 6


# ── 6. Dead letter endpoint ─────────────────────────────────────

@pytest.mark.anyio
async def test_dead_letter_endpoint(client):
    """GET /aggregation/dead-letter returns a list."""
    resp = await client.get("/aggregation/dead-letter")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1


# ── 7. Ingestion trigger ────────────────────────────────────────

@pytest.mark.anyio
async def test_trigger_ingestion(client):
    """POST /aggregation/ingest/trigger enqueues an ingestion run."""
    source_id = await _get_source_id(client, "github")
    resp = await client.post("/aggregation/ingest/trigger", json={
        "source_id": source_id,
    })
    assert resp.status_code == 202
    body = resp.json()
    assert "run_id" in body
    assert "event_id" in body
    assert "message" in body


@pytest.mark.anyio
async def test_trigger_ingestion_invalid_source(client):
    """POST /aggregation/ingest/trigger with invalid source → 404."""
    resp = await client.post("/aggregation/ingest/trigger", json={
        "source_id": "nonexistent-source",
    })
    assert resp.status_code == 404


# ── 8. Schema validation ────────────────────────────────────────

def test_valid_ingestion_trigger():
    """Valid trigger payload passes schema validation."""
    payload = IngestionTriggerRequest(source_id="src-123")
    assert payload.source_id == "src-123"


def test_trigger_rejects_empty_source():
    """Empty source_id is rejected."""
    with pytest.raises(ValidationError):
        IngestionTriggerRequest(source_id="")


# ── 9. Normalization logic ──────────────────────────────────────

def test_normalize_github():
    """GitHub events are normalized to canonical format."""
    raw = {"id": "gh1", "type": "PushEvent", "repo": "org/repo",
           "actor": "alice", "created_at": "2026-01-01T00:00:00Z",
           "payload": {"commits": 5, "ref": "refs/heads/main"}}
    result = normalize_github(raw)
    assert result["source"] == "github"
    assert result["entity_type"] == "activity"
    assert result["external_id"] == "gh1"
    assert "5 commit" in result["action"]


def test_normalize_stripe():
    """Stripe transactions are normalized to canonical format."""
    raw = {"id": "ch_123", "type": "charge", "amount": 9900,
           "currency": "usd", "status": "succeeded", "customer": "cus_A",
           "created": 1708300800}
    result = normalize_stripe(raw)
    assert result["source"] == "stripe"
    assert result["entity_type"] == "transaction"
    assert "99.00" in result["action"]


def test_normalize_logs():
    """Internal logs are normalized to canonical format."""
    raw = {"id": "log1", "level": "ERROR", "service": "auth-svc",
           "message": "Token expired", "timestamp": "2026-01-01T00:00:00Z"}
    result = normalize_logs(raw)
    assert result["source"] == "internal_logs"
    assert result["entity_type"] == "log_entry"
    assert result["action"] == "Token expired"


def test_merge_and_deduplicate():
    """Deduplication by composite key works correctly."""
    records = [
        {"source": "github", "entity_type": "activity", "external_id": "1", "data": "old"},
        {"source": "github", "entity_type": "activity", "external_id": "1", "data": "new"},
        {"source": "stripe", "entity_type": "transaction", "external_id": "1", "data": "stripe"},
    ]
    result = merge_and_deduplicate(records)
    assert len(result) == 2  # Deduped github + stripe
    github_rec = next(r for r in result if r["source"] == "github")
    assert github_rec["data"] == "new"  # Last-write wins
