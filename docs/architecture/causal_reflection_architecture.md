# Especificação de Arquitetura — Cognitive Reflection Layer (Fase 6.6)

- **Status**: Especificação Metacognitiva Aprovada
- **Data**: 2026-07-22
- **Autor**: Principal Systems Architect & Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🎯 1. Visão Geral da Fase 6.6

A **Fase 6.6 (Cognitive Reflection Layer)** adiciona a capacidade de **Metacognição** ao Lyzer Edge. O sistema deixa de apenas acumular conhecimento e passa a **revisar, auditar e questionar seu próprio conhecimento**.

```
             SEMANTIC MEMORY (Fase 6)
                        │
                        ▼
            [ ReflectionEngine ]  (Dream Cycle Offline)
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
 [ Counterfactual   [ Conflict       [ Confidence
   Simulator ]        Resolver ]       Decay Engine ]
       │                │                │
       └────────────────┼────────────────┘
                        ▼
          [ LearningReportGenerator ]
                        │
                        ▼
            [ ParameterProposal (Refletido) ]
                        │
                        ▼
           [ ECA Constitutional Court ]
```

---

## 🧩 2. Submódulos Executáveis (`src/causal-reflection/`)

1. **`ReflectionEngine.js`**: Coordena o ciclo offline de releitura de eventos e acionamento de simulações.
2. **`CounterfactualSimulator.js`**: Executa re-execuções hipotéticas em janelas históricas para testar variações de parâmetros.
3. **`KnowledgeConflictResolver.js`**: Arbitra conflitos entre regras contraditórias gravadas na memória semântica.
4. **`ConfidenceDecayEngine.js`**: Aplica meia-vida exponencial ($t_{1/2} = 30 \text{ dias}$) aos scores de confiança.
5. **`LearningReportGenerator.js`**: Gera auditorias institucionais em formato JSON/Markdown para a Corte ECA.
