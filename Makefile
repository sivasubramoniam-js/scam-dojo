.PHONY: dev api web kb test lint typecheck openapi setup

PYTHON ?= ./apps/api/.venv/bin/python
UVICORN ?= ./apps/api/.venv/bin/uvicorn
PYTEST ?= ./apps/api/.venv/bin/pytest
RUFF ?= ./apps/api/.venv/bin/ruff
MYPY ?= ./apps/api/.venv/bin/mypy

setup:
	@echo "Setting up Python virtual environment..."
	cd apps/api && uv venv --python 3.12 && uv pip install -r requirements.txt
	@echo "Setting up Web dependencies..."
	pnpm install
	@echo "Building knowledge base..."
	$(MAKE) kb

kb:
	$(PYTHON) apps/api/scripts/build_kb.py

api:
	cd apps/api && ../../$(UVICORN) app.main:app --host 0.0.0.0 --port 8080 --reload

web:
	pnpm --filter web dev

dev:
	@echo "Starting Scam Dojo API (port 8080) and Web (port 3000)..."
	@trap 'kill 0' SIGINT SIGTERM EXIT; \
	(cd apps/api && ../../$(UVICORN) app.main:app --host 0.0.0.0 --port 8080 --reload) & \
	(pnpm --filter web dev) & \
	wait

test-api:
	PYTHONPATH=apps/api $(PYTEST) apps/api/tests -v

test-web:
	pnpm --filter web test

test: test-api test-web

lint-api:
	$(RUFF) check apps/api
	cd apps/api && .venv/bin/mypy app

lint-web:
	pnpm --filter web lint

lint: lint-api lint-web

typecheck:
	cd apps/api && .venv/bin/mypy app
	pnpm --filter web typecheck

openapi:
	$(PYTHON) apps/api/scripts/dump_openapi.py > apps/web/src/lib/openapi.json
	pnpm --filter web gen:api
