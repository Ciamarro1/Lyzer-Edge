# ADR-021: Adaptive Evolution Runtime Architecture

- **Status**: ACCEPTED
- **Date**: 2026-07-22
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

O pipeline adaptativo do Lyzer Edge (Fases 7.0–7.2) constrói propostas, simula em shadow, avalia impacto multi-regime e submete à Corte ECA. Porém, após a aprovação da Corte, não existe um runtime formal que:

1. Execute a promoção como uma **transação atômica e reversível**
2. Monitore métricas de produção pós-promoção em tempo contínuo
3. Dispare rollback automático com base em thresholds configuráveis
4. Registre cada transição no Evolution Ledger

### Problema

> "Aprovar uma mudança ≠ Executar uma mudança com segurança."

---

## Decision

Criar o **Adaptive Evolution Runtime (AER)** como a camada operacional que governa a aplicação, monitoramento e reversão de adaptações em produção.

### Componentes

1. **`EvolutionExecutor`** — Cria `EvolutionTransaction` atômicas com snapshot do estado anterior, assinatura da corte e timestamp. Nunca altera diretamente: encapsula a mutação em uma transação rastreável.

2. **`ParameterVersionManager`** — Extensão do `ParameterVersionStore` com capacidade de diff, lineage (grafo de ancestralidade), e snapshot cognitivo completo (todos os parâmetros em um ponto no tempo).

3. **`AdaptiveRuntimeMonitor`** — Observa métricas de produção pós-promoção: Sharpe, drawdown, win rate, taxa de vetos constitucionais, divergência LHDS. Emite veredictos `KEEP`, `WARNING` ou `ROLLBACK_REQUIRED`.

4. **`AutomaticRollbackEngine`** — Motor de reversão automática com thresholds configuráveis. Restaura a versão anterior e registra no Evolution Ledger.

### Fluxo

```
ECA Court Approval
        │
        ▼
EvolutionExecutor.createTransaction()
        │
        ▼
ParameterVersionManager.promote()
        │
        ▼
AdaptiveRuntimeMonitor.startMonitoring()
        │
        ├─── KEEP (metrics healthy)
        │
        └─── ROLLBACK_REQUIRED (degradation)
                    │
                    ▼
        AutomaticRollbackEngine.rollback()
                    │
                    ▼
        EvolutionLedger.record(ROLLBACK)
```

### Estados de uma EvolutionTransaction

```
PENDING → EXECUTING → ACTIVE → COMPLETED
                              ↘ ROLLED_BACK
```

---

## Consequences

### Positivas
- Toda mutação é atômica, rastreável e reversível.
- Monitoramento pós-promoção contínuo com rollback automático.
- A produção nunca fica em estado inconsistente.

### Negativas
- Complexidade adicional no ciclo de vida de uma adaptação (aceitável: segurança > velocidade).
