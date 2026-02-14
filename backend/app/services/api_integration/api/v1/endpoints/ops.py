from fastapi import APIRouter, Depends, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.services.api_integration.models import Run, DeadLetter, get_db
from app.services.api_integration.services.flow_runner import flow_runner
from app.services.api_integration.errors import api_error
from app.services.api_integration.context import get_request_id

router = APIRouter()


@router.get("/ops/runs")
def list_runs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    runs = db.query(Run).order_by(Run.started_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": run.id,
            "flow_id": run.flow_id,
            "status": run.status,
            "attempt_count": run.attempt_count,
            "http_status": run.http_status,
            "error_message": run.error_message,
            "duration_ms": run.duration_ms,
            "started_at": run.started_at,
            "finished_at": run.finished_at,
            "request_id": run.request_id,
            "mapped_payload": run.mapped_payload,
        }
        for run in runs
    ]


@router.get("/ops/runs/{run_id}")
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise api_error(404, "run_not_found", "Run not found")

    return {
        "id": run.id,
        "flow_id": run.flow_id,
        "status": run.status,
        "attempt_count": run.attempt_count,
        "http_status": run.http_status,
        "error_message": run.error_message,
        "duration_ms": run.duration_ms,
        "source_payload": run.source_payload,
        "mapped_payload": run.mapped_payload,
        "target_response": run.target_response,
        "started_at": run.started_at,
        "finished_at": run.finished_at,
        "request_id": run.request_id,
    }


@router.get("/dead-letters")
@router.get("/ops/dead-letters")
def list_dead_letters(status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(DeadLetter).order_by(DeadLetter.created_at.desc())
    if status:
        query = query.filter(DeadLetter.status == status)
    items = query.all()

    return [
        {
            "id": item.id,
            "flow_id": item.flow_id,
            "run_id": item.run_id,
            "status": item.status,
            "replay_count": item.replay_count,
            "error_message": item.error_message,
            "created_at": item.created_at,
            "last_replayed_at": item.last_replayed_at,
            "source_payload": item.source_payload,
            "mapped_payload": item.mapped_payload,
        }
        for item in items
    ]


@router.post("/dead-letters/{dead_letter_id}/replay")
@router.post("/ops/dead-letters/{dead_letter_id}/replay")
async def replay_dead_letter(dead_letter_id: str, request: Request, db: Session = Depends(get_db)):
    dead_letter = db.query(DeadLetter).filter(DeadLetter.id == dead_letter_id).first()
    if not dead_letter:
        raise api_error(404, "dead_letter_not_found", "Dead letter not found")

    try:
        run = await flow_runner.replay_dead_letter(db, dead_letter=dead_letter, request_id=get_request_id(request))
    except Exception as exc:
        raise api_error(502, "replay_failed", str(exc))

    return {"run_id": run.id, "status": run.status, "dead_letter_id": dead_letter.id}


@router.get("/ops/metrics")
def get_metrics(db: Session = Depends(get_db)):
    total_runs = db.query(func.count(Run.id)).scalar() or 0
    succeeded_runs = db.query(func.count(Run.id)).filter(Run.status == "SUCCEEDED").scalar() or 0
    failed_runs = db.query(func.count(Run.id)).filter(Run.status == "FAILED").scalar() or 0
    pending_dlq = db.query(func.count(DeadLetter.id)).filter(DeadLetter.status == "PENDING").scalar() or 0

    success_rate = (succeeded_runs / total_runs) if total_runs else 0.0

    return {
        "total_runs": total_runs,
        "succeeded_runs": succeeded_runs,
        "failed_runs": failed_runs,
        "pending_dead_letters": pending_dlq,
        "success_rate": round(success_rate, 4),
    }
