import yaml
from app.generators.openapi_gen import generate_openapi
from app.generators.fastapi_gen import generate_fastapi
from app.generators.test_gen import generate_tests
from app.validator import validate_openapi

SAMPLE_INPUT = {
    "resource": "Task",
    "fields": [
        {"name": "title", "type": "str", "required": True},
        {"name": "done", "type": "bool", "required": False},
    ],
    "operations": ["create", "read", "update", "delete", "list"],
    "auth": True,
    "pagination": True,
}


def test_openapi_generation():
    spec = generate_openapi(SAMPLE_INPUT)
    parsed = yaml.safe_load(spec)
    assert parsed["openapi"] == "3.1.0"
    assert "/tasks" in parsed["paths"]
    assert "/tasks/{id}" in parsed["paths"]


def test_openapi_validation():
    spec = generate_openapi(SAMPLE_INPUT)
    valid, msg = validate_openapi(spec)
    assert valid, msg


def test_fastapi_generation():
    code = generate_fastapi(SAMPLE_INPUT)
    assert "class TaskCreate" in code
    assert "class Task" in code
    assert "def create_task" in code
    assert "def list_tasks" in code


def test_test_generation():
    code = generate_tests(SAMPLE_INPUT)
    assert "def test_create_task_success" in code
    assert "def test_create_task_unauthorized" in code
    assert "def test_create_task_validation_error" in code
