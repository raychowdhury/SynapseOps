"""
Seed data for the CRM Automation service.

Creates demo platforms, field mappings, sync states, CRM events,
and a dead-letter entry.
"""

import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.services.crm_automation.models import (
    CrmPlatform,
    FieldMapping,
    SyncState,
    CrmEvent,
    DeadLetterCrm,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def seed_crm_automation(db: Session) -> None:
    """Seed the CRM automation tables with demo data if empty."""
    existing = db.query(CrmPlatform).first()
    if existing:
        return  # Already seeded

    now = _utcnow()

    # ── Platforms ────────────────────────────────────────────────
    sf_id = str(uuid.uuid4())
    hs_id = str(uuid.uuid4())

    salesforce = CrmPlatform(
        id=sf_id,
        name="salesforce",
        label="Salesforce Production",
        platform_type="salesforce",
        auth_config={"client_id": "sf_demo", "instance_url": "https://demo.salesforce.com"},
        status="connected",
        created_at=now - timedelta(days=30),
    )
    hubspot = CrmPlatform(
        id=hs_id,
        name="hubspot",
        label="HubSpot Marketing",
        platform_type="hubspot",
        auth_config={"api_key": "hs_demo"},
        status="connected",
        created_at=now - timedelta(days=28),
    )
    db.add_all([salesforce, hubspot])
    db.flush()

    # ── Field Mappings (Salesforce Lead → HubSpot Contact) ──────
    mapping_defs = [
        ("Lead", "Contact", "FirstName", "firstname", "direct"),
        ("Lead", "Contact", "LastName", "lastname", "direct"),
        ("Lead", "Contact", "Email", "email", "lowercase"),
        ("Lead", "Contact", "Company", "company", "direct"),
        ("Lead", "Contact", "Title", "jobtitle", "direct"),
        ("Lead", "Contact", "LeadSource", "hs_lead_status", "direct"),
    ]

    for src_obj, tgt_obj, src_field, tgt_field, transform in mapping_defs:
        m = FieldMapping(
            source_platform_id=sf_id,
            target_platform_id=hs_id,
            source_object=src_obj,
            target_object=tgt_obj,
            source_field=src_field,
            target_field=tgt_field,
            transform_rule=transform,
            created_at=now - timedelta(days=25),
        )
        db.add(m)

    db.flush()

    # ── Sync States ─────────────────────────────────────────────
    sync_states_data = [
        (sf_id, "outbound", now - timedelta(hours=2), 142),
        (sf_id, "inbound", now - timedelta(hours=6), 87),
        (hs_id, "outbound", now - timedelta(hours=1), 198),
        (hs_id, "inbound", now - timedelta(hours=4), 63),
    ]
    for pid, direction, last_synced, count in sync_states_data:
        ss = SyncState(
            platform_id=pid,
            direction=direction,
            last_synced_at=last_synced,
            records_synced=count,
            status="idle",
        )
        db.add(ss)

    db.flush()

    # ── CRM Events ──────────────────────────────────────────────
    events_data = [
        {"event_type": "lead_sync", "direction": "outbound", "status": "synced",
         "offset_hours": -48, "attempts": 1, "payload": {"FirstName": "Jane", "LastName": "Doe", "Email": "jane@acme.com"}},
        {"event_type": "lead_sync", "direction": "outbound", "status": "synced",
         "offset_hours": -36, "attempts": 1, "payload": {"FirstName": "John", "LastName": "Smith", "Email": "john@globex.io"}},
        {"event_type": "contact_sync", "direction": "inbound", "status": "synced",
         "offset_hours": -24, "attempts": 2, "payload": {"firstname": "Alice", "lastname": "Wong", "email": "alice@startup.io"}},
        {"event_type": "lead_sync", "direction": "outbound", "status": "synced",
         "offset_hours": -18, "attempts": 1, "payload": {"FirstName": "Bob", "LastName": "Chen", "Email": "bob@enterprise.co"}},
        {"event_type": "contact_sync", "direction": "outbound", "status": "pending",
         "offset_hours": -2, "attempts": 0, "payload": {"FirstName": "Sarah", "LastName": "Lee", "Email": "sarah@newco.com"}},
        {"event_type": "lead_sync", "direction": "outbound", "status": "failed",
         "offset_hours": -3, "attempts": 2, "payload": {"FirstName": "Mike", "LastName": "Ross", "Email": "mike@suits.law"},
         "error": "Salesforce API timeout – INVALID_SESSION_ID"},
        {"event_type": "contact_sync", "direction": "inbound", "status": "synced",
         "offset_hours": -12, "attempts": 1, "payload": {"firstname": "Eva", "lastname": "Green", "email": "eva@agency.com"}},
        {"event_type": "lead_sync", "direction": "outbound", "status": "pending",
         "offset_hours": -1, "attempts": 0, "payload": {"FirstName": "Tom", "LastName": "Hardy", "Email": "tom@studio.io"}},
    ]

    for edata in events_data:
        created_at = now + timedelta(hours=edata["offset_hours"])
        src_id = sf_id if edata["direction"] == "outbound" else hs_id
        tgt_id = hs_id if edata["direction"] == "outbound" else sf_id
        synced_at = created_at + timedelta(seconds=5) if edata["status"] == "synced" else None

        event = CrmEvent(
            source_platform_id=src_id,
            target_platform_id=tgt_id,
            event_type=edata["event_type"],
            direction=edata["direction"],
            payload=edata["payload"],
            status=edata["status"],
            attempts=edata["attempts"],
            processing_error=edata.get("error"),
            synced_at=synced_at,
            created_at=created_at,
        )
        db.add(event)

    db.flush()

    # ── Dead Letter entry ───────────────────────────────────────
    dl_created = now - timedelta(hours=72)
    dl_event = CrmEvent(
        source_platform_id=sf_id,
        target_platform_id=hs_id,
        event_type="lead_sync",
        direction="outbound",
        payload={"FirstName": "Dead", "LastName": "Letter", "Email": "dl@example.com"},
        status="dead_letter",
        attempts=3,
        processing_error="HubSpot rate limit exceeded – 429 Too Many Requests after 3 retries",
        created_at=dl_created,
    )
    db.add(dl_event)
    db.flush()

    dl_entry = DeadLetterCrm(
        event_id=dl_event.id,
        error="HubSpot rate limit exceeded – 429 Too Many Requests after 3 retries",
        failed_at=dl_created + timedelta(minutes=5),
    )
    db.add(dl_entry)

    db.commit()
