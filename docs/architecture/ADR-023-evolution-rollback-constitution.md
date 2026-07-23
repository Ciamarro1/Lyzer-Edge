# ADR-023: Evolution Rollback Constitution

- **Status**: ACCEPTED
- **Date**: 2026-07-22
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

O `monitorAndRollback` do `AdaptivePipelineController` (Fase 7.1) executa rollback proativo em cenários simples ($Drawdown > 5\%$ ou $PnL < -2\%$). Porém, a decisão de reverter uma adaptação em produção precisa de regras constitucionais mais rigorosas e multidimensionais.

### Problema

> "Reverter uma adaptação é tão crítico quanto promovê-la. Um rollback errado é tão perigoso quanto uma promoção errada."

---

## Decision

Definir a **Constituição de Rollback Evolutivo** com regras absolutas e multidimensionais.

### Triggers de Rollback Automático (Qualquer Um Dispara)

| Trigger | Threshold | Severidade |
|---------|-----------|------------|
| Drawdown pós-promoção | $> 5\%$ | CRITICAL |
| PnL acumulado pós-promoção | $< -2\%$ | CRITICAL |
| Sharpe ratio delta | $< -0.3$ vs baseline | WARNING → CRITICAL após 100 trades |
| Taxa de veto constitucional | $> 40\%$ aumento vs baseline | CRITICAL |
| Win rate degradation | $< -15\%$ vs baseline | CRITICAL |

### Regras de Governança

1. **Rollback Imediato**: Triggers CRITICAL executam rollback sem espera.
2. **Rollback Condicional**: Triggers WARNING aguardam 100 trades de observação. Se persistirem, escalam para CRITICAL.
3. **Imutabilidade**: O estado rollback é registrado no Evolution Ledger com métricas completas.
4. **Quarentena**: Após rollback, a proposta original é marcada como `QUARANTINED` e não pode ser resubmetida por 1.000 ticks.
5. **Autoridade**: O `AutomaticRollbackEngine` tem autoridade para reverter sem aprovação da Corte ECA (a Corte já aprovou a promoção; a reversão é responsabilidade do Runtime).

### Período de Observação

Toda adaptação promovida entra em período de observação de **200 trades** antes de ser considerada `COMPLETED`. Durante este período, o `AdaptiveRuntimeMonitor` coleta métricas contínuas.

---

## Consequences

### Positivas
- Rollback multidimensional previne degradação silenciosa.
- Quarentena evita loops de promoção-rollback.
- Período de observação garante validação em produção real.

### Negativas
- Adaptações levam mais tempo para se tornarem permanentes (desejável: prudência > velocidade).
