import threading
from app.database import SessionLocal
from app.models import Job, Artifact, AuditLog
from app.generators.openapi_gen import generate_openapi
from app.generators.fastapi_gen import generate_fastapi
from app.generators.test_gen import generate_tests
from app.validator import validate_openapi, run_tests


def _log(db, job_id: str, message: str):
    db.add(AuditLog(job_id=job_id, message=message))
    db.commit()


def _update_status(db, job: Job, status: str):
    job.status = status
    db.commit()


def _add_artifact(db, job_id: str, artifact_type: str, content: str):
    db.add(Artifact(job_id=job_id, type=artifact_type, content=content))
    db.commit()


def _process_job_sync(job_id: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        input_json = job.input_json

        try:
            spec_yaml = generate_openapi(input_json)
            _add_artifact(db, job_id, "openapi_spec", spec_yaml)
            _update_status(db, job, "SPEC_GENERATED")
            _log(db, job_id, "OpenAPI spec generated")
        except Exception as e:
            _update_status(db, job, "FAILED")
            _log(db, job_id, f"Spec generation failed: {e}")
            return

        try:
            app_code = generate_fastapi(input_json)
            _add_artifact(db, job_id, "fastapi_code", app_code)
            _update_status(db, job, "CODE_GENERATED")
            _log(db, job_id, "FastAPI code generated")
        except Exception as e:
            _update_status(db, job, "FAILED")
            _log(db, job_id, f"Code generation failed: {e}")
            return

        try:
            test_code = generate_tests(input_json)
            _add_artifact(db, job_id, "pytest_tests", test_code)
            _update_status(db, job, "TESTS_GENERATED")
            _log(db, job_id, "Pytest tests generated")
        except Exception as e:
            _update_status(db, job, "FAILED")
            _log(db, job_id, f"Test generation failed: {e}")
            return

        valid, msg = validate_openapi(spec_yaml)
        _log(db, job_id, msg)
        if not valid:
            _update_status(db, job, "FAILED")
            return
        _update_status(db, job, "VALIDATED")

        passed, output = run_tests(app_code, test_code)
        _add_artifact(db, job_id, "test_results", output)
        _log(db, job_id, f"Tests {'passed' if passed else 'failed'}")

        _update_status(db, job, "COMPLETED" if passed else "FAILED")

    except Exception as e:
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                _update_status(db, job, "FAILED")
                _log(db, job_id, f"Unexpected error: {e}")
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
