#!/usr/bin/env bash
# Starts backend (8000) and frontend (5173). Ctrl+C stops both.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
source backend/.venv/bin/activate 2>/dev/null || source backend/.venv/Scripts/activate
(cd backend && uvicorn app.main:app --reload --port 8000) &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT
cd frontend && npm run dev
