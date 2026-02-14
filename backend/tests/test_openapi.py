from openapi_spec_validator import validate
from app.main import app


def test_openapi_is_valid():
    schema = app.openapi()
    validate(schema)
