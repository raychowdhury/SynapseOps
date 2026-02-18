import uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import RedirectResponse
from app.routes import router as jobs_router
from app.integration_routes import projects_router, blueprints_router
from app.database import engine, Base, SessionLocal
from app.services.api_integration.api.v1.router import router as api_integration_router
from app.services.api_integration.seed import seed_local_demo_flow
from app.services.api_integration import models as api_integration_models  # noqa: F401
from app.services.notifications import models as notification_models  # noqa: F401
from app.services.notifications.routes import router as notifications_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SynapseOps", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs_router)
app.include_router(projects_router)
app.include_router(blueprints_router)
app.include_router(api_integration_router)
app.include_router(notifications_router)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response


def _error_response(request: Request, status_code: int, code: str, message: str) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "request_id": request_id}},
    )


@app.exception_handler(HTTPException)
async def handle_http_exception(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        code = str(detail.get("code", "http_error"))
        message = str(detail.get("message", detail))
    else:
        code = "http_error"
        message = str(detail)

    return _error_response(request, exc.status_code, code, message)


@app.exception_handler(RequestValidationError)
async def handle_validation_exception(request: Request, exc: RequestValidationError):
    return _error_response(request, 422, "validation_error", "Request validation failed")


@app.exception_handler(Exception)
async def handle_uncaught_exception(request: Request, exc: Exception):
    return _error_response(request, 500, "internal_error", "Internal server error")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def startup_seed():
    db = SessionLocal()
    try:
        seed_local_demo_flow(db)
    finally:
        db.close()
