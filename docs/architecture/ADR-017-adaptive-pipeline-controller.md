# ADR-017: Adaptive Pipeline Controller Architecture

- **Status**: ACCEPTED
- **Date**: 2026-07-22
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

A Fase 7.0 (Adaptive Intelligence Sandbox) está operacional como um laboratório isolado.
Porém, os 4 módulos (`ParameterProposalEngine`, `AdaptiveShadowEngine`, `AdaptiveScoreEngine`, `ParameterVersionStore`) operam de forma manual: um operador externo deve instanciar propostas, alimentar comparações shadow e calcular o ACS.

Para que a inteligência adaptativa funcione como um **organismo autônomo e governado**, é necessário um **controlador de pipeline** que conecte:

```
Causal Reflection (Fase 6.6) → Adaptive Sandbox (Fase 7.0) → ECA Court → Produção
```

---

## Decision

Criar o **`AdaptivePipelineController`** como o orquestrador central do ciclo adaptativo do Lyzer Edge.

### Fluxo de Dados

```
CausalReflectionFacade.runDreamCycle()
        │
        ▼
   Dream Report (counterfactuals, decayed patterns, conflicts)
        │
        ▼
AdaptivePipelineController.runAdaptiveCycle()
        │
        ├─────── 1. EXTRACT ─────────────────────────────────┐
        │   Extrai sugestões de parâmetros do relatório      │
        │   de reflexão (counterfactuals com ganho > 5%,     │
        │   padrões com confiança alta, conflitos resolvidos)│
        │                                                     │
        ├─────── 2. PROPOSE ─────────────────────────────────┐
        │   ParameterProposalEngine.createProposal()         │
        │   Aplica Boundary Clamping (±15%)                  │
        │                                                     │
        ├─────── 3. AUDIT ───────────────────────────────────┐
        │   CognitiveAuditor.auditProposal()                 │
        │   Rejeição automática por evidência insuficiente   │
        │                                                     │
        ├─────── 4. SHADOW ──────────────────────────────────┐
        │   AdaptiveShadowEngine.runShadowComparison()       │
        │   N comparações contra ticks reais                 │
        │                                                     │
        ├─────── 5. SCORE ───────────────────────────────────┐
        │   AdaptiveScoreEngine.calculateACS()               │
        │   ACS < 80% → REJECT                              │
        │   80% ≤ ACS ≤ 95% → OBSERVE                       │
        │   ACS > 95% → SUBMIT TO ECA                       │
        │                                                     │
        ├─────── 6. COURT ───────────────────────────────────┐
        │   ECA Court validation (no adaptation of court)    │
        │   Court validates without learning                 │
        │                                                     │
        └─────── 7. PROMOTE ─────────────────────────────────┘
            ParameterVersionStore.saveVersion()
            Monitored for post-promotion degradation
```

### Axiomas Invioláveis

1. **A Corte ECA nunca aprende** — O `AdaptivePipelineController` submete propostas como `rawState` + `requestPayload`, sem injetar `confidence` ou `prediction` (que vetariam por `VETO_CONFIDENCE_ARROGANCE`).
2. **Rollback proativo** — Se a versão promovida causar degradação ($Drawdown > 5\%$ ou $PnL < -2\%$), o controller executa `rollback()` automaticamente.
3. **Observação mínima** — Nenhuma proposta é submetida com menos de 1.000 ticks de observação shadow.
4. **Imutabilidade do registro** — Cada passo do pipeline emite um evento causal rastreável.

---

## Consequences

### Positivas
- Pipeline adaptativo 100% autônomo e governado.
- Rastreabilidade completa do ciclo: reflexão → proposta → simulação → scoring → corte → promoção.
- Risco controlado por múltiplas gates antes de qualquer alteração em produção.

### Negativas
- Aumento da complexidade do grafo de dependências entre módulos.
- Latência do ciclo completo pode ser de minutos (aceitável dado que adaptação não é tempo-real).
