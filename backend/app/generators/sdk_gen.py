def _build_json_dict(fields: list[dict]) -> str:
    pairs = []
    for f in fields:
        name = f["name"]
        pairs.append(f'"{name}": {name}')
    return "{" + ", ".join(pairs) + "}"


def generate_python_sdk(input_json: dict) -> str:
    resource = input_json["resource"]
    fields = input_json["fields"]
    operations = input_json.get("operations", ["create", "read", "update", "delete", "list"])
    auth = input_json.get("auth", True)

    r_lower = resource.lower()
    r_title = resource.capitalize()

    type_map = {"str": "str", "int": "int", "float": "float", "bool": "bool", "date": "str", "datetime": "str"}

    req_params = [f'{f["name"]}: {type_map.get(f["type"], "str")}' for f in fields if f.get("required", True)]
    opt_params = [f'{f["name"]}: {type_map.get(f["type"], "str")} | None = None' for f in fields if not f.get("required", True)]
    all_params = ", ".join(req_params + opt_params)
    json_dict = _build_json_dict(fields)

    lines = [
        '"""Auto-generated Python SDK"""',
        "import requests",
        "from dataclasses import dataclass",
        "",
        "",
        "@dataclass",
        f"class {r_title}:",
        "    id: int",
    ]
    for f in fields:
        t = type_map.get(f["type"], "str")
        if f.get("required", True):
            lines.append(f"    {f['name']}: {t}")
        else:
            lines.append(f"    {f['name']}: {t} | None = None")

    lines.extend([
        "",
        "",
        f"class {r_title}Client:",
        '    def __init__(self, base_url: str = "http://localhost:8000", token: str = ""):',
        "        self.base_url = base_url.rstrip('/')",
        "        self.token = token",
        "",
        "    @property",
        "    def _headers(self) -> dict:",
        '        h = {"Content-Type": "application/json"}',
    ])

    if auth:
        lines.append('        if self.token:')
        lines.append('            h["Authorization"] = f"Bearer {self.token}"')

    lines.extend([
        "        return h",
        "",
    ])

    if "create" in operations:
        lines.extend([
            f"    def create(self, {all_params}) -> {r_title}:",
            f'        resp = requests.post(',
            f'            f"{{self.base_url}}/{r_lower}s",',
            f"            json={json_dict},",
            "            headers=self._headers,",
            "        )",
            "        resp.raise_for_status()",
            f"        return {r_title}(**resp.json())",
            "",
        ])

    if "read" in operations:
        lines.extend([
            f"    def get(self, id: int) -> {r_title}:",
            f'        resp = requests.get(f"{{self.base_url}}/{r_lower}s/{{id}}", headers=self._headers)',
            "        resp.raise_for_status()",
            f"        return {r_title}(**resp.json())",
            "",
        ])

    if "list" in operations:
        lines.extend([
            f"    def list(self, skip: int = 0, limit: int = 20) -> list[{r_title}]:",
            f'        resp = requests.get(',
            f'            f"{{self.base_url}}/{r_lower}s",',
            '            params={"skip": skip, "limit": limit},',
            "            headers=self._headers,",
            "        )",
            "        resp.raise_for_status()",
            f"        return [{r_title}(**item) for item in resp.json()]",
            "",
        ])

    if "update" in operations:
        lines.extend([
            f"    def update(self, id: int, {all_params}) -> {r_title}:",
            f'        resp = requests.put(',
            f'            f"{{self.base_url}}/{r_lower}s/{{id}}",',
            f"            json={json_dict},",
            "            headers=self._headers,",
            "        )",
            "        resp.raise_for_status()",
            f"        return {r_title}(**resp.json())",
            "",
        ])

    if "delete" in operations:
        lines.extend([
            "    def delete(self, id: int) -> None:",
            f'        resp = requests.delete(f"{{self.base_url}}/{r_lower}s/{{id}}", headers=self._headers)',
            "        resp.raise_for_status()",
            "",
        ])

    lines.append("")
    return "\n".join(lines)


