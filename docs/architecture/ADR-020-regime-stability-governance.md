# ADR-020: Regime Stability Governance

- **Status**: ACCEPTED
- **Date**: 2026-07-22
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

Uma adaptação que funciona em um único regime de mercado é uma **armadilha de overfitting**. O `AdaptiveScoreEngine` (ACS) mede confiança geral, mas não decompõe a performance por regime.

Exemplo real do problema:

```
Proposta: LHDS_THRESHOLD 0.90 → 0.85

Regime A (Trending):     +15% PnL  ✅
Regime B (Ranging):       +8% PnL  ✅
Regime C (Crisis):       -22% PnL  ❌
```

O ACS médio pode ser alto (+3.7% avg), mas a proposta é **letal em crise**.

---

## Decision

Definir as regras formais de **estabilidade multi-regime** para qualquer proposta adaptativa.

### Regimes Reconhecidos

| Regime | Código | Característica |
|--------|--------|---------------|
| Consensus/Trending | `REGIME_A` | Mercado direcional com volume |
| Divergent/Ranging | `REGIME_B` | Mercado lateral com baixa volatilidade |
| Crisis/High Vol | `REGIME_C` | Mercado em pânico ou correção forte |

### Regras de Governança

1. **Regra de Unanimidade Mínima**: Uma proposta só é elegível se produzir PnL positivo ($> 0\%$) em **todos** os regimes reconhecidos.

2. **Regra de Limite de Dano**: Uma proposta é bloqueada automaticamente se **qualquer** regime individual apresentar PnL inferior a $-10\%$.

3. **Regra de Variância Inter-Regime**: A variância de performance entre regimes não pode exceder $3\sigma$ da média. Propostas com alta dispersão são instáveis.

4. **Regime Stability Score (RSS)**:

$$RSS = 1 - \frac{\sigma(\text{PnL por regime})}{\mu(\text{PnL por regime}) + \epsilon}$$

Onde $\epsilon = 0.01$ para evitar divisão por zero.

- $RSS > 0.7$: Estável (promoção permitida)
- $0.4 \le RSS \le 0.7$: Instável (observação)
- $RSS < 0.4$: Rejeitado

---

## Consequences

### Positivas
- Previne adaptações que funcionam apenas em condições favoráveis.
- Força robustez genuína ao exigir performance em todos os regimes.
- O RSS quantifica a estabilidade de forma objetiva e reproduzível.

### Negativas
- Aumenta a taxa de rejeição de propostas (desejável: sobrevivência > performance).
- Requer dados históricos segmentados por regime (disponível via causal memory).
