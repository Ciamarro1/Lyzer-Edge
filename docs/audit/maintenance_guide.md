# Auditoria Técnica — Maintenance & Operations Guide
**Projeto**: Lyzer Edge  
**Arquivo**: `docs/audit/maintenance_guide.md`

---

## 1. Guia de Manutenção e Operação

### 1. Comandos de Manutenção Diária (em `lyzer edge/`)
- **Subir dev server e backend simultaneamente**: `npm run full`
- **Executar suíte de testes Vitest**: `npm test`
- **Verificar cobertura de testes**: `npm run coverage`
- **Verificar linter estático**: `npm run lint`

### 2. Procedimento de Reset de Estado Persistido
Se o banco SQLite de intenções (`intent_registry.db`) apresentar trava de restrição `UNIQUE`, execute os scripts de sprint que realizam a limpeza antes da reinicialização:
- No Windows PowerShell: `.\run-sprint-1.ps1`

### 3. Deploy de Experimentos Multi-Instância
Para criar 4 Hugging Face Spaces isolados com configurações de relaxamento distintas:
- Execute a partir da raiz: `.\deploy-experiments.ps1 -Token "hf_..."`
