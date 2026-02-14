SHELL := /bin/bash

.PHONY: dev dev-backend dev-frontend

dev:
	@./scripts/dev.sh

dev-backend:
	@./.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

dev-frontend:
	@cd synaptiq-connect && npm run dev
