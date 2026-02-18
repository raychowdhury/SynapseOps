from openapi_spec_validator import validate
from app.main import app


def test_openapi_is_valid():
    schema = app.openapi()
    validate(schema)


def test_api_integration_required_paths_exist():
    schema = app.openapi()
    paths = schema.get("paths", {})

    required_paths = {
        "/api/v1/api-integration/use-cases": "get",
        "/api/v1/api-integration/webhooks/{flow_id}": "post",
        "/api/v1/api-integration/flows/{flow_id}/run": "post",
        "/api/v1/api-integration/flows/{flow_id}/runs": "get",
        "/api/v1/api-integration/dead-letters": "get",
        "/api/v1/api-integration/dead-letters/{dead_letter_id}/replay": "post",
    }

    for path, method in required_paths.items():
        assert path in paths
        assert method in paths[path]
