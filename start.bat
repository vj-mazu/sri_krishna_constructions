@echo off
title Sri Krishna Constructions ERP Launcher
color 0b
echo ==============================================================================
echo       SRI KRISHNA CONSTRUCTIONS - ENTERPRISE ERP SYSTEM LAUNCHER
echo ==============================================================================
echo.

:: Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    color 0c
    echo [ERROR] Node.js is not installed or not in your system PATH!
    echo Please install Node.js v18 or higher from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/3] Starting Backend API Server (Port 5000)...
start "SKC ERP - Backend Server (Port 5000)" cmd /k "cd /d %~dp0server && npm run dev"

echo [2/3] Waiting for Backend initialization...
ping 127.0.0.1 -n 4 >nul 2>&1

echo [3/3] Starting Frontend Client (Port 5173)...
start "SKC ERP - Frontend Client (Port 5173)" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ==============================================================================
echo  Both Backend and Frontend are now running!
echo.
echo  Backend API:      http://localhost:5000/api
echo  Frontend Web App: http://localhost:5173
echo.
echo  Default Login:
echo    Username: owner
echo    Password: owner123
echo ==============================================================================
echo.
echo Opening Sri Krishna Constructions ERP in your default browser...
ping 127.0.0.1 -n 3 >nul 2>&1
start http://localhost:5173

exit /b 0
