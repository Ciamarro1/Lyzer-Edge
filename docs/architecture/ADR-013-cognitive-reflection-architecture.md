# ADR-013: Arquitetura de Reflexão Cognitiva & Raciocínio Contrafactual (Fase 6.6)

- **Status**: Aprovado pelo Architecture Decision Board (Principal Systems Architect, Metacognition Specialist, Quant Epistemologist)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🏛️ 1. Contexto & A Transição de Aprendizado para Metacognição

Nas Fases 5.3 a 6.5, o **Lyzer Edge** construiu uma memória causal completa (CCS = 100.0%) e a camada de aprendizado semântico (Fase 6). 

Contudo, sistemas de aprendizado direto sem revisão de segunda ordem sofrem de três patologias graves:
1. **Decaimento e Inércia de Confiança**: Regras validadas no passado perdem eficácia conforme a topologia de mercado evolui, mas continuam registradas com 90%+ de confiança.
2. **Conflito Epistêmico**: Duas regras semânticas contraditórias geradas em instantes temporais distintos geram ambiguidades na tomada de decisão.
3. **Ausência de Cognição Offline ("Dream Cycle")**: O aprendizado ocorre unicamente durante a recepção de ticks, impedindo o reprocessamento de episódios históricos e a simulação de mundos contrafactuais ("O que teria acontecido se a regra X estivesse ativa?").

O **ADR-013** formaliza a **Fase 6.6 — Cognitive Reflection Layer (Metacognição)**.

> *"Um sistema inteligente aprende. Um sistema metacognitivo questiona o próprio aprendizado."*

---

## 🔬 2. Os 4 Pilares da Metacognição Operacional

```
                    semantic_memory (SQLite WAL)
                               │
                               ▼
               [ ReflectionEngine ("Dream Cycle") ]
                               │
     ┌─────────────────────────┼─────────────────────────┐
     ▼                         ▼                         ▼
[ Counterfactual     [ Knowledge Conflict      [ Confidence Decay
  Simulator ]          Resolver ]                Engine ]
     │                         │                         │
     └─────────────────────────┼─────────────────────────┘
                               ▼
                [ ParameterProposal (Refletido) ]
                               │
                               ▼
                   [ ECA Constitutional Court ]
```

---

## 📐 3. Os Submódulos da Fase 6.6

### 1. `ReflectionEngine.js` ("Dream Cycle")
- Executa ciclos de reflexão offline reprocessando episódios da `causal_events_log`.
- Simula cenários agregados sem impactar a latência do pipeline crítico em tempo real.

### 2. `CounterfactualSimulator.js`
- Responde a perguntas contrafactuais do tipo: *"Se o limite LHDS fosse $0.85$ em vez de $0.90$ durante os últimos 90 dias, quantas falhas ontológicas teriam sido evitadas?"*

### 3. `KnowledgeConflictResolver.js`
- Detecta e resolve contradições no Grafo Cognitivo utilizando 5 vetores de arbitragem: recência, amostra ($N$), consistência em multi-regimes, sharpe ratio empírico e conformidade constitucional.

### 4. `ConfidenceDecayEngine.js`
- Aplica decaimento temporal exponencial ($t_{1/2} = 30 \text{ dias}$) aos scores de confiança da `semantic_memory`. Se uma hipótese não for re-confirmada por eventos causais recentes, sua confiança diminui gradualmente.

### 5. `LearningReportGenerator.js`
- Sintetiza os achados da reflexão em relatórios institucionais formatados para apreciação pela Corte ECA.

---

## 🛡️ 4. Regras e Invariantes de Metacognição

1. **Isolamento de Thread / Async Task**: O "Dream Cycle" e simulações contrafactuais devem ser executados em background sem bloquear o loop de ingestão do StreamEngine.
2. **Imutabilidade Histórica**: Simulações contrafactuais produzem registros na tabela `counterfactual_simulations` e jamais alteram os eventos históricos originais da `causal_events_log`.
3. **Decaimento Máximo Solicitado**: Se o score de confiança de uma hipótese decair abaixo de **0.30**, a hipótese é automaticamente arquivada.