def generate_typescript_sdk(input_json: dict) -> str:
    resource = input_json["resource"]
    fields = input_json["fields"]
    operations = input_json.get("operations", ["create", "read", "update", "delete", "list"])
    auth = input_json.get("auth", True)

    r_lower = resource.lower()
    r_title = resource.capitalize()

    ts_map = {"str": "string", "int": "number", "float": "number", "bool": "boolean", "date": "string", "datetime": "string"}

    lines = [
        f"// Auto-generated TypeScript SDK for {r_title} API",
        "",
        f"export interface {r_title} {{",
        "  id: number;",
    ]
    for f in fields:
        t = ts_map.get(f["type"], "string")
        opt = "" if f.get("required", True) else "?"
        lines.append(f"  {f['name']}{opt}: {t};")
    lines.extend(["}", ""])

    lines.append(f"export interface {r_title}Create {{")
    for f in fields:
        t = ts_map.get(f["type"], "string")
        opt = "" if f.get("required", True) else "?"
        lines.append(f"  {f['name']}{opt}: {t};")
    lines.extend(["}", ""])

    lines.extend([
        f"export class {r_title}Client {{",
        "  private baseUrl: string;",
        "  private token: string;",
        "",
        '  constructor(baseUrl = "http://localhost:8000", token = "") {',
        '    this.baseUrl = baseUrl.replace(/\\/$/, "");',
        "    this.token = token;",
        "  }",
        "",
        "  private get headers(): Record<string, string> {",
        '    const h: Record<string, string> = { "Content-Type": "application/json" };',
    ])
    if auth:
        lines.append("    if (this.token) h[\"Authorization\"] = `Bearer ${this.token}`;")
    lines.extend([
        "    return h;",
        "  }",
        "",
    ])

    if "create" in operations:
        lines.extend([
            f"  async create(data: {r_title}Create): Promise<{r_title}> {{",
            f"    const res = await fetch(`${{this.baseUrl}}/{r_lower}s`, {{",
            '      method: "POST",',
            "      headers: this.headers,",
            "      body: JSON.stringify(data),",
            "    });",
            "    if (!res.ok) throw new Error(`Create failed: ${res.status}`);",
            "    return res.json();",
            "  }",
            "",
        ])

    if "read" in operations:
        lines.extend([
            f"  async get(id: number): Promise<{r_title}> {{",
            f"    const res = await fetch(`${{this.baseUrl}}/{r_lower}s/${{id}}`, {{ headers: this.headers }});",
            "    if (!res.ok) throw new Error(`Get failed: ${res.status}`);",
            "    return res.json();",
            "  }",
            "",
        ])

    if "list" in operations:
        lines.extend([
            f"  async list(skip = 0, limit = 20): Promise<{r_title}[]> {{",
            f"    const res = await fetch(`${{this.baseUrl}}/{r_lower}s?skip=${{skip}}&limit=${{limit}}`, {{ headers: this.headers }});",
            "    if (!res.ok) throw new Error(`List failed: ${res.status}`);",
            "    return res.json();",
            "  }",
            "",
        ])

    if "update" in operations:
        lines.extend([
            f"  async update(id: number, data: {r_title}Create): Promise<{r_title}> {{",
            f"    const res = await fetch(`${{this.baseUrl}}/{r_lower}s/${{id}}`, {{",
            '      method: "PUT",',
            "      headers: this.headers,",
            "      body: JSON.stringify(data),",
            "    });",
            "    if (!res.ok) throw new Error(`Update failed: ${res.status}`);",
            "    return res.json();",
            "  }",
            "",
        ])

    if "delete" in operations:
        lines.extend([
            "  async delete(id: number): Promise<void> {",
            f"    const res = await fetch(`${{this.baseUrl}}/{r_lower}s/${{id}}`, {{",
            '      method: "DELETE",',
            "      headers: this.headers,",
            "    });",
            "    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);",
            "  }",
            "",
        ])

    lines.extend(["}", ""])
    return "\n".join(lines)
