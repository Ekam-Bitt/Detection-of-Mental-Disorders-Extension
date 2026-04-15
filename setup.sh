#!/bin/bash

set -e

echo "🚀 Setting up Detection of Mental Disorders Extension for Development"
echo "===================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓${NC} Python: $PYTHON_VERSION"
else
    echo -e "${RED}✗${NC} Python 3 not found. Please install Python 3.10+"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Node.js not found. Extension development will be limited."
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓${NC} Docker: $DOCKER_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Docker not found. You'll need it for backend development."
fi

# Create virtual environment
echo -e "\n${YELLOW}Setting up Python virtual environment...${NC}"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo -e "${GREEN}✓${NC} Created virtual environment"
else
    echo -e "${GREEN}✓${NC} Virtual environment already exists"
fi

# Activate virtual environment
source .venv/bin/activate

# Upgrade pip
echo -e "\n${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip -q

# Install backend dependencies
echo -e "\n${YELLOW}Installing backend dependencies...${NC}"
cd backend
pip install -r requirements.txt -q
echo -e "${GREEN}✓${NC} Backend dependencies installed"

# Install dev dependencies
echo -e "\n${YELLOW}Installing development dependencies...${NC}"
if [ -f "requirements-dev.txt" ]; then
    pip install -r requirements-dev.txt -q
    echo -e "${GREEN}✓${NC} Dev dependencies installed"
else
    pip install pytest pytest-cov pytest-flask -q
    echo -e "${GREEN}✓${NC} Basic test dependencies installed"
fi
cd ..

# Install extension dependencies
echo -e "\n${YELLOW}Setting up extension...${NC}"
if command -v node &> /dev/null; then
    cd extension
    if [ ! -d "node_modules" ]; then
        npm install -q
        echo -e "${GREEN}✓${NC} Extension dependencies installed"
    else
        echo -e "${GREEN}✓${NC} Extension dependencies already installed"
    fi
    cd ..
else
    echo -e "${YELLOW}⚠${NC} Skipping extension setup (Node.js not available)"
fi

# Install pre-commit hooks
echo -e "\n${YELLOW}Setting up pre-commit hooks...${NC}"
if command -v pre-commit &> /dev/null; then
    pre-commit install
    echo -e "${GREEN}✓${NC} Pre-commit hooks installed"
else
    pip install pre-commit -q
    pre-commit install
    echo -e "${GREEN}✓${NC} Pre-commit installed and configured"
fi

# Create .env file for local development
echo -e "\n${YELLOW}Creating development configuration...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Backend Configuration
MODEL_ID=ekam28/emotion-detector
HF_HOME=./backend/app/model_cache
LOG_LEVEL=DEBUG

# Development
PYTHONPATH=./backend
EOF
    echo -e "${GREEN}✓${NC} Created .env file"
else
    echo -e "${GREEN}✓${NC} .env file already exists"
fi

# Summary
echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Activate virtual environment: ${GREEN}source .venv/bin/activate${NC}"
echo -e "2. Start backend with Docker: ${GREEN}docker compose up --build${NC}"
echo -e "   Or run locally: ${GREEN}make run-backend${NC}"
echo -e "3. Load extension in Chrome:"
echo -e "   - Go to ${GREEN}chrome://extensions/${NC}"
echo -e "   - Enable ${GREEN}Developer mode${NC}"
echo -e "   - Click ${GREEN}Load unpacked${NC} and select the ${GREEN}extension${NC} folder"
echo -e "\n${YELLOW}Useful commands:${NC}"
echo -e "  ${GREEN}make help${NC}           - Show all available commands"
echo -e "  ${GREEN}make test-backend${NC}   - Run backend tests"
echo -e "  ${GREEN}make lint${NC}           - Lint all code"
echo -e "  ${GREEN}make format${NC}         - Format all code"
echo -e "  ${GREEN}make docker-up${NC}      - Start Docker containers"
echo -e "\n"
