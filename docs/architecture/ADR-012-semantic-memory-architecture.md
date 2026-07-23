# ADR-012: Arquitetura de Memória Semântica & Grafo Cognitivo (Fase 6)

- **Status**: Aprovado pelo Architecture Decision Board (Principal Systems Architect, Knowledge Graph Specialist, Quant Infrastructure Lead)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🏛️ 1. Contexto & A Transição Epistemológica da Memória

Até a Fase 5.6.1, o **Lyzer Edge** construiu uma **Memória Episódica** (`causal_events_log`). A Memória Episódica é uma sequência cronológica linear de eventos ocorridos:

$$\text{Evento}_1 \rightarrow \text{Evento}_2 \rightarrow \dots \rightarrow \text{Evento}_N$$

Contudo, para tomar decisões superiores no futuro, o sistema necessita condensar episódios brutos em **Memória Semântica** (conhecimento abstrato, generalizado e estruturado em forma de rede).

O **ADR-012** define a arquitetura da Memória Semântica e do **Grafo Cognitivo de Causalidade**.

---

## 🕸️ 2. O Grafo Cognitivo de Causalidade (`CognitiveKnowledgeGraph`)

A memória deixa de ser uma sequência estática e passa a ser representada como um **Grafo Direcionado de Causalidade**:

```
 [ REGIME_C_VOLATILE ]  ──(causou)──►  [ LIQUIDITY_SWEEP_15M ]
           │                                      │
     (associado)                             (evidência)
           ▼                                      ▼
 [ VETO_REASON_LHDS ]   ──(preveniu)──►  [ CATASTROPHIC_LOSS_EVENT ]
```

### Tipos de Nós do Grafo:
1. **RegimeNode**: Regimes estatísticos e epistemológicos (ex: `REGIME_A_CONSENSUS`, `REGIME_C_VETO`).
2. **FeatureNode**: Estruturas de mercado detectadas (ex: `BULLISH_ORDER_BLOCK_15M`, `BUY_SIDE_LIQUIDITY`).
3. **DecisionNode**: Julgamento da Corte ECA e autorização de risco.
4. **OutcomeNode**: Resultado estatístico de PnL e slippage.

### Tipos de Arestas Causalmente Vinculadas:
- `CAUSED_BY` (Origem Causal)
- `EVIDENCED_BY` (Suporte de Evidência)
- `PREVENTED_BY` (Ação de Mitigação)
- `CORRELATED_WITH` (Associação Estatística)

---

## 📊 3. Transição de Memória Episódica para Memória Semântica

```
       MEMÓRIA EPISÓDICA (Fatos Linhares)
       causal_events_log (SQLite WAL)
                     │
                     │  (Mineração Batch & Agregação)
                     ▼
       MEMÓRIA SEMÂNTICA (Conhecimento Estruturado)
       semantic_patterns_db (Grafo & Relacional)
                     │
                     │  (Validação pelo CognitiveAuditor - ADR-011)
                     ▼
       MELHORIA OPERACIONAL (Runtime Adaptativo)
```

---

## 💾 4. Estrutura da Tabela `semantic_memory`

A camada de persistência da Memória Semântica é implementada no SQLite através da tabela `semantic_memory`:

```sql
CREATE TABLE IF NOT EXISTS semantic_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_id TEXT NOT NULL UNIQUE,
    pattern_type TEXT NOT NULL,
    conditions_json TEXT NOT NULL,
    observations_count INTEGER NOT NULL,
    success_rate REAL NOT NULL,
    avg_pnl REAL NOT NULL,
    confidence_score REAL NOT NULL,
    graph_edges_json TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

---

## 🎯 5. Benefícios & Próximos Passos (Fase 6.1 a 6.5)

1. **Explicabilidade de Nível Institucional**: Perguntas como *"Por que o sistema vetou operações no dia X?"* são respondidas navegando no Grafo Cognitivo.
2. **Prevenção Ativa de Catástrofes**: Padrões que demonstraram alta correlação com perdas históricas acionam a Corte ECA proativamente.
3. **Decisão Baseada em Contexto**: O agente ajusta sua postura não por intuição, mas por padrões semânticos confirmados estatisticamente.
