# Especificação de Arquitetura — Cognitive Self Improvement Layer (Fase 6)

- **Status**: Especificação de Arquitetura Aprovada
- **Data**: 2026-07-22
- **Autor**: Principal Systems Architect & Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🎯 1. Visão Geral da Fase 6

A **Fase 6 (Cognitive Self Improvement Layer)** define o ecossistema no qual o **Lyzer Edge** transforma sua memória causal em conhecimento semântico e melhorias operacionais contínuas, sem violar a estabilidade constitucional do sistema.

```
             CAUSAL MEMORY (CCS 100.0%)
                        │
                        ▼
          [ MemoryMiningEngine ]  (Fase 6.1)
                        │
                        ▼
         [ HypothesisEvaluationEngine ]  (Fase 6.2)
                        │
                        ▼
           [ CognitiveKnowledgeGraph ]  (Fase 6.4)
                        │
                        ▼
            [ CognitiveAuditor ]  (Fase 6.5)
                        │
                        ▼
             [ ParameterProposal ]  (Fase 6.3)
                        │
                        ▼
            [ ECA Constitutional Court ]
                        │
                        ▼
          [ Semantic Memory & Runtime Update ]
```

---

## 🧩 2. Submódulos da Fase 6

### 6.1 `MemoryMiningEngine.js`
- Extrai padrões repetitivos da tabela `causal_events_log`.
- Identifica combinações de tensores, regimes e estruturas SMC correlacionadas a resultados de sucesso ou falha.

### 6.2 `HypothesisEvaluationEngine.js`
- Responde à pergunta: *"A hipótese estava errada ou o contexto de mercado mudou?"*
- Avalia divergências entre a hipótese predita e a realidade empírica pós-fill.

### 6.3 `AdaptiveParameterLayer.js`
- Modela propostas formais de alteração (`ParameterProposal`).
- Garante que nenhuma alteração seja aplicada sem aprovação explícita da Corte ECA.

### 6.4 `CognitiveKnowledgeGraph.js`
- Organiza o conhecimento semântico em um grafo direcionado de relações de causa, evidência, mitigação e consequência.

### 6.5 `CognitiveAuditor.js`
- Realiza o "Self Audit" proativo: verifica amostragem mínima ($N \ge 500$), viés temporal, estabilidade multi-regime e ausência de conflitos constitucionais.

---

## 🛡️ 3. Tabela Comparativa de Governança

| Dimensão | Bot Tradicional | Lyzer Edge (Fase 6) |
|---|---|---|
| **Memória** | Apenas PnL e ordens passadas | Memória Causal Completa + Grafo Cognitivo Semântico |
| **Aprendizado** | Ajuste direto de parâmetros em tempo de execução | Proposta formal (`ParameterProposal`) sujeita a auditoria |
| **Proteção** | Nenhuma (sujeito a overfitting e falha catastrófica) | Veto Constitucional Absoluto + Amostragem Mínima ($N \ge 500$) |
| **Auditabilidade** | Nenhuma | Versionamento Semântico de Parâmetros e Rastreabilidade SHA-256 |
