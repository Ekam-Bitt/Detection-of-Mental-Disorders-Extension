.PHONY: help bootstrap-model setup install-backend install-extension install-dev run-backend run-extension test-backend lint-backend lint-extension format format-backend format-extension clean docker-up docker-down

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

bootstrap-model: ## Download the quantized runtime model if it is missing
	.venv/bin/python backend/bootstrap_model.py

setup: ## Create .venv and install backend + extension dev dependencies
	python3 -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r backend/requirements.txt
	.venv/bin/pip install -r backend/requirements-dev.txt
	cd extension && npm ci

install-backend: ## Install backend dependencies
	cd backend && pip install -r requirements.txt

install-extension: ## Install extension dependencies
	cd extension && npm install

install-dev: install-backend install-extension ## Install all dependencies
	pip install -r backend/requirements-dev.txt

run-backend: bootstrap-model ## Run backend server locally
	cd backend && python -m flask --app wsgi:app run --port 8000 --debug

run-extension: ## Start extension development server
	cd extension && npm start

test-backend: ## Run backend tests
	pytest backend/tests/ -v

test-backend-cov: ## Run backend tests with coverage
	pytest backend/tests/ -v --cov=backend/app --cov-report=html --cov-report=term

lint-backend: ## Lint backend code
	flake8 backend/ --max-line-length=88 --extend-ignore=E203 --exclude=.venv,venv,__pycache__,.git
	black --check backend/

lint-extension: ## Lint extension code
	cd extension && npm run format:check

lint: lint-backend lint-extension ## Lint all code

format-backend: ## Format backend code
	black backend/

format-extension: ## Format extension code
	cd extension && npm run format

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
