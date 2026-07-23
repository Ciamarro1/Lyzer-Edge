# ADR-018: Adaptive Evaluation Architecture

- **Status**: ACCEPTED
- **Date**: 2026-07-22
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

O `AdaptivePipelineController` (Fase 7.1) conecta reflexão → sandbox → corte → promoção. Porém, a avaliação de uma proposta adaptativa é unidimensional: o ACS mede confiança estatística, mas **não mede o custo sistêmico da mudança**.

Uma proposta pode ter ACS > 95% e ainda assim:
- Aumentar a frequência de operações em +40% (mais risco operacional)
- Aumentar a exposição de capital em +15%
- Ser instável em regimes de crise
- Degradar o Sharpe Ratio quando normalizado por drawdown

### Problema

> "Uma adaptação que melhora uma métrica isolada mas degrada o sistema como um todo é uma adaptação tóxica."

---

## Decision

Criar a camada `src/adaptive-evaluation/` com 4 módulos que avaliam o **impacto multidimensional** de cada proposta adaptativa antes da promoção.

### Módulos

1. **`AdaptationImpactAnalyzer.js`** — Mede o impacto sistêmico em 4 dimensões:
   - Trade Frequency Delta (variação na frequência de operações)
   - Risk Exposure Delta (variação na exposição de capital)
   - Max Drawdown Delta (variação no drawdown máximo)
   - Sharpe Ratio Delta (variação no índice de Sharpe)

2. **`RegimeStressEvaluator.js`** — Testa a estabilidade da proposta em múltiplos regimes de mercado:
   - Regime A (Consensus/Trending)
   - Regime B (Divergent/Ranging)
   - Regime C (Crisis/High Volatility)
   - Rejeição automática se qualquer regime individual apresentar PnL negativo superior a -10%

3. **`AdaptationRiskScore.js`** — Calcula o **Adaptive Risk Score (ARS)** composto:
   - ARS ∈ [0, 100]
   - 0-30: SAFE (promoção permitida)
   - 30-60: OBSERVATION (requer mais dados)
   - 60-80: ECA_REVIEW (requer aprovação explícita da Corte)
   - 80+: BLOCKED (promoção proibida)

4. **`EvolutionLedger.js`** — Registra a história genética do sistema:
   - Cada promoção, rollback e rejeição forma um registro imutável
   - Permite reconstruir a linhagem completa de decisões adaptativas
   - Registra o "DNA" paramétrico do sistema em cada ponto no tempo

### Integração com Pipeline

O `AdaptivePipelineController` ganha um novo gate entre SCORE e COURT:

```
SCORE (ACS) → EVALUATE (ARS + Regime + Impact) → COURT → PROMOTE
```

Uma proposta precisa passar por **ambos** os gates:
- ACS > 95% (confiança estatística)
- ARS < 60 (risco sistêmico aceitável)

---

## Consequences

### Positivas
- Previne adaptações tóxicas que melhoram uma métrica isolada mas degradam o sistema.
- Cria uma memória evolutiva auditável do sistema.
- Permite análise histórica de "por que o sistema evoluiu desta forma".

### Negativas
- Aumenta a latência do ciclo adaptativo (aceitável: adaptação não é tempo-real).
- Aumenta a taxa de rejeição de propostas (desejável: rigor > velocidade).
