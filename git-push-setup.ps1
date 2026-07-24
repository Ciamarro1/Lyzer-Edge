# Helper Script to Configure Git and Push to GitHub / Hugging Face Spaces

param (
    [string]$GitUserEmail = "",
    [string]$GitUserName = "",
    [string]$HFSpaceUrl = "",
    [string]$HFToken = ""
)

$env:PATH = "C:\Git\cmd;C:\Program Files\nodejs;" + $env:PATH

Write-Host "=== LYZER EDGE - GIT & HUGGING FACE PUSH SETUP ===" -ForegroundColor Cyan

# 1. Configurar nome e email no Git se fornecidos
if ($GitUserName -and $GitUserEmail) {
    git config --global user.name "$GitUserName"
    git config --global user.email "$GitUserEmail"
    Write-Host "[OK] Git user configurado: $GitUserName <$GitUserEmail>" -ForegroundColor Green
} else {
    Write-Host "[INFO] Para configurar seu usuário no Git, execute:" -ForegroundColor Yellow
    Write-Host "  git config --global user.name `"Seu Nome`""
    Write-Host "  git config --global user.email `"seu_email@exemplo.com`""
}

# 2. Configurar remote Hugging Face se a URL for fornecida
if ($HFSpaceUrl) {
    $existingHf = git remote | Where-Object { $_ -eq "huggingface" }
    if ($existingHf) {
        git remote set-url huggingface $HFSpaceUrl
        Write-Host "[OK] Remote 'huggingface' atualizado para: $HFSpaceUrl" -ForegroundColor Green
    } else {
        git remote add huggingface $HFSpaceUrl
        Write-Host "[OK] Remote 'huggingface' adicionado: $HFSpaceUrl" -ForegroundColor Green
    }
} else {
    Write-Host "`n[INFO] Remote 'origin' atual (GitHub):" -ForegroundColor Yellow
    git remote -v
    Write-Host "`n[DICA] Para adicionar seu Space do Hugging Face como remote, use:" -ForegroundColor Yellow
    Write-Host "  .\git-push-setup.ps1 -HFSpaceUrl `"https://huggingface.co/spaces/SEU_USUARIO/NOME_DO_SPACE`""
}

# 3. Instruções para Push
Write-Host "`n=== COMANDOS DE PUSH ===" -ForegroundColor Cyan
Write-Host "Para enviar alterações para o GitHub:" -ForegroundColor White
Write-Host "  git push origin main" -ForegroundColor Gray
Write-Host "`nPara enviar alterações para o Hugging Face:" -ForegroundColor White
Write-Host "  git push huggingface main" -ForegroundColor Gray
Write-Host "`nPara enviar para AMBOS (GitHub e Hugging Face):" -ForegroundColor White
Write-Host "  git push origin main; git push huggingface main" -ForegroundColor Gray
