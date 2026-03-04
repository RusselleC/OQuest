@echo off
REM OQUEST Game Launcher
REM This script starts the development server and opens the game in your browser

setlocal enabledelayedexpansion

echo.
echo ========================================
echo     OQUEST - Game Launcher
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] NPM is not installed
    echo Please install Node.js properly
    echo.
    pause
    exit /b 1
)

echo [✓] Node.js and NPM detected
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo [!] Installing dependencies...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [✓] Dependencies installed
    echo.
)

REM Start dev server
echo [→] Starting game server...
echo.
echo ========================================
echo Server starting at http://localhost:5173
echo Close this window to stop the server
echo ========================================
echo.

REM Give it a moment to start, then open browser
timeout /t 2 /nobreak >nul

REM Try to open in default browser
start "" http://localhost:5173

REM Start the dev server
call npm run dev
