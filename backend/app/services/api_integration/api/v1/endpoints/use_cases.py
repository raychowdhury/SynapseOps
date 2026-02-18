from fastapi import APIRouter

router = APIRouter()


@router.get("/use-cases")
def list_use_cases():
    return [
        {"rank": 1, "name": "E-commerce order sync", "demand": "Extremely High", "complexity": "Medium–High"},
        {"rank": 2, "name": "Payment gateway integration", "demand": "Extremely High", "complexity": "High"},
        {"rank": 3, "name": "CRM automation", "demand": "High", "complexity": "Medium"},
        {"rank": 4, "name": "SaaS notifications/workflows", "demand": "Very High", "complexity": "Low–Medium"},
        {"rank": 5, "name": "Data aggregation", "demand": "High", "complexity": "High"},
    ]
