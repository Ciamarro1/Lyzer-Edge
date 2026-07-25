<#
.SYNOPSIS
  Deploy 4 Lyzer Edge experiment instances to Hugging Face Spaces.
.DESCRIPTION
  Creates 4 Spaces (exp-a, exp-b, exp-c, exp-d), configures env vars,
  and pushes the code to each one. Run from the repository root.
.PARAMETER Token
  Your Hugging Face access token (write scope).
.PARAMETER Username
  Hugging Face username (default: jonatanciamarro).
.PARAMETER NoPush
  If set, only creates Spaces and configures env vars, skipping git push.
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$Token,
  [string]$Username = "jonatanciamarro",
  [switch]$NoPush
)

$ErrorActionPreference = "Stop"

$experiments = @(
  @{ Name = "lyzer-edge-exp-a"; EnvFile = "lyzer edge/.env.exp-a"; Desc = "A - Stock" }
  @{ Name = "lyzer-edge-exp-b"; EnvFile = "lyzer edge/.env.exp-b"; Desc = "B - Leve" }
  @{ Name = "lyzer-edge-exp-c"; EnvFile = "lyzer edge/.env.exp-c"; Desc = "C - Medio" }
  @{ Name = "lyzer-edge-exp-d"; EnvFile = "lyzer edge/.env.exp-d"; Desc = "D - Agressivo" }
)

$apiBase = "https://huggingface.co/api"

# ─── Funcao: requisicao HTTP com JSON (contorna encoding do PS) ─────
function Invoke-HfApi($method, $url, $body) {
  $tmpFile = [System.IO.Path]::GetTempFileName()
  try {
    if ($body) {
      [System.IO.File]::WriteAllText($tmpFile, $body, [System.Text.UTF8Encoding]::new($false))
      $response = curl.exe -s -X $method $url `
        -H "Authorization: Bearer $Token" `
        -H "Content-Type: application/json" `
        -d "@$tmpFile" 2>&1
    } else {
      $response = curl.exe -s -X $method $url `
        -H "Authorization: Bearer $Token" 2>&1
    }
    return $response
  } finally {
    Remove-Item -LiteralPath $tmpFile -Force -ErrorAction SilentlyContinue
  }
}

# ─── Verificar token ────────────────────────────────────────────────
Write-Host "[1/4] Verificando token..." -ForegroundColor Cyan
try {
  $testResp = curl.exe -s -o nul -w "%{http_code}" -H "Authorization: Bearer $Token" "$apiBase/spaces?author=$Username&limit=1"
  if ($testResp -eq 200) {
    Write-Host "  OK - token valido (HTTP $testResp)" -ForegroundColor Green
  } elseif ($testResp -eq 401 -or $testResp -eq 403) {
    Write-Host "  Token rejeitado (HTTP $testResp). Gere um novo token em https://huggingface.co/settings/tokens" -ForegroundColor Red
    exit 1
  } else {
    Write-Host "  Resposta inesperada (HTTP $testResp), tentando continuar..." -ForegroundColor Yellow
  }
} catch {
  Write-Host "  Aviso: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ─── Criar Spaces ────────────────────────────────────────────────────
Write-Host "[2/4] Criando Spaces no Hugging Face..." -ForegroundColor Cyan
foreach ($exp in $experiments) {
  $spaceId = "$Username/$($exp.Name)"
  Write-Host "  Criando $spaceId..." -NoNewline

  $body = '{"name":"' + $exp.Name + '","type":"space","sdk":"docker"}'
  $result = Invoke-HfApi -method POST -url "$apiBase/repos/create" -body $body

  if ($result -match "error" -or $result -match "Cannot") {
    if ($result -match "already exists" -or $result -match "already") {
      Write-Host " ja existe" -ForegroundColor Yellow
    } else {
      Write-Host " ERRO: $result" -ForegroundColor Red
    }
  } else {
    Write-Host " OK" -ForegroundColor Green
  }
}

# ─── Configurar env vars em cada Space ───────────────────────────────
Write-Host "[3/4] Configurando variaveis de ambiente..." -ForegroundColor Cyan
foreach ($exp in $experiments) {
  $spaceId = "$Username/$($exp.Name)"
  Write-Host "  $($exp.Desc) -> $spaceId"

  $envContent = Get-Content -Path $exp.EnvFile -Raw
  $envLines = $envContent -split "`n" | Where-Object { $_ -match "^\w+=.+" }

  foreach ($line in $envLines) {
    $eqPos = $line.IndexOf("=")
    $key = $line.Substring(0, $eqPos).Trim()
    $value = $line.Substring($eqPos + 1).Trim()

    # Escape backslashes and quotes for JSON
    $escapedValue = $value -replace '\\', '\\' -replace '"', '\"'
    $secretBody = '{"key":"' + $key + '","value":"' + $escapedValue + '"}'

    $result = Invoke-HfApi -method POST -url "$apiBase/spaces/$spaceId/secrets" -body $secretBody

    if ($result -match "error" -and $result -notmatch "already exists" -and $result -notmatch "already") {
      Write-Host "    aviso $key -> $result" -ForegroundColor Yellow
    }
  }
  Write-Host "  OK env vars configuradas" -ForegroundColor Green
}

# ─── Push do codigo para cada Space ──────────────────────────────────
if (-not $NoPush) {
  Write-Host "[4/4] Fazendo push do codigo para os Spaces..." -ForegroundColor Cyan

  foreach ($exp in $experiments) {
    $spaceId = "$Username/$($exp.Name)"
    $remoteUrl = "https://${Username}:${Token}@huggingface.co/spaces/${spaceId}"

    Write-Host "  Push para $spaceId..."

    & cmd /c "git remote remove hf-$($exp.Name) 2>nul"
    & cmd /c "git remote add hf-$($exp.Name) $remoteUrl 2>nul"
    Write-Host "    Enviando codigo..."
    $tmpOut = [System.IO.Path]::GetTempFileName()
    & cmd /c "git push hf-$($exp.Name) master:main --force > `"$tmpOut`" 2>&1"
    $pushExit = $LASTEXITCODE
    Get-Content $tmpOut -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "      $_" }
    Remove-Item $tmpOut -Force -ErrorAction SilentlyContinue
    
    if ($pushExit -eq 0) {
      Write-Host "    OK codigo enviado" -ForegroundColor Green
    } else {
      Write-Host "    Atencao: falha no push (tente manualmente)" -ForegroundColor Yellow
    }
  }
} else {
  Write-Host "[4/4] Push manual:" -ForegroundColor Yellow
  foreach ($exp in $experiments) {
    $spaceId = "$Username/$($exp.Name)"
    Write-Host "  git remote add hf-$($exp.Name) https://${Username}:TOKEN@huggingface.co/spaces/${spaceId}"
    Write-Host "  git push hf-$($exp.Name) master:main"
  }
}

Write-Host "`n=== Deploy concluido! ===" -ForegroundColor Green
Write-Host "Spaces criados:" -ForegroundColor Cyan
foreach ($exp in $experiments) {
  Write-Host "  https://huggingface.co/spaces/$Username/$($exp.Name)  [$($exp.Desc)]"
}
