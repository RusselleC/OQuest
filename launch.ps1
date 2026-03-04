# OQUEST Game Launcher (PowerShell)
# Run this script to start the game

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================"
Write-Host "    OQUEST - Game Launcher (PS)" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""

# Check if Node.js is installed
Write-Host "[→] Checking for Node.js..." -ForegroundColor Yellow
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCheck) {
    Write-Host "[✗] Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "    Please install from: https://nodejs.org/" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[✓] Node.js found: $(node --version)" -ForegroundColor Green
Write-Host ""

# Check if npm is installed
Write-Host "[→] Checking for NPM..." -ForegroundColor Yellow
$npmCheck = Get-Command npm -ErrorAction SilentlyContinue

if (-not $npmCheck) {
    Write-Host "[✗] NPM is not installed" -ForegroundColor Red
    exit 1
}

Write-Host "[✓] NPM found: $(npm --version)" -ForegroundColor Green
Write-Host ""

# Check and install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[!] Installing dependencies (this may take a minute)..." -ForegroundColor Yellow
    Write-Host ""
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[✗] Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host ""
    Write-Host "[✓] Dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# Start dev server
Write-Host "[→] Starting game server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================"
Write-Host "Server starting at http://localhost:5177" -ForegroundColor Cyan
Write-Host "Close this window to stop the server" -ForegroundColor Gray
Write-Host "========================================"
Write-Host ""

# Wait and open browser
Start-Sleep -Seconds 2
Start-Process "http://localhost:5177"

# Run dev server
npm run dev
