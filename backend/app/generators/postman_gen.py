import json


def generate_postman_collection(input_json: dict) -> str:
    resource = input_json["resource"]
    fields = input_json["fields"]
    operations = input_json.get("operations", ["create", "read", "update", "delete", "list"])
    auth = input_json.get("auth", True)

    r_lower = resource.lower()
    r_title = resource.capitalize()
    base_url = "{{base_url}}"

    sample_body = {}
    for f in fields:
        t = f["type"]
        if t == "str":
            sample_body[f["name"]] = f"sample_{f['name']}"
        elif t == "int":
            sample_body[f["name"]] = 1
        elif t == "float":
            sample_body[f["name"]] = 1.0
        elif t == "bool":
            sample_body[f["name"]] = True
        elif t == "date":
            sample_body[f["name"]] = "2024-01-01"
        elif t == "datetime":
            sample_body[f["name"]] = "2024-01-01T00:00:00Z"
        else:
            sample_body[f["name"]] = "sample"

    items = []

    if "create" in operations:
        items.append({
            "name": f"Create {r_title}",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {"mode": "raw", "raw": json.dumps(sample_body, indent=2)},
                "url": {"raw": f"{base_url}/{r_lower}s", "host": [base_url], "path": [f"{r_lower}s"]},
            },
        })

    if "list" in operations:
        items.append({
            "name": f"List {r_title}s",
            "request": {
                "method": "GET",
                "url": {
                    "raw": f"{base_url}/{r_lower}s?skip=0&limit=20",
                    "host": [base_url],
                    "path": [f"{r_lower}s"],
                    "query": [{"key": "skip", "value": "0"}, {"key": "limit", "value": "20"}],
                },
            },
        })

    if "read" in operations:
        items.append({
            "name": f"Get {r_title}",
            "request": {
                "method": "GET",
                "url": {"raw": f"{base_url}/{r_lower}s/1", "host": [base_url], "path": [f"{r_lower}s", "1"]},
            },
        })

    if "update" in operations:
        items.append({
            "name": f"Update {r_title}",
            "request": {
                "method": "PUT",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {"mode": "raw", "raw": json.dumps(sample_body, indent=2)},
                "url": {"raw": f"{base_url}/{r_lower}s/1", "host": [base_url], "path": [f"{r_lower}s", "1"]},
            },
        })

    if "delete" in operations:
        items.append({
            "name": f"Delete {r_title}",
            "request": {
                "method": "DELETE",
                "url": {"raw": f"{base_url}/{r_lower}s/1", "host": [base_url], "path": [f"{r_lower}s", "1"]},
            },
        })

    if auth:
        items.insert(0, {
            "name": "Register",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {"mode": "raw", "raw": json.dumps({"email": "test@example.com", "password": "password123", "name": "Test User"}, indent=2)},
                "url": {"raw": f"{base_url}/auth/register", "host": [base_url], "path": ["auth", "register"]},
            },
        })
        items.insert(1, {
            "name": "Login",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {"mode": "raw", "raw": json.dumps({"email": "test@example.com", "password": "password123"}, indent=2)},
                "url": {"raw": f"{base_url}/auth/login", "host": [base_url], "path": ["auth", "login"]},
            },
        })

    for item in items:
        if auth and "request" in item:
            headers = item["request"].get("header", [])
            headers.append({"key": "Authorization", "value": "Bearer {{token}}"})
            item["request"]["header"] = headers

    collection = {
        "info": {
            "name": f"{r_title} API",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "variable": [
            {"key": "base_url", "value": "http://localhost:8000"},
            {"key": "token", "value": ""},
        ],
        "item": items,
    }

    return json.dumps(collection, indent=2)
