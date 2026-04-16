.PHONY: help setup install-backend install-extension install-dev install-research run-backend run-extension test-backend lint-backend lint-extension lint format format-backend format-extension clean docker-up docker-down prepare-weak-labels sample-annotation-set build-final-dataset validate-splits evaluate-v2 export-student-onnx

PYTHON_BIN := $(shell if [ -x .venv/bin/python ]; then echo .venv/bin/python; else echo python3; fi)
PIP_BIN := $(shell if [ -x .venv/bin/pip ]; then echo .venv/bin/pip; else echo pip; fi)
PYTEST_BIN := $(shell if [ -x .venv/bin/pytest ]; then echo .venv/bin/pytest; else echo pytest; fi)
RUFF_BIN := $(shell if [ -x .venv/bin/ruff ]; then echo .venv/bin/ruff; else echo ruff; fi)
PRE_COMMIT_BIN := $(shell if [ -x .venv/bin/pre-commit ]; then echo .venv/bin/pre-commit; else echo pre-commit; fi)

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

setup: ## First-time setup: create venv, .env, and install deps
	@echo "🚀 Setting up development environment..."
	@if [ ! -d ".venv" ]; then \
		python3 -m venv .venv; \
		echo "✓ Created virtual environment"; \
	fi
	@if [ ! -f ".env" ]; then \
		echo "MODEL_ID=ekam28/emotion-detector" > .env; \
		echo "HF_HOME=./backend/app/model_cache" >> .env; \
		echo "LOG_LEVEL=DEBUG" >> .env; \
		echo "PYTHONPATH=./backend" >> .env; \
		echo "✓ Created .env file"; \
	fi
	@echo "✓ Installing dependencies..."
	@.venv/bin/pip install --upgrade pip
	@$(MAKE) install-dev
	@echo "✨ Setup complete! Activate your venv with: source .venv/bin/activate"

install-backend: ## Install backend dependencies
	$(PIP_BIN) install -e ".[ml]"

install-extension: ## Install extension dependencies
	@if command -v npm >/dev/null 2>&1; then \
		cd extension && if [ -f package-lock.json ]; then npm ci; else npm install; fi; \
	else \
		echo "⚠ npm not found, skipping extension dependencies"; \
	fi

install-dev: install-extension ## Install all dependencies
	$(PIP_BIN) install -e ".[dev,ml]"
	@if command -v $(PRE_COMMIT_BIN) >/dev/null 2>&1; then \
		$(PRE_COMMIT_BIN) install; \
	else \
		echo "⚠ pre-commit not found after pip install, skipping hook installation"; \
	fi

install-research: ## Install research dependencies and experiment tooling
	$(PIP_BIN) install -e ".[dev,ml,research]"

run-backend: ## Run backend server locally
	cd backend && $(PYTHON_BIN) -m flask --app wsgi:app run --port 8000 --debug

run-extension: ## Start extension development server
	cd extension && npm start

test-backend: ## Run backend tests
	$(PYTEST_BIN) backend/tests/ -v

test-backend-cov: ## Run backend tests with coverage
	$(PYTEST_BIN) backend/tests/ -v --cov=backend/app --cov-report=html --cov-report=term

lint-backend: ## Lint backend code with Ruff
	$(RUFF_BIN) check backend/

lint-extension: ## Lint extension code with Prettier
	cd extension && npx prettier --check .

lint: lint-backend lint-extension ## Lint all code

format-backend: ## Format backend code with Ruff
	$(RUFF_BIN) format backend/

format-extension: ## Format extension code with Prettier
	cd extension && npx prettier --write .

format: format-backend format-extension ## Format all code

clean: ## Clean build artifacts
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache .coverage htmlcov/
	rm -rf backend/app/model_cache/

docker-up: ## Start Docker containers
	docker compose up --build

docker-down: ## Stop Docker containers
	docker compose down

docker-logs: ## View Docker logs
	docker compose logs -f

health: ## Check backend health
	curl http://localhost:8000/health

prepare-weak-labels: ## Convert raw CSV data into v2 weak-label JSONL
	$(PYTHON_BIN) -m scripts.prepare_weak_labels $(ARGS)

sample-annotation-set: ## Sample a v2 annotation batch from prepared JSONL
	$(PYTHON_BIN) -m scripts.sample_annotation_set $(ARGS)

build-final-dataset: ## Build the final v2 dataset splits
	$(PYTHON_BIN) -m scripts.build_final_dataset $(ARGS)

validate-splits: ## Validate leakage and class balance for a v2 dataset
	$(PYTHON_BIN) -m scripts.validate_splits $(ARGS)

evaluate-v2: ## Evaluate a v2 predictions JSON file
	$(PYTHON_BIN) -m scripts.evaluate_v2 $(ARGS)

export-student-onnx: ## Export and quantize a distilled student model
	$(PYTHON_BIN) -m scripts.export_student_onnx $(ARGS)
