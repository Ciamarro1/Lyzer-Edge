# ADR-016: Controle de Versão de Parâmetros & Reversibilidade Total (Fase 7.0)

- **Status**: Aprovado pelo Architecture Decision Board (Principal Systems Architect, Release Governance Specialist, Quant Auditor)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🏛️ 1. Contexto & Rastreabilidade de Versões

O **ADR-016** formaliza o módulo `ParameterVersionStore`. No **Lyzer Edge**, nenhuma alteração de parâmetro aprovada substitui o registro anterior destrutivamente.

Toda alteração aprovada gera uma nova versão imutável do parâmetro com seu número semântico (`v1.0.0`, `v1.1.0`, `v1.2.0`), preservando a linhagem histórica completa.

---

## 🔄 2. Mecanismo Proativo de Rollback (`rollback()`)

Se uma versão de parâmetro aprovada e promovida para produção demonstrar degradação de performance pós-ativação ($Drawdown > 5\%$ ou $PnL < -2\%$), o sistema aciona o mecanismo proativo de Rollback de Nível Causal:

```sql
-- Restauração instantânea para a versão estável anterior
UPDATE parameter_versions
SET status = 'ROLLED_BACK', rollback_reason = 'DETERIORATION_POST_PROMOTION'
WHERE version = 'v1.2.0';

-- Reativação da versão aprovada anterior
UPDATE parameter_versions
SET status = 'ACTIVE'
WHERE version = 'v1.1.0';
```

---

## 💾 3. Tabela `parameter_versions` no SQLite WAL

A persistência do controle de versão de parâmetros é gerenciada pela tabela `parameter_versions`:

```sql
CREATE TABLE IF NOT EXISTS parameter_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL,
    parameter TEXT NOT NULL,
    version TEXT NOT NULL UNIQUE,
    value_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ROLLED_BACK, DEPRECATED
    proposal_id TEXT NOT NULL,
    approved_by TEXT NOT NULL DEFAULT 'ECA_COURT',
    created_at INTEGER NOT NULL,
    rollback_reason TEXT
);
```
