import io
import zipfile
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Job, Artifact
from app.schemas import JobCreate, JobOut
from app.worker import enqueue_job

router = APIRouter(prefix="/jobs", tags=["jobs"])

ARTIFACT_FILENAMES = {
    "openapi_spec": "openapi.yaml",
    "fastapi_code": "main.py",
    "auth_module": "auth.py",
    "db_models": "models.py",
    "alembic_migration": "migrations/0001_initial.py",
    "pytest_tests": "tests/test_api.py",
    "test_results": "tests/results.txt",
    "dockerfile": "Dockerfile",
    "docker_compose": "docker-compose.yml",
    "requirements_txt": "requirements.txt",
    "python_sdk": "sdk/client.py",
    "typescript_sdk": "sdk/client.ts",
    "postman_collection": "postman_collection.json",
    "github_actions": ".github/workflows/ci.yml",
}


@router.post("", response_model=JobOut, status_code=201)
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    job = Job(input_json=payload.input_json.model_dump(), status="DRAFT")
    db.add(job)
    db.commit()
    db.refresh(job)
    enqueue_job(job.id)
    return job


@router.get("", response_model=list[JobOut])
def list_jobs(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return db.query(Job).offset(skip).limit(limit).all()


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{job_id}/export")
def export_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Job not completed yet")

    artifacts = db.query(Artifact).filter(Artifact.job_id == job_id).all()

    buf = io.BytesIO()
    resource = job.input_json.get("resource", "api").lower()
    prefix = f"{resource}_api/"

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for art in artifacts:
            filename = ARTIFACT_FILENAMES.get(art.type, f"{art.type}.txt")
            zf.writestr(f"{prefix}{filename}", art.content)

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={resource}_api.zip"},
    )
