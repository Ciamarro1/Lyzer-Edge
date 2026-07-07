@echo off
echo ========================================================================
echo   LYZER EDGE ANALYST — STARTING FULL-STACK REAL-TIME RUNTIME
echo ========================================================================
echo.

:: Add Node.js to PATH to ensure npm and node command availability
set PATH=C:\Program Files\nodejs\;%PATH%

:: Start the full-stack concurrent stream and dev server
call npm run full

pause
