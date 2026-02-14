PYTHON_TYPE_MAP = {
    "str": "str",
    "int": "int",
    "float": "float",
    "bool": "bool",
    "date": "date",
    "datetime": "datetime",
}

IMPORTS_FOR_TYPES = {"date": "from datetime import date", "datetime": "from datetime import datetime"}


def generate_fastapi(input_json: dict) -> str:
    resource = input_json["resource"]
    fields = input_json["fields"]
    operations = input_json.get("operations", ["create", "read", "update", "delete", "list"])
    auth = input_json.get("auth", True)
    pagination = input_json.get("pagination", True)

    r_lower = resource.lower()
    r_title = resource.capitalize()

    extra_imports = set()
    for f in fields:
        if f["type"] in IMPORTS_FOR_TYPES:
            extra_imports.add(IMPORTS_FOR_TYPES[f["type"]])

    field_lines = []
    optional_field_lines = []
    for f in fields:
        pt = PYTHON_TYPE_MAP.get(f["type"], "str")
        if f.get("required", True):
            field_lines.append(f'    {f["name"]}: {pt}')
        else:
            field_lines.append(f'    {f["name"]}: {pt} | None = None')
        optional_field_lines.append(f'    {f["name"]}: {pt} | None = None')

    lines = [
        "from fastapi import FastAPI, HTTPException, Depends, Query",
        "from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials",
        "from pydantic import BaseModel",
    ]
    lines.extend(sorted(extra_imports))
    lines.append("")
    lines.append("app = FastAPI()")
    if auth:
        lines.append("security = HTTPBearer()")
    lines.append("")
    lines.append("")
    lines.append(f"class {r_title}Create(BaseModel):")
    lines.extend(field_lines)
    lines.append("")
    lines.append("")
    lines.append(f"class {r_title}(BaseModel):")
    lines.append("    id: int")
    for fl in field_lines:
        lines.append(fl)
    lines.append("")
    lines.append("")

    lines.append(f"db_{r_lower}s: dict[int, dict] = {{}}")
    lines.append(f"counter_{r_lower} = 0")
    lines.append("")

    if auth:
        lines.append("")
        lines.append("def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):")
        lines.append('    if not credentials.credentials:')
        lines.append('        raise HTTPException(status_code=401, detail="Unauthorized")')
        lines.append("    return credentials.credentials")
        lines.append("")

    auth_dep = ", token: str = Depends(verify_token)" if auth else ""

    if "create" in operations:
        lines.append("")
        lines.append(f'@app.post("/{r_lower}s", status_code=201, response_model={r_title})')
        lines.append(f"def create_{r_lower}(payload: {r_title}Create{auth_dep}):")
        lines.append(f"    global counter_{r_lower}")
        lines.append(f"    counter_{r_lower} += 1")
        lines.append(f"    item = {{\"id\": counter_{r_lower}, **payload.model_dump()}}")
        lines.append(f"    db_{r_lower}s[counter_{r_lower}] = item")
        lines.append(f"    return item")

    if "list" in operations:
        params = ""
        if pagination:
            params = ", skip: int = Query(0), limit: int = Query(20)"
        lines.append("")
        lines.append(f'@app.get("/{r_lower}s", response_model=list[{r_title}])')
        lines.append(f"def list_{r_lower}s({auth_dep.lstrip(', ')}{params}):")
        if pagination:
            lines.append(f"    items = list(db_{r_lower}s.values())")
            lines.append(f"    return items[skip:skip + limit]")
        else:
            lines.append(f"    return list(db_{r_lower}s.values())")

    if "read" in operations:
        lines.append("")
        lines.append(f'@app.get("/{r_lower}s/{{item_id}}", response_model={r_title})')
        lines.append(f"def get_{r_lower}(item_id: int{auth_dep}):")
        lines.append(f"    if item_id not in db_{r_lower}s:")
        lines.append(f'        raise HTTPException(status_code=404, detail="Not found")')
        lines.append(f"    return db_{r_lower}s[item_id]")

    if "update" in operations:
        lines.append("")
        lines.append(f'@app.put("/{r_lower}s/{{item_id}}", response_model={r_title})')
        lines.append(f"def update_{r_lower}(item_id: int, payload: {r_title}Create{auth_dep}):")
        lines.append(f"    if item_id not in db_{r_lower}s:")
        lines.append(f'        raise HTTPException(status_code=404, detail="Not found")')
        lines.append(f"    db_{r_lower}s[item_id] = {{\"id\": item_id, **payload.model_dump()}}")
        lines.append(f"    return db_{r_lower}s[item_id]")

    if "delete" in operations:
        lines.append("")
        lines.append(f'@app.delete("/{r_lower}s/{{item_id}}", status_code=204)')
        lines.append(f"def delete_{r_lower}(item_id: int{auth_dep}):")
        lines.append(f"    if item_id not in db_{r_lower}s:")
        lines.append(f'        raise HTTPException(status_code=404, detail="Not found")')
        lines.append(f"    del db_{r_lower}s[item_id]")

    lines.append("")
    return "\n".join(lines)
