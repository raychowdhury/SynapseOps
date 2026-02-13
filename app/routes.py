from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Job
from app.schemas import JobCreate, JobOut
from app.worker import enqueue_job

router = APIRouter(prefix="/jobs", tags=["jobs"])


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
