# ADR-022: Parameter Version Governance

- **Status**: ACCEPTED
- **Date**: 2026-07-22
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

O `ParameterVersionStore` (Fase 7.0.4) registra versões individuais de parâmetros. Porém, o sistema cognitivo do Lyzer Edge opera com **múltiplos parâmetros interdependentes**. Alterar `LHDS_THRESHOLD` sem registrar o estado simultâneo de `CONSENSUS_LIMIT` e `TRG_THRESHOLD` cria uma lacuna de rastreabilidade.

### Problema

> "Saber que LHDS mudou de 0.90 para 0.85 não é suficiente. É preciso saber qual era o estado cognitivo completo naquele instante."

---

## Decision

Criar o **`ParameterVersionManager`** com 3 capacidades:

### 1. Cognitive Snapshot
Captura imutável de **todos** os parâmetros cognitivos em um ponto no tempo.

```json
{
  "snapshot_id": "snap_1784770000",
  "version": "v1.1.0",
  "parameters": {
    "TruthKernel.LHDS_VETO_LIMIT": 0.85,
    "CSRL.CONSENSUS_LIMIT": 0.40,
    "ExecutionTrigger.TRG_THRESHOLD": 0.45
  },
  "created_at": 1784770000000
}
```

### 2. Diff
Comparação entre dois snapshots mostrando exatamente o que mudou.

```json
{
  "from": "v1.0.0",
  "to": "v1.1.0",
  "changes": [
    { "parameter": "TruthKernel.LHDS_VETO_LIMIT", "from": 0.90, "to": 0.85, "delta_pct": -5.56 }
  ],
  "unchanged_count": 2
}
```

### 3. Lineage
Grafo dirigido de ancestralidade entre versões, formando a árvore genealógica do sistema.

```
v1.0.0 → v1.1.0 → v1.2.0
                 ↘ v1.1.1 (rollback branch)
```

---

## Consequences

### Positivas
- Rastreabilidade completa do estado cognitivo em qualquer ponto no tempo.
- Diffs permitem auditoria precisa de "o que mudou e por quê".
- Lineage permite visualizar a história genética como grafo.

### Negativas
- Snapshots crescem linearmente com o número de promoções (mitigado por retenção temporal).
