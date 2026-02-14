from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.orm import Session
from app.services.api_integration.models import Flow, Run, get_db
from app.services.api_integration.errors import api_error
from app.services.api_integration.services.flow_runner import flow_runner
from app.services.api_integration.context import get_request_id

router = APIRouter()


@router.get("/flows")
def list_flows(db: Session = Depends(get_db)):
    flows = db.query(Flow).order_by(Flow.created_at.desc()).all()
    return [
        {
            "id": flow.id,
            "name": flow.name,
            "is_enabled": flow.is_enabled,
            "source_endpoint": flow.source_endpoint.name,
            "target_endpoint": flow.target_endpoint.name,
            "mapping": flow.mapping.name,
            "credential": flow.credential.name if flow.credential else None,
            "retry": {
                "max_attempts": flow.retry_max_attempts,
                "base_delay_sec": flow.retry_base_delay_sec,
                "max_delay_sec": flow.retry_max_delay_sec,
            },
        }
        for flow in flows
    ]


@router.get("/flows/{flow_id}")
def get_flow(flow_id: str, db: Session = Depends(get_db)):
    flow = db.query(Flow).filter(Flow.id == flow_id).first()
    if not flow:
        raise api_error(404, "flow_not_found", "Flow not found")

    return {
        "id": flow.id,
        "name": flow.name,
        "is_enabled": flow.is_enabled,
        "source_endpoint": {
            "id": flow.source_endpoint.id,
            "name": flow.source_endpoint.name,
            "event_name": flow.source_endpoint.event_name,
        },
        "target_endpoint": {
            "id": flow.target_endpoint.id,
            "name": flow.target_endpoint.name,
            "method": flow.target_endpoint.method,
            "path": flow.target_endpoint.path,
        },
        "mapping": {"id": flow.mapping.id, "name": flow.mapping.name, "rules": flow.mapping.rules},
        "credential": {
            "id": flow.credential.id,
            "name": flow.credential.name,
            "auth_type": flow.credential.auth_type,
        }
        if flow.credential
        else None,
    }


@router.get("/flows/{flow_id}/runs")
def list_flow_runs(flow_id: str, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    flow = db.query(Flow).filter(Flow.id == flow_id).first()
    if not flow:
        raise api_error(404, "flow_not_found", "Flow not found")

    runs = (
        db.query(Run)
        .filter(Run.flow_id == flow_id)
        .order_by(Run.started_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": run.id,
            "flow_id": run.flow_id,
            "status": run.status,
            "attempt_count": run.attempt_count,
            "http_status": run.http_status,
            "duration_ms": run.duration_ms,
            "started_at": run.started_at,
            "finished_at": run.finished_at,
            "request_id": run.request_id,
        }
        for run in runs
    ]


@router.post("/flows/{flow_id}/run", status_code=202)
async def run_flow(
    flow_id: str,
    request: Request,
    payload: dict | None = Body(default=None),
    db: Session = Depends(get_db),
):
    request_id = get_request_id(request)

    try:
        run = await flow_runner.run_by_id(
            db,
            flow_id=flow_id,
            source_payload=payload or {},
            request_id=request_id,
        )
    except ValueError as exc:
        raise api_error(404, "flow_not_found", str(exc))
    except Exception as exc:
        raise api_error(502, "flow_execution_failed", str(exc))

    return {"run_id": run.id, "status": run.status, "flow_id": run.flow_id}
