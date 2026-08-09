@echo off
title Lyzer Edge - Full-Stack Execution
cd /d "%~dp0\lyzer edge"
echo ========================================================================
echo   LYZER EDGE ANALYST — INICIALIZANDO ECOSSISTEMA FULL-STACK
echo   Backend: http://localhost:7860
echo   Frontend: http://localhost:5173
echo ========================================================================
echo.
call npm.cmd run full
pause
