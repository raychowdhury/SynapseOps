from fastapi import APIRouter
from app.services.api_integration.api.v1.endpoints.use_cases import router as use_cases_router
from app.services.api_integration.api.v1.endpoints.webhooks import router as webhooks_router
from app.services.api_integration.api.v1.endpoints.flows import router as flows_router
from app.services.api_integration.api.v1.endpoints.ops import router as ops_router
from app.services.api_integration.api.v1.endpoints.mock import router as mock_router

router = APIRouter(prefix="/api/v1/api-integration", tags=["api-integration"])
router.include_router(use_cases_router)
router.include_router(webhooks_router)
router.include_router(flows_router)
router.include_router(ops_router)
router.include_router(mock_router)
