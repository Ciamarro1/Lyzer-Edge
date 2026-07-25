# Setup Cognitive Governance Workflow for Lyzer Edge
# Run this after copying .agents/ and skills_warehouse/

Write-Host "Configurando Cognitive Governance (/cg) no Lyzer Edge..." -ForegroundColor Green

# 1. Verificar estrutura
$required = @(
    ".agents\workflows\cg.md",
    ".agents\agent\orchestrator.md",
    ".agents\agent\cto-executive.md",
    ".agents\agent\cia.md",
    ".agents\agent\ponytail.md",
    ".agents\agent\frontend-specialist.md",
    ".agents\agent\backend-specialist.md",
    ".agents\agent\database-architect.md",
    ".agents\agent\security-auditor.md",
    ".agents\agent\penetration-tester.md",
    ".agents\skills\memory-system",
    ".agents\skills\code-review-graph",
    ".agents\skills\skillify",
    ".agents\skills\parallel-agents",
    "skills_warehouse\lyzer-labs\cto-cia\cto-executive-director.md",
    "skills_warehouse\lyzer-labs\cto-cia\cia-chief-intelligence-architect.md",
    "skills_warehouse\lyzer-labs\automation\ponytail-lazy-dev-mode.md"
)

$missing = @()
foreach ($path in $required) {
    if (-not (Test-Path $path)) {
        $missing += $path
    }
}

if ($missing.Count -gt 0) {
    Write-Host "Arquivos faltando:" -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host "  - $_" }
} else {
    Write-Host "Todos os arquivos principais presentes!" -ForegroundColor Green
}

# 2. Criar .opencode config se não existir
$opencodeConfig = @{
    agents = @{
        paths = @(
            ".agents/agent"
        )
    }
    skills = @{
        paths = @(
            ".agents/skills",
            "skills_warehouse"
        )
    }
    workflows = @{
        paths = @(
            ".agents/workflows"
        )
    }
} | ConvertTo-Json -Depth 5

if (-not (Test-Path ".opencode")) {
    New-Item -ItemType Directory -Path ".opencode" | Out-Null
}
$opencodeConfig | Out-File -Encoding utf8 ".opencode/config.json"
Write-Host "Criado .opencode/config.json" -ForegroundColor Green

# 3. Verificar se tem git
if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host "Git disponivel" -ForegroundColor Green
} else {
    Write-Host "Git nao encontrado - instale para push automatico" -ForegroundColor Yellow
}

# 4. Instrucoes de uso
Write-Host "
========================================
COMO USAR O /cg (Cognitive Governance)
========================================

No seu agent (opencode/claude-code/cursor), use:

  /cognitive-governance [Seu problema ou feature]

Ou o alias:
  /cg [Seu problema ou feature]

Exemplos:
  /cg Criar sistema de afiliados com tracking
  /cg Refatorar pipeline de deploy para Kubernetes
  /cg Adicionar autenticacao OAuth2 no frontend

O workflow fara:
1. Debate CIA x CTO (15 iteracoes) + Ponytail (5 iteracoes)
2. Execucao autonoma (6 pilares da fabrica)
3. Red Team (CAA + ACTO + penetration-tester)
4. Push seguro com security-auditor gatekeeper
5. Checkpoint final na memoria institucional

========================================
" -ForegroundColor Cyan