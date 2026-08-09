Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Set-Location -Path "$PSScriptRoot\lyzer edge"
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  LYZER EDGE ANALYST — INICIALIZANDO ECOSSISTEMA FULL-STACK" -ForegroundColor Green
Write-Host "  Backend: http://localhost:7860" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Cyan
& npm.cmd run full
