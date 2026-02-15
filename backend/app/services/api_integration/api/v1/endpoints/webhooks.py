from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session
from app.services.api_integration.models import get_db
from app.services.api_integration.services.flow_runner import flow_runner
from app.services.api_integration.errors import api_error
from app.services.api_integration.context import get_request_id

router = APIRouter()


@router.post("/webhooks/{flow_id}", status_code=202)
async def webhook_by_flow_id(
    flow_id: str,
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
):
    request_id = get_request_id(request)

    try:
        run = await flow_runner.run_by_id(db, flow_id=flow_id, source_payload=payload, request_id=request_id)
    except ValueError as exc:
        raise api_error(404, "flow_not_found", str(exc))
    except Exception as exc:
        raise api_error(502, "flow_execution_failed", str(exc))

    return {"run_id": run.id, "status": run.status, "flow_id": run.flow_id}


@router.post("/webhooks/shopify/orders-create", status_code=202)
async def shopify_orders_create(
    payload: dict,
    request: Request,
    x_shopify_topic: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    event_name = (x_shopify_topic or "orders/create").strip() or "orders/create"
    request_id = get_request_id(request)

    try:
        run = await flow_runner.run_by_event(db, event_name=event_name, source_payload=payload, request_id=request_id)
    except ValueError as exc:
        raise api_error(404, "flow_not_found", str(exc))
    except Exception as exc:
        raise api_error(502, "flow_execution_failed", str(exc))

    return {"run_id": run.id, "status": run.status, "flow_id": run.flow_id}
