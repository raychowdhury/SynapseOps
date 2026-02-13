from pydantic import BaseModel
from datetime import datetime


class FieldDef(BaseModel):
    name: str
    type: str
    required: bool = True


class JobInput(BaseModel):
    resource: str
    fields: list[FieldDef]
    operations: list[str] = ["create", "read", "update", "delete", "list"]
    auth: bool = True
    pagination: bool = True


class JobCreate(BaseModel):
    input_json: JobInput


class ArtifactOut(BaseModel):
    id: str
    type: str
    content: str
    created_at: datetime


class AuditLogOut(BaseModel):
    id: str
    message: str
    created_at: datetime


class JobOut(BaseModel):
    id: str
    status: str
    input_json: dict
    created_at: datetime
    updated_at: datetime
    artifacts: list[ArtifactOut] = []
    audit_logs: list[AuditLogOut] = []

    model_config = {"from_attributes": True}
