import os
from sqlalchemy.orm import Session
from app.services.api_integration.models import Connector, Credential, Endpoint, Mapping, Flow


def _get_or_create_connector(db: Session, name: str, protocol: str, base_url: str | None = None) -> Connector:
    connector = db.query(Connector).filter(Connector.name == name).first()
    if connector:
        connector.protocol = protocol
        connector.base_url = base_url
        connector.is_active = True
        db.commit()
        db.refresh(connector)
        return connector

    connector = Connector(name=name, protocol=protocol, base_url=base_url, is_active=True)
    db.add(connector)
    db.commit()
    db.refresh(connector)
    return connector


def seed_local_demo_flow(db: Session) -> None:
    env = os.getenv("ENV", "local").lower()
    if env != "local":
        return

    demo_target_base_url = os.getenv("API_INTEGRATION_DEMO_TARGET_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

    shopify_connector = _get_or_create_connector(db, "Shopify", "webhook")
    erp_connector = _get_or_create_connector(db, "ERP", "rest", base_url=demo_target_base_url)

    credential = (
        db.query(Credential)
        .filter(Credential.connector_id == erp_connector.id, Credential.name == "ERP API Key")
        .first()
    )
    if not credential:
        credential = Credential(
            connector_id=erp_connector.id,
            name="ERP API Key",
            auth_type="api_key",
            auth_config={"header_name": "X-ERP-API-Key", "api_key": "erp-demo-key"},
            is_active=True,
        )
        db.add(credential)
        db.commit()
        db.refresh(credential)

    source_endpoint = (
        db.query(Endpoint)
        .filter(Endpoint.connector_id == shopify_connector.id, Endpoint.event_name == "orders/create")
        .first()
    )
    if not source_endpoint:
        source_endpoint = Endpoint(
            connector_id=shopify_connector.id,
            name="Shopify orders/create webhook",
            direction="inbound",
            method="POST",
            path="/webhooks/shopify/orders-create",
            event_name="orders/create",
            is_active=True,
        )
        db.add(source_endpoint)
        db.commit()
        db.refresh(source_endpoint)

    target_endpoint = (
        db.query(Endpoint)
        .filter(Endpoint.connector_id == erp_connector.id, Endpoint.name == "ERP Create Order")
        .first()
    )
    if not target_endpoint:
        target_endpoint = Endpoint(
            connector_id=erp_connector.id,
            name="ERP Create Order",
            direction="outbound",
            method="POST",
            path="/api/v1/api-integration/mock/erp/orders",
            is_active=True,
        )
        db.add(target_endpoint)
        db.commit()
        db.refresh(target_endpoint)
    else:
        target_endpoint.direction = "outbound"
        target_endpoint.method = "POST"
        target_endpoint.path = "/api/v1/api-integration/mock/erp/orders"
        target_endpoint.is_active = True
        db.commit()
        db.refresh(target_endpoint)

    mapping = db.query(Mapping).filter(Mapping.name == "Shopify Order -> ERP Order").first()
    if not mapping:
        mapping = Mapping(
            name="Shopify Order -> ERP Order",
            rules=[
                {"source": "id", "target": "order_number"},
                {"source": "total_price", "target": "total_amount", "transform": "to_float"},
                {"source": "currency", "target": "currency"},
                {"source": "shipping_address.city", "target": "ship_city"},
                {
                    "source": "line_items",
                    "target": "items",
                    "op": "map_array",
                    "item_rules": [
                        {"source": "sku", "target": "sku"},
                        {"source": "quantity", "target": "qty", "transform": "to_int"},
                        {"source": "price", "target": "unit_price", "transform": "to_float"},
                    ],
                },
            ],
        )
        db.add(mapping)
        db.commit()
        db.refresh(mapping)

    flow = db.query(Flow).filter(Flow.name == "Shopify -> ERP Order Sync").first()
    if not flow:
        flow = Flow(
            name="Shopify -> ERP Order Sync",
            source_endpoint_id=source_endpoint.id,
            target_endpoint_id=target_endpoint.id,
            mapping_id=mapping.id,
            credential_id=credential.id,
            is_enabled=True,
            retry_max_attempts=3,
            retry_base_delay_sec=0.25,
            retry_max_delay_sec=2.0,
            circuit_failure_threshold=3,
            circuit_recovery_timeout_sec=5.0,
        )
        db.add(flow)
    else:
        flow.is_enabled = True

    db.commit()
