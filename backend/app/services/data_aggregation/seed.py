"""
Seed data for the Data Aggregation service.

Creates demo sources, ingestion runs, warehouse records, aggregation events,
and a dead-letter entry.
"""

import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.services.data_aggregation.models import (
    DataSource,
    IngestionRun,
    WarehouseRecord,
    AggEvent,
    DeadLetterAgg,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def seed_data_aggregation(db: Session) -> None:
    """Seed the data aggregation tables with demo data if empty."""
    existing = db.query(DataSource).first()
    if existing:
        return

    now = _utcnow()

    # ── Data Sources ─────────────────────────────────────────────
    gh_id = str(uuid.uuid4())
    st_id = str(uuid.uuid4())
    il_id = str(uuid.uuid4())

    github_src = DataSource(
        id=gh_id,
        name="github",
        label="GitHub — synapseops org",
        source_type="github",
        config={"org": "synapseops", "token": "gh_demo"},
        status="active",
        created_at=now - timedelta(days=45),
    )
    stripe_src = DataSource(
        id=st_id,
        name="stripe",
        label="Stripe — Production",
        source_type="stripe",
        config={"key": "sk_demo"},
        status="active",
        created_at=now - timedelta(days=40),
    )
    logs_src = DataSource(
        id=il_id,
        name="internal_logs",
        label="Internal Logs — ELK Stack",
        source_type="internal_logs",
        config={"url": "http://logs.internal:9200", "index": "app-logs-*"},
        status="active",
        created_at=now - timedelta(days=38),
    )
    db.add_all([github_src, stripe_src, logs_src])
    db.flush()

    # ── Ingestion Runs ──────────────────────────────────────────
    runs_data = [
        {"source_id": gh_id, "status": "completed", "ingested": 47, "upserted": 42,
         "latency": 1240.5, "offset_hours": -48},
        {"source_id": st_id, "status": "completed", "ingested": 128, "upserted": 115,
         "latency": 2180.3, "offset_hours": -36},
        {"source_id": il_id, "status": "completed", "ingested": 512, "upserted": 489,
         "latency": 890.7, "offset_hours": -24},
        {"source_id": gh_id, "status": "completed", "ingested": 35, "upserted": 33,
         "latency": 980.2, "offset_hours": -12},
        {"source_id": st_id, "status": "failed", "ingested": 0, "upserted": 0,
         "latency": 5045.0, "offset_hours": -6, "error": "Stripe API timeout — connection reset"},
        {"source_id": il_id, "status": "completed", "ingested": 287, "upserted": 274,
         "latency": 650.4, "offset_hours": -3},
    ]

    for rd in runs_data:
        started = now + timedelta(hours=rd["offset_hours"])
        completed = started + timedelta(milliseconds=rd["latency"]) if rd["status"] == "completed" else None
        run = IngestionRun(
            source_id=rd["source_id"],
            status=rd["status"],
            records_ingested=rd["ingested"],
            records_upserted=rd["upserted"],
            latency_ms=rd["latency"],
            error_message=rd.get("error"),
            started_at=started,
            completed_at=completed,
        )
        db.add(run)

    db.flush()

    # ── Warehouse Records ───────────────────────────────────────
    warehouse_data = [
        # GitHub activities
        {"source_type": "github", "entity_type": "activity", "external_id": "evt_gh_001",
         "data": {"source": "github", "actor": "dev-alice", "action": "pushed 3 commit(s)", "resource": "synapseops/core"}},
        {"source_type": "github", "entity_type": "activity", "external_id": "evt_gh_002",
         "data": {"source": "github", "actor": "dev-bob", "action": "opened PR #142", "resource": "synapseops/core"}},
        {"source_type": "github", "entity_type": "activity", "external_id": "evt_gh_003",
         "data": {"source": "github", "actor": "dev-carol", "action": "closed issue #87", "resource": "synapseops/docs"}},
        {"source_type": "github", "entity_type": "activity", "external_id": "evt_gh_004",
         "data": {"source": "github", "actor": "dev-dave", "action": "pushed 1 commit(s)", "resource": "synapseops/frontend"}},
        # Stripe transactions
        {"source_type": "stripe", "entity_type": "transaction", "external_id": "ch_3Qa1b2c3",
         "data": {"source": "stripe", "actor": "cus_Alice", "action": "charge 99.00 USD", "status": "succeeded"}},
        {"source_type": "stripe", "entity_type": "transaction", "external_id": "ch_4Rb2c3d4",
         "data": {"source": "stripe", "actor": "cus_Bob", "action": "charge 149.00 USD", "status": "succeeded"}},
        {"source_type": "stripe", "entity_type": "transaction", "external_id": "re_5Sc3d4e5",
         "data": {"source": "stripe", "actor": "cus_refund", "action": "refund 49.00 USD", "status": "succeeded"}},
        {"source_type": "stripe", "entity_type": "transaction", "external_id": "ch_6Td4e5f6",
         "data": {"source": "stripe", "actor": "cus_Carol", "action": "charge 299.00 USD", "status": "failed"}},
        {"source_type": "stripe", "entity_type": "transaction", "external_id": "ch_7Ue5f6g7",
         "data": {"source": "stripe", "actor": "cus_Dave", "action": "charge 59.00 USD", "status": "succeeded"}},
        # Internal logs
        {"source_type": "internal_logs", "entity_type": "log_entry", "external_id": "log_001",
         "data": {"source": "internal_logs", "level": "ERROR", "service": "auth-service", "message": "JWT validation failed"}},
        {"source_type": "internal_logs", "entity_type": "log_entry", "external_id": "log_002",
         "data": {"source": "internal_logs", "level": "WARN", "service": "payment-service", "message": "Retry #2 for stl_abc"}},
        {"source_type": "internal_logs", "entity_type": "log_entry", "external_id": "log_003",
         "data": {"source": "internal_logs", "level": "INFO", "service": "api-gateway", "message": "Rate limit at 85%"}},
        {"source_type": "internal_logs", "entity_type": "log_entry", "external_id": "log_004",
         "data": {"source": "internal_logs", "level": "ERROR", "service": "notification-service", "message": "Slack 429"}},
        {"source_type": "internal_logs", "entity_type": "log_entry", "external_id": "log_005",
         "data": {"source": "internal_logs", "level": "INFO", "service": "crm-sync", "message": "Batch: 142 records"}},
        {"source_type": "internal_logs", "entity_type": "log_entry", "external_id": "log_006",
         "data": {"source": "internal_logs", "level": "DEBUG", "service": "api-gateway", "message": "Health check OK"}},
    ]

    for wd in warehouse_data:
        wr = WarehouseRecord(
            source_type=wd["source_type"],
            entity_type=wd["entity_type"],
            external_id=wd["external_id"],
            canonical_data=wd["data"],
            ingested_at=now - timedelta(hours=12),
        )
        db.add(wr)

    db.flush()

    # ── Aggregation Events ──────────────────────────────────────
    events_data = [
        {"source_id": gh_id, "event_type": "ingestion", "status": "completed", "offset_hours": -48,
         "payload": {"trigger": "scheduled", "source": "github", "records_pulled": 47}},
        {"source_id": st_id, "event_type": "ingestion", "status": "completed", "offset_hours": -36,
         "payload": {"trigger": "scheduled", "source": "stripe", "records_pulled": 128}},
        {"source_id": il_id, "event_type": "ingestion", "status": "completed", "offset_hours": -24,
         "payload": {"trigger": "scheduled", "source": "internal_logs", "records_pulled": 512}},
        {"source_id": gh_id, "event_type": "ingestion", "status": "completed", "offset_hours": -12,
         "payload": {"trigger": "manual", "source": "github", "records_pulled": 35}},
        {"source_id": st_id, "event_type": "ingestion", "status": "failed", "offset_hours": -6,
         "payload": {"trigger": "scheduled", "source": "stripe"}, "error": "Stripe API timeout"},
        {"source_id": il_id, "event_type": "ingestion", "status": "completed", "offset_hours": -3,
         "payload": {"trigger": "scheduled", "source": "internal_logs", "records_pulled": 287}},
        {"source_id": gh_id, "event_type": "ingestion", "status": "pending", "offset_hours": -1,
         "payload": {"trigger": "scheduled", "source": "github"}},
    ]

    for ed in events_data:
        created_at = now + timedelta(hours=ed["offset_hours"])
        completed_at = created_at + timedelta(seconds=5) if ed["status"] == "completed" else None
        event = AggEvent(
            source_id=ed["source_id"],
            event_type=ed["event_type"],
            status=ed["status"],
            payload=ed["payload"],
            attempts=1 if ed["status"] in ("completed", "failed") else 0,
            processing_error=ed.get("error"),
            completed_at=completed_at,
            created_at=created_at,
        )
        db.add(event)

    db.flush()

    # ── Dead Letter entry ───────────────────────────────────────
    dl_created = now - timedelta(hours=96)
    dl_event = AggEvent(
        source_id=st_id,
        event_type="ingestion",
        payload={"trigger": "scheduled", "source": "stripe"},
        status="dead_letter",
        attempts=3,
        processing_error="Stripe API timeout — connection reset after 3 retries",
        created_at=dl_created,
    )
    db.add(dl_event)
    db.flush()

    dl_entry = DeadLetterAgg(
        event_id=dl_event.id,
        error="Stripe API timeout — connection reset after 3 retries",
        failed_at=dl_created + timedelta(minutes=10),
    )
    db.add(dl_entry)

    db.commit()
