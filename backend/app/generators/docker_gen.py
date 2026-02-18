def generate_dockerfile(input_json: dict) -> str:
    return """FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
"""


def generate_requirements(input_json: dict) -> str:
    auth = input_json.get("auth", True)
    lines = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "alembic",
        "psycopg2-binary",
        "pydantic",
    ]
    if auth:
        lines.extend(["python-jose[cryptography]", "passlib[bcrypt]"])
    return "\n".join(lines) + "\n"


def generate_docker_compose(input_json: dict) -> str:
    resource = input_json["resource"].lower()
    return f"""version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${{POSTGRES_USER:-{resource}user}}
      POSTGRES_PASSWORD: ${{POSTGRES_PASSWORD:-{resource}pass}}
      POSTGRES_DB: ${{POSTGRES_DB:-{resource}_db}}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://{resource}user:{resource}pass@db:5432/{resource}_db
      SECRET_KEY: ${{SECRET_KEY:-change-me}}
    depends_on:
      - db

volumes:
  pgdata:
"""
