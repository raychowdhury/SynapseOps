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


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BlueprintCreate(BaseModel):
    name: str
    source_system: str
    target_system: str
    mapping_intent: str | None = None
    config: dict = {}


class BlueprintUpdate(BaseModel):
    name: str | None = None
    source_system: str | None = None
    target_system: str | None = None
    mapping_intent: str | None = None
    config: dict | None = None


class BlueprintOut(BaseModel):
    id: str
    project_id: str
    name: str
    status: str
    source_system: str
    target_system: str
    mapping_intent: str | None = None
    config: dict
    validation_issues: list[str] = []
    validation_warnings: list[str] = []
    approved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BlueprintValidationOut(BaseModel):
    valid: bool
    status: str
    issues: list[str] = []
    warnings: list[str] = []
