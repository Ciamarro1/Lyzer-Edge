# Helper Script to Configure Git and Push to GitHub & Hugging Face Spaces

param (
    [string]$GHToken = "",
    [string]$HFToken = "",
    [string]$GitUserEmail = "jonatanciamarro@gmail.com",
    [string]$GitUserName = "Ciamarro1",
    [string]$HFSpaceUrl = "https://huggingface.co/spaces/jonatanciamarro/lyzer-edge"
)

$env:PATH = "C:\Git\cmd;C:\Program Files\nodejs;" + $env:PATH

Write-Host "=== LYZER EDGE - GIT & HUGGING FACE PUSH UTILITY ===" -ForegroundColor Cyan

# 1. Configurar nome e email no Git
git config user.name "$GitUserName"
git config user.email "$GitUserEmail"
Write-Host "[OK] Git User: $GitUserName <$GitUserEmail>" -ForegroundColor Green

# 2. Push para o GitHub
if ($GHToken) {
    $ghUrl = "https://${GHToken}@github.com/Ciamarro1/Lyzer-Edge.git"
    git remote set-url origin $ghUrl
    Write-Host "[INFO] Enviando alterações para o GitHub..." -ForegroundColor Yellow
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCESSO] Push para o GitHub concluído!" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Falha no push para o GitHub." -ForegroundColor Red
    }
} else {
    Write-Host "`n[DICA GITHUB] Para fazer push automático para o GitHub, passe seu token:" -ForegroundColor Yellow
    Write-Host "  .\git-push-setup.ps1 -GHToken `"seu_github_token`"" -ForegroundColor Gray
}

# 3. Push para o Hugging Face
if ($HFToken) {
    $hfUrl = "https://jonatanciamarro:${HFToken}@huggingface.co/spaces/jonatanciamarro/lyzer-edge"
    git remote remove huggingface 2>$null
    git remote add huggingface $hfUrl
    Write-Host "[INFO] Enviando alterações para o Hugging Face..." -ForegroundColor Yellow
    git push huggingface main --force
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCESSO] Push para o Hugging Face concluído!" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Falha no push para o Hugging Face." -ForegroundColor Red
    }
} else {
    Write-Host "`n[DICA HUGGINGFACE] Para fazer push automático para o Hugging Face, passe seu token:" -ForegroundColor Yellow
    Write-Host "  .\git-push-setup.ps1 -HFToken `"seu_huggingface_token`"" -ForegroundColor Gray
}
