from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, Blueprint
from app.schemas import (
    ProjectCreate,
    ProjectOut,
    BlueprintCreate,
    BlueprintUpdate,
    BlueprintOut,
    BlueprintValidationOut,
)

projects_router = APIRouter(prefix="/projects", tags=["projects"])
blueprints_router = APIRouter(prefix="/blueprints", tags=["blueprints"])


def _validate_blueprint(blueprint: Blueprint) -> tuple[list[str], list[str]]:
    issues: list[str] = []
    warnings: list[str] = []

    source = (blueprint.source_system or "").strip()
    target = (blueprint.target_system or "").strip()

    if not source:
        issues.append("source_system is required")
    if not target:
        issues.append("target_system is required")
    if source and target and source.lower() == target.lower():
        warnings.append("source_system and target_system are identical")
    if not (blueprint.mapping_intent or "").strip():
        warnings.append("mapping_intent is empty")
    if not blueprint.config:
        warnings.append("config is empty")

    return issues, warnings


@projects_router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(name=payload.name, description=payload.description, status="ACTIVE")
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@projects_router.get("", response_model=list[ProjectOut])
def list_projects(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return db.query(Project).offset(skip).limit(limit).all()


@projects_router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@projects_router.post("/{project_id}/blueprints", response_model=BlueprintOut, status_code=201)
def create_blueprint(project_id: str, payload: BlueprintCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    blueprint = Blueprint(
        project_id=project_id,
        name=payload.name,
        status="DRAFT",
        source_system=payload.source_system,
        target_system=payload.target_system,
        mapping_intent=payload.mapping_intent,
        config=payload.config,
    )
    db.add(blueprint)
    db.commit()
    db.refresh(blueprint)
    return blueprint


@projects_router.get("/{project_id}/blueprints", response_model=list[BlueprintOut])
def list_project_blueprints(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Blueprint).filter(Blueprint.project_id == project_id).all()


@blueprints_router.get("/{blueprint_id}", response_model=BlueprintOut)
def get_blueprint(blueprint_id: str, db: Session = Depends(get_db)):
    blueprint = db.query(Blueprint).filter(Blueprint.id == blueprint_id).first()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    return blueprint


@blueprints_router.patch("/{blueprint_id}", response_model=BlueprintOut)
def update_blueprint(blueprint_id: str, payload: BlueprintUpdate, db: Session = Depends(get_db)):
    blueprint = db.query(Blueprint).filter(Blueprint.id == blueprint_id).first()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Blueprint not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(blueprint, key, value)

    blueprint.status = "DRAFT"
    blueprint.approved_at = None
    db.commit()
    db.refresh(blueprint)
    return blueprint


@blueprints_router.post("/{blueprint_id}/validate", response_model=BlueprintValidationOut)
def validate_blueprint(blueprint_id: str, db: Session = Depends(get_db)):
    blueprint = db.query(Blueprint).filter(Blueprint.id == blueprint_id).first()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Blueprint not found")

    issues, warnings = _validate_blueprint(blueprint)
    blueprint.validation_issues = issues
    blueprint.validation_warnings = warnings
    blueprint.status = "VALIDATED" if not issues else "DRAFT"
    db.commit()

    return BlueprintValidationOut(
        valid=not issues,
        status=blueprint.status,
        issues=issues,
        warnings=warnings,
    )


@blueprints_router.post("/{blueprint_id}/approve", response_model=BlueprintOut)
def approve_blueprint(blueprint_id: str, db: Session = Depends(get_db)):
    blueprint = db.query(Blueprint).filter(Blueprint.id == blueprint_id).first()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Blueprint not found")

    issues, warnings = _validate_blueprint(blueprint)
    if issues:
        raise HTTPException(
            status_code=400,
            detail={"message": "Blueprint validation failed", "issues": issues},
        )

    blueprint.validation_issues = issues
    blueprint.validation_warnings = warnings
    blueprint.status = "APPROVED"
    blueprint.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(blueprint)
    return blueprint
