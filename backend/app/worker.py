import json
import logging
import threading
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models import Job, Artifact, AuditLog
from app.generators.openapi_gen import generate_openapi
from app.generators.fastapi_gen import generate_fastapi
from app.generators.test_gen import generate_tests
from app.generators.docker_gen import generate_dockerfile, generate_docker_compose, generate_requirements
from app.generators.db_model_gen import generate_db_models, generate_alembic_migration
from app.generators.auth_gen import generate_auth_module
from app.generators.sdk_gen import generate_python_sdk, generate_typescript_sdk
from app.generators.postman_gen import generate_postman_collection
from app.generators.cicd_gen import generate_github_actions
from app.validator import validate_openapi, run_tests, run_security_scan

# Configure structured-ready logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("synapseops.worker")

def _log(db, job_id: str, message: str, level: str = "INFO", extra: dict = None):
    # Structured log for internal observability
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "job_id": job_id,
        "message": message,
        "level": level,
        "extra": extra or {}
    }
    logger.info(json.dumps(log_entry))
    
    # Audit trail for user visibility
    db.add(AuditLog(job_id=job_id, message=message))
    db.commit()


def _update_status(db, job: Job, status: str):
    job.status = status
    db.commit()


def _add_artifact(db, job_id: str, artifact_type: str, content: str):
    db.add(Artifact(job_id=job_id, type=artifact_type, content=content))
    db.commit()


CORE_PIPELINE = [
    ("SPEC_GENERATED", [
        ("openapi_spec", generate_openapi),
    ]),
    ("CODE_GENERATED", [
        ("fastapi_code", generate_fastapi),
        ("auth_module", generate_auth_module),
        ("db_models", generate_db_models),
        ("alembic_migration", generate_alembic_migration),
    ]),
    ("TESTS_GENERATED", [
        ("pytest_tests", generate_tests),
    ]),
]

EXTRA_GENERATORS = [
    ("dockerfile", generate_dockerfile),
    ("docker_compose", generate_docker_compose),
    ("requirements_txt", generate_requirements),
    ("python_sdk", generate_python_sdk),
    ("typescript_sdk", generate_typescript_sdk),
    ("postman_collection", generate_postman_collection),
    ("github_actions", generate_github_actions),
]


def _process_job_sync(job_id: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        input_json = job.input_json
        _log(db, job_id, "Starting job processing", extra={"input": input_json})

        for status, gens in CORE_PIPELINE:
            for artifact_type, gen_fn in gens:
                try:
                    content = gen_fn(input_json)
                    _add_artifact(db, job_id, artifact_type, content)
                    _log(db, job_id, f"Generated {artifact_type}")
                    
                    # Security scan for core code
                    if artifact_type == "fastapi_code":
                        valid, output = run_security_scan(content)
                        _add_artifact(db, job_id, "security_scan_results", output)
                        if not valid:
                            _log(db, job_id, "Security scan failed", level="WARNING")
                        else:
                            _log(db, job_id, "Security scan passed")
                            
                except Exception as e:
                    _update_status(db, job, "FAILED")
                    _log(db, job_id, f"Failed {artifact_type}: {e}", level="ERROR")
                    return
            _update_status(db, job, status)

        spec_art = db.query(Artifact).filter(Artifact.job_id == job_id, Artifact.type == "openapi_spec").first()
        if spec_art:
            valid, msg = validate_openapi(spec_art.content)
            _log(db, job_id, msg)
            if not valid:
                _update_status(db, job, "FAILED")
                return
        _update_status(db, job, "VALIDATED")

        app_art = db.query(Artifact).filter(Artifact.job_id == job_id, Artifact.type == "fastapi_code").first()
        test_art = db.query(Artifact).filter(Artifact.job_id == job_id, Artifact.type == "pytest_tests").first()
        if app_art and test_art:
            passed, output = run_tests(app_art.content, test_art.content)
            _add_artifact(db, job_id, "test_results", output)
            _log(db, job_id, f"Tests {'passed' if passed else 'failed'}")
            if not passed:
                _update_status(db, job, "FAILED")
                return

        for artifact_type, gen_fn in EXTRA_GENERATORS:
            try:
                content = gen_fn(input_json)
                _add_artifact(db, job_id, artifact_type, content)
                _log(db, job_id, f"Generated {artifact_type}")
            except Exception as e:
                _log(db, job_id, f"Warning: {artifact_type} skipped: {e}", level="WARNING")

        _update_status(db, job, "COMPLETED")
        _log(db, job_id, "Job completed successfully")

    except Exception as e:
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                _update_status(db, job, "FAILED")
                _log(db, job_id, f"Unexpected error: {e}", level="ERROR")
        except Exception:
            pass
    finally:
        db.close()


def enqueue_job(job_id: str):
    from app.config import USE_CELERY
    if USE_CELERY:
        from app.celery_app import celery
        celery.send_task("process_job", args=[job_id])
    else:
        t = threading.Thread(target=_process_job_sync, args=(job_id,))
        t.start()
