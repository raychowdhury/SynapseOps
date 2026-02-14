def generate_tests(input_json: dict) -> str:
    resource = input_json["resource"]
    fields = input_json["fields"]
    operations = input_json.get("operations", ["create", "read", "update", "delete", "list"])
    auth = input_json.get("auth", True)

    r_lower = resource.lower()

    sample_data = {}
    for f in fields:
        t = f["type"]
        if t == "str":
            sample_data[f["name"]] = f"test_{f['name']}"
        elif t == "int":
            sample_data[f["name"]] = 1
        elif t == "float":
            sample_data[f["name"]] = 1.0
        elif t == "bool":
            sample_data[f["name"]] = True
        elif t == "date":
            sample_data[f["name"]] = "2024-01-01"
        elif t == "datetime":
            sample_data[f["name"]] = "2024-01-01T00:00:00"
        else:
            sample_data[f["name"]] = "test"

    headers = '{"Authorization": "Bearer testtoken123"}' if auth else "{}"

    lines = [
        "import pytest",
        "from fastapi.testclient import TestClient",
        "from generated_app import app",
        "",
        "",
        "client = TestClient(app)",
        f"HEADERS = {headers}",
        f"SAMPLE = {sample_data!r}",
        "",
    ]

    if "create" in operations:
        lines.extend([
            "",
            f"def test_create_{r_lower}_success():",
            f'    resp = client.post("/{r_lower}s", json=SAMPLE, headers=HEADERS)',
            f"    assert resp.status_code == 201",
            f'    assert resp.json()["id"] == 1',
            "",
            "",
            f"def test_create_{r_lower}_validation_error():",
            f'    resp = client.post("/{r_lower}s", json={{}}, headers=HEADERS)',
            f"    assert resp.status_code == 422",
        ])

    if auth and "create" in operations:
        lines.extend([
            "",
            "",
            f"def test_create_{r_lower}_unauthorized():",
            f'    resp = client.post("/{r_lower}s", json=SAMPLE)',
            f"    assert resp.status_code in (401, 403)",
        ])

    if "read" in operations:
        lines.extend([
            "",
            "",
            f"def test_get_{r_lower}_not_found():",
            f'    resp = client.get("/{r_lower}s/9999", headers=HEADERS)',
            f"    assert resp.status_code == 404",
        ])

    if "list" in operations:
        lines.extend([
            "",
            "",
            f"def test_list_{r_lower}s():",
            f'    resp = client.get("/{r_lower}s", headers=HEADERS)',
            f"    assert resp.status_code == 200",
            f"    assert isinstance(resp.json(), list)",
        ])

    if "delete" in operations:
        lines.extend([
            "",
            "",
            f"def test_delete_{r_lower}_not_found():",
            f'    resp = client.delete("/{r_lower}s/9999", headers=HEADERS)',
            f"    assert resp.status_code == 404",
        ])

    lines.append("")
    return "\n".join(lines)
