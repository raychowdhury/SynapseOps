SQLALCHEMY_TYPE_MAP = {
    "str": "String(255)",
    "int": "Integer",
    "float": "Float",
    "bool": "Boolean",
    "date": "Date",
    "datetime": "DateTime",
}

PYTHON_TYPE_MAP = {
    "str": "str",
    "int": "int",
    "float": "float",
    "bool": "bool",
    "date": "date",
    "datetime": "datetime",
}

IMPORTS_NEEDED = {
    "date": "from datetime import date",
    "datetime": "from datetime import datetime",
}


def generate_db_models(input_json: dict) -> str:
    resource = input_json["resource"]
    fields = input_json["fields"]
    relationships = input_json.get("relationships", [])

    r_lower = resource.lower()
    r_title = resource.capitalize()

    extra_imports = set()
    sa_types = set()
    for f in fields:
        sa_types.add(SQLALCHEMY_TYPE_MAP.get(f["type"], "String(255)").split("(")[0])
        if f["type"] in IMPORTS_NEEDED:
            extra_imports.add(IMPORTS_NEEDED[f["type"]])

    sa_types.add("Integer")

    for rel in relationships:
        sa_types.add("ForeignKey")

    lines = [
        "from sqlalchemy import Column, " + ", ".join(sorted(sa_types)),
        "from sqlalchemy.orm import relationship, DeclarativeBase",
    ]
    lines.extend(sorted(extra_imports))
    lines.append("")
    lines.append("")
    lines.append("class Base(DeclarativeBase):")
    lines.append("    pass")
    lines.append("")
    lines.append("")
    lines.append(f"class {r_title}(Base):")
    lines.append(f'    __tablename__ = "{r_lower}s"')
    lines.append("")
    lines.append("    id = Column(Integer, primary_key=True, index=True)")

    for f in fields:
        sa_type = SQLALCHEMY_TYPE_MAP.get(f["type"], "String(255)")
        nullable = "False" if f.get("required", True) else "True"
        col_args = [sa_type, f"nullable={nullable}"]

        validations = f.get("validations", {})
        if validations.get("unique"):
            col_args.append("unique=True")
        if "default" in validations:
            col_args.append(f"default={validations['default']!r}")

        lines.append(f"    {f['name']} = Column({', '.join(col_args)})")

    for rel in relationships:
        rel_resource = rel["resource"].capitalize()
        rel_lower = rel["resource"].lower()
        if rel["type"] == "many":
            lines.append(f"    {rel_lower}s = relationship(\"{rel_resource}\", back_populates=\"{r_lower}\")")
        elif rel["type"] == "one":
            lines.append(f"    {rel_lower}_id = Column(Integer, ForeignKey(\"{rel_lower}s.id\"))")
            lines.append(f"    {rel_lower} = relationship(\"{rel_resource}\", back_populates=\"{r_lower}s\")")

    lines.append("")
    return "\n".join(lines)


def generate_alembic_migration(input_json: dict) -> str:
    resource = input_json["resource"]
    fields = input_json["fields"]
    relationships = input_json.get("relationships", [])

    r_lower = resource.lower()
    r_title = resource.capitalize()

    col_lines = ['        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),']
    for f in fields:
        sa_type = SQLALCHEMY_TYPE_MAP.get(f["type"], "String(255)")
        nullable = "False" if f.get("required", True) else "True"
        col_lines.append(f'        sa.Column("{f["name"]}", sa.{sa_type}, nullable={nullable}),')

    for rel in relationships:
        if rel["type"] == "one":
            rel_lower = rel["resource"].lower()
            col_lines.append(f'        sa.Column("{rel_lower}_id", sa.Integer(), sa.ForeignKey("{rel_lower}s.id")),')

    cols = "\n".join(col_lines)

    return f'''"""create {r_lower}s table"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None


def upgrade():
    op.create_table(
        "{r_lower}s",
{cols}
    )
    op.create_index("ix_{r_lower}s_id", "{r_lower}s", ["id"])


def downgrade():
    op.drop_table("{r_lower}s")
'''
