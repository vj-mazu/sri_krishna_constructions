@echo off
title Stop Sri Krishna Constructions ERP
color 0e
echo ==============================================================================
echo       STOPPING SRI KRISHNA CONSTRUCTIONS ERP PROCESSES
echo ==============================================================================
echo.

:: Kill processes running on port 5000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)

:: Kill processes running on port 5173 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)

echo [OK] Both Backend and Frontend processes stopped cleanly.
echo.
pause
