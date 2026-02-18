import uuid
from datetime import datetime, timezone
from fastapi import APIRouter

router = APIRouter()


@router.post("/mock/erp/orders", status_code=201)
def mock_erp_create_order(payload: dict):
    return {
        "status": "accepted",
        "erp_order_id": f"ERP-{uuid.uuid4().hex[:10].upper()}",
        "received_at": datetime.now(timezone.utc).isoformat(),
        "received_payload": payload,
    }
