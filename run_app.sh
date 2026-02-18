#!/bin/bash

# SynapseOps — One-Click Runner
# This script sets up and starts both the Backend and Frontend.

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting SynapseOps Auto-Runner...${NC}"

# Get the script's directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Backend Setup ───
echo -e "${GREEN}🐍 Setting up Backend...${NC}"
cd "$PROJECT_ROOT/backend"

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

echo "Installing backend dependencies..."
./.venv/bin/pip install -r requirements.txt > /dev/null

# ─── Frontend Setup ───
echo -e "${GREEN}⚛️ Setting up Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies (this may take a minute)..."
    npm install > /dev/null
fi

# ─── Start Servers ───
echo -e "${BLUE}📡 Starting Servers...${NC}"

# Cleanup function to kill background processes on exit
cleanup() {
    echo -e "\n${BLUE}🛑 Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID
    exit
}

trap cleanup SIGINT

# Start Backend
echo "Backend: Starting on http://localhost:8000"
cd "$PROJECT_ROOT/backend"
./.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /dev/null 2>&1 &
BACKEND_PID=$!

# Start Frontend
echo "Frontend: Starting on http://localhost:5173"
cd "$PROJECT_ROOT/frontend"
npm run dev -- --host 0.0.0.0 --port 5173 > /dev/null 2>&1 &
FRONTEND_PID=$!

echo -e "${GREEN}✅ Both servers are running!${NC}"
echo -e "Press ${BLUE}Ctrl+C${NC} to stop both servers."

# Keep script running to maintain child processes
wait
