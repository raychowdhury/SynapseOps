import yaml


PYTHON_TO_OPENAPI = {
    "str": "string",
    "int": "integer",
    "float": "number",
    "bool": "boolean",
    "date": "string",
    "datetime": "string",
}

FORMAT_MAP = {
    "date": "date",
    "datetime": "date-time",
}


def generate_openapi(input_json: dict) -> str:
    resource = input_json["resource"]
    fields = input_json["fields"]
    operations = input_json.get("operations", ["create", "read", "update", "delete", "list"])
    auth = input_json.get("auth", True)
    pagination = input_json.get("pagination", True)

    resource_lower = resource.lower()
    resource_title = resource.capitalize()
    base_path = f"/{resource_lower}s"

    properties = {}
    required = []
    for f in fields:
        prop = {"type": PYTHON_TO_OPENAPI.get(f["type"], "string")}
        if f["type"] in FORMAT_MAP:
            prop["format"] = FORMAT_MAP[f["type"]]
        properties[f["name"]] = prop
        if f.get("required", True):
            required.append(f["name"])

    schema_with_id = {
        "type": "object",
        "properties": {"id": {"type": "integer"}, **properties},
    }

    create_schema = {"type": "object", "properties": properties}
    if required:
        create_schema["required"] = required

    error_schema = {
        "type": "object",
        "properties": {
            "detail": {"type": "string"},
        },
    }

    spec: dict = {
        "openapi": "3.1.0",
        "info": {"title": f"{resource_title} API", "version": "1.0.0"},
        "paths": {},
        "components": {
            "schemas": {
                resource_title: schema_with_id,
                f"{resource_title}Create": create_schema,
                "Error": error_schema,
            }
        },
    }

    if auth:
        spec["components"]["securitySchemes"] = {
            "BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
        }
        spec["security"] = [{"BearerAuth": []}]

    paths = spec["paths"]
    ref_model = f"#/components/schemas/{resource_title}"
    ref_create = f"#/components/schemas/{resource_title}Create"
    ref_error = "#/components/schemas/Error"

    err_responses = {
        "401": {"description": "Unauthorized", "content": {"application/json": {"schema": {"$ref": ref_error}}}},
        "422": {"description": "Validation Error", "content": {"application/json": {"schema": {"$ref": ref_error}}}},
    }

    if "list" in operations:
        list_resp = {
            "200": {
                "description": f"List of {resource_lower}s",
                "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": ref_model}}}},
            },
            **err_responses,
        }
        list_op = {"get": {"summary": f"List {resource_lower}s", "operationId": f"list_{resource_lower}s", "responses": list_resp}}
        if pagination:
            list_op["get"]["parameters"] = [
                {"name": "skip", "in": "query", "schema": {"type": "integer", "default": 0}},
                {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 20}},
            ]
        paths.setdefault(base_path, {}).update(list_op)

    if "create" in operations:
        paths.setdefault(base_path, {}).update({
            "post": {
                "summary": f"Create {resource_lower}",
                "operationId": f"create_{resource_lower}",
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": ref_create}}}},
                "responses": {
                    "201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": ref_model}}}},
                    **err_responses,
                },
            }
        })

    item_path = f"{base_path}/{{id}}"
    id_param = {"name": "id", "in": "path", "required": True, "schema": {"type": "integer"}}

    if "read" in operations:
        paths.setdefault(item_path, {}).update({
            "get": {
                "summary": f"Get {resource_lower}",
                "operationId": f"get_{resource_lower}",
                "parameters": [id_param],
                "responses": {
                    "200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": ref_model}}}},
                    "404": {"description": "Not found", "content": {"application/json": {"schema": {"$ref": ref_error}}}},
                    **err_responses,
                },
            }
        })

    if "update" in operations:
        paths.setdefault(item_path, {}).update({
            "put": {
                "summary": f"Update {resource_lower}",
                "operationId": f"update_{resource_lower}",
                "parameters": [id_param],
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": ref_create}}}},
                "responses": {
                    "200": {"description": "Updated", "content": {"application/json": {"schema": {"$ref": ref_model}}}},
                    "404": {"description": "Not found", "content": {"application/json": {"schema": {"$ref": ref_error}}}},
                    **err_responses,
                },
            }
        })

    if "delete" in operations:
        paths.setdefault(item_path, {}).update({
            "delete": {
                "summary": f"Delete {resource_lower}",
                "operationId": f"delete_{resource_lower}",
                "parameters": [id_param],
                "responses": {
                    "204": {"description": "Deleted"},
                    "404": {"description": "Not found", "content": {"application/json": {"schema": {"$ref": ref_error}}}},
                    **err_responses,
                },
            }
        })

    return yaml.dump(spec, default_flow_style=False, sort_keys=False)
