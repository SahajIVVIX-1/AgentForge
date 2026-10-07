#!/usr/bin/env bash
# One-time local setup (macOS/Linux/Git Bash). Run from the project root.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv backend/.venv 2>/dev/null || python -m venv backend/.venv
# shellcheck disable=SC1091
source backend/.venv/bin/activate 2>/dev/null || source backend/.venv/Scripts/activate
pip install -r backend/requirements.txt -r backend/requirements-dev.txt
[ -f backend/.env ] || cp backend/.env.example backend/.env
(cd frontend && npm install && ([ -f .env ] || cp .env.example .env))
echo
echo "Setup done. Next: edit backend/.env (set AGENTFORGE_API_KEY), then run scripts/dev.sh"
