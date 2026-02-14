from pydantic import BaseModel
from datetime import datetime


class ValidationRules(BaseModel):
    min_length: int | None = None
    max_length: int | None = None
    min_value: float | None = None
    max_value: float | None = None
    regex: str | None = None
    unique: bool = False
    default: str | int | float | bool | None = None


class FieldDef(BaseModel):
    name: str
    type: str
    required: bool = True
    validations: ValidationRules = ValidationRules()


class RelationshipDef(BaseModel):
    resource: str
    type: str = "many"  # "one" or "many"


class JobInput(BaseModel):
    resource: str
    fields: list[FieldDef]
    operations: list[str] = ["create", "read", "update", "delete", "list"]
    auth: bool = True
    pagination: bool = True
    relationships: list[RelationshipDef] = []


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
