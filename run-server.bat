@echo off
title FitPulse Server & Dashboard
echo ========================================================
echo  FitPulse Coach & Trainee System
echo  Running on http://localhost:3000
echo ========================================================
echo.
timeout /t 1 >nul
start "" http://localhost:3000
node server.js
if %errorlevel% neq 0 (
    echo.
    echo Server stopped with error.
    pause
)
