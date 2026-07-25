# Especificação de Arquitetura — Adaptive Intelligence Sandbox (Fase 7.0)

- **Status**: Especificação de Sandbox Aprovada
- **Data**: 2026-07-22
- **Autor**: Principal Systems Architect & Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🎯 1. Visão Geral da Fase 7.0

A **Fase 7.0 (Adaptive Intelligence Sandbox)** estabelece o laboratório interno e isolado no qual o **Lyzer Edge** simula e avalia sugestões de parâmetros adaptativos sem tocar no motor decisório real de produção.

```
                 causal_events_log / semantic_memory
                                │
                                ▼
                   [ ParameterProposalEngine ]  (Fase 7.0.1)
                                │
                                ▼
                   [ AdaptiveShadowEngine ]  (Fase 7.0.2)
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
      Produção Real (v1.0)               Shadow Simulation (Prop)
               │                                 │
               └────────────────┬────────────────┘
                                ▼
                     [ SHADOW_COMPARISON_EVENT ]
                                │
                                ▼
                   [ AdaptiveScoreEngine (ACS) ] (Fase 7.0.3)
                                │
                                ▼
                     [ ParameterVersionStore ]  (Fase 7.0.4)
                                │
                                ▼
                    [ ECA Constitutional Court ]
```

---

## 🧩 2. Submódulos da Fase 7.0

1. **`ParameterProposalEngine.js`**: Constrói e gerencia os objetos formais imutáveis `ParameterProposal`.
2. **`AdaptiveShadowEngine.js`**: Executa simulações paralelas não-destrutivas contra ticks reais de mercado e gera o evento `SHADOW_COMPARISON_EVENT`.
3. **`AdaptiveScoreEngine.js`**: Calcula a métrica institucional `Adaptive Confidence Score (ACS)` (corte de submissão $\text{ACS} > 95\%$).
4. **`ParameterVersionStore.js`**: Gerencia o histórico imutável de versões na tabela `parameter_versions` e executa a reversão proativa (`rollback()`).
