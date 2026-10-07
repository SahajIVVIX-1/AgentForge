# One-time local setup for Windows PowerShell. Run from the project root:
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
python -m venv backend\.venv
& backend\.venv\Scripts\pip.exe install -r backend\requirements.txt -r backend\requirements-dev.txt
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
Push-Location frontend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Pop-Location
Write-Host "`nSetup done. Edit backend\.env (set AGENTFORGE_API_KEY), then run scripts\dev.ps1"
