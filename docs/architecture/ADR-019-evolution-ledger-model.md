# ADR-019: Evolution Ledger Model

- **Status**: ACCEPTED
- **Date**: 2026-07-22
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

O `ParameterVersionStore` (Fase 7.0.4) registra versões de parâmetros em `parameter_versions`. Porém, ele armazena apenas o estado final (versão, valor, status). Não registra:

- O **contexto decisório** que levou à promoção
- O **resultado observado** após a promoção
- A **linhagem causal** entre versões
- Os **motivos de rollback** com métricas concretas

Sem essa informação, o sistema não pode responder:

> "Qual foi a história genética que me trouxe até aqui?"

---

## Decision

Criar o **Evolution Ledger** como um registro imutável e auditável da história evolutiva do Lyzer Edge.

### Schema: `evolution_ledger`

```sql
CREATE TABLE evolution_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ledger_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,          -- PROMOTION | ROLLBACK | REJECTION | OBSERVATION
    module TEXT NOT NULL,
    parameter TEXT NOT NULL,
    from_version TEXT,
    to_version TEXT,
    from_value_json TEXT,
    to_value_json TEXT,
    acs_score REAL,
    ars_score REAL,
    regime_stability_json TEXT,
    impact_analysis_json TEXT,
    reason TEXT NOT NULL,
    proposal_id TEXT,
    decided_by TEXT NOT NULL DEFAULT 'ECA_COURT',
    observed_result_json TEXT,         -- Populated post-promotion after observation period
    created_at INTEGER NOT NULL
)
```

### Event Types

| Type | When |
|------|------|
| `PROMOTION` | Parameter version promoted to production |
| `ROLLBACK` | Active version reverted due to degradation |
| `REJECTION` | Proposal rejected by ARS, Regime, or Court |
| `OBSERVATION` | Proposal in observation (80% ≤ ACS ≤ 95% or 30 ≤ ARS ≤ 60) |

### Axioms

1. **Immutability**: Records are append-only. No updates or deletes.
2. **Completeness**: Every adaptation decision (approve, reject, rollback) is recorded.
3. **Causal Linkage**: `from_version` → `to_version` creates a directed evolution graph.
4. **Post-Hoc Observation**: `observed_result_json` is populated after the observation period to close the feedback loop.

---

## Consequences

### Positivas
- Rastreabilidade completa da evolução paramétrica.
- Permite análise de "por que o sistema está neste estado".
- Base para seleção evolutiva futura (Fase 8).

### Negativas
- Crescimento contínuo da tabela (mitigado por particionamento temporal futuro).
