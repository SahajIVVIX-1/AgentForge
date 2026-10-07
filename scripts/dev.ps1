# Starts backend (8000) in a new window and frontend (5173) here.
$root = Join-Path $PSScriptRoot ".."
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\backend'; & .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"
Set-Location "$root\frontend"
npm run dev
