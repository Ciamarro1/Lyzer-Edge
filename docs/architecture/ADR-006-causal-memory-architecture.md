# ADR-006: Arquitetura de Memória Causal e Reconstrução Epistemológica (Fase 5.3)

- **Status**: Aprovado pelo Architecture Decision Board (CTO, Principal Data Architect, Quant Infrastructure Lead, SRE Lead)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🏛️ 1. Contexto & Problema Arquitetural

Nas Fases 1 a 5.2, o **Lyzer Edge** construiu um motor cognitivo determinístico de alta performance ($P_{50} = 0.336\text{ ms}$) e uma camada de persistência física em SQLite WAL Mode capaz de ingerir milhares de ticks por segundo sem bloqueios.

Contudo, a auditoria de persistência revelou uma lacuna fundamental no modelo de dados tradicional:

> **O banco de dados atual armazena apenas dados de mercado (`candles`) e ordens isoladas. Ele NÃO armazena a cadeia completa de causalidade contextual que motivou cada decisão.**

Em sistemas financeiros institucionais convencionais ("trading bots"), grava-se apenas o *resultado* (preço de compra/venda e PnL). Em um **Cognitive Market Operating System**, como o Lyzer Edge, isso é uma fragilidade estrutural.

Se o sistema tomou uma decisão de veto ou execução há 3 meses, é impossível responder empiricamente:
1. Qual era exatamente o vetor geométrico do CSRL naquele milissegundo?
2. Qual era o valor da tensão na malha de estresse C-CLIST?
3. Qual hipótese de regime a Corte Constitucional aplicou?
4. Qual foi o estado exato da realidade que o sistema enxergava naquele instante?

Para resolver essa limitação, a **Fase 5.3** projeta a **Arquitetura de Memória Causal (Causal Memory Architecture)**.

---

## 🎯 2. O Modelo de Evento Causal (Causal Event Schema)

Cada mutação de estado ou decisão cognitiva no Lyzer Edge passa a ser registrada como um **Evento Causal Imutável (Append-Only Causal Event)** com a seguinte estrutura estrita:

```json
{
  "event_id": "0190a6e4-4d80-7a00-8000-123456789abc",
  "timestamp": 1704067200000,
  "event_type": "CONSTITUTIONAL_VETO_ISSUED",
  "source": "ECA_COURT_NODE",
  "causation_id": "0190a6e4-4d7f-7a00-8000-987654321xyz",
  "correlation_id": "0190a6e4-4d70-7a00-8000-111111111111",
  "intent_id": "0190a6e4-4d75-7a00-8000-222222222222",
  "parent_event": "0190a6e4-4d7e-7a00-8000-333333333333",
  "version": "1.0.0",
  "payload": {
    "symbol": "BTCUSDT",
    "veto_reason": "VETO_REALITY_DIVERGENCE",
    "lhds_score": 0.842,
    "cclist_stress": 0.915,
    "eef_valid": false
  },
  "context": {
    "arl_mode": "LIVE",
    "regime_inferred": "REGIME_C_COLLAPSE",
    "scl_count": 0
  },
  "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

---

## 🧩 3. Separação Estrita dos 4 Tipos de Memória

A arquitetura segmenta a memória do sistema em 4 domínios funcionais desacoplados:

```
                      [ LY Z E R   E D G E ]
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     ▼                           ▼                           ▼
[ OPERATIONAL MEMORY ]     [ EPISODIC MEMORY ]     [ SEMANTIC MEMORY ]
- Posições Ativas          - Log do Append-Only    - Regimes Aprendidos
- Ordens Pendentes         - Trilha de Decisões    - Padrões de Estresse
- Riscos Correntes         - Timeline UUIDv7       - Hipóteses Validadas
     │                           │                           │
     └───────────────────────────┼───────────────────────────┘
                                 │
                                 ▼
                    [ CONSTITUTIONAL MEMORY ]
                    - Acórdãos da Corte ECA
                    - Jurisprudência de Vetos
                    - Limites de Risco Fixo
```

1. **Operational Memory (Memória Operacional)**: Estado transitório do ambiente em tempo real (RAM/V8 + tabelas de projeção rápida no SQLite).
2. **Episodic Memory (Memória Episódica)**: O log imutável append-only de todos os eventos ocorridos em sequência cronológica.
3. **Semantic Memory (Memória Semântica)**: Modelos de padrões aprendidos, distribuições estatísticas de estresse e hipóteses de mercado extraídas retrospectivamente.
4. **Constitutional Memory (Memória Constitucional)**: Registro histórico de decisões de veto, acórdãos da Corte ECA e matrizes de inviolabilidade.

---

## 🏛️ 4. Comparativo de Arquiteturas Propostas

Foram avaliadas 4 alternativas de arquitetura para suportar a Memória Causal:

| Alternativa | Descrição | Prós | Contras | Veredito |
|---|---|---|---|---|
| **A) SQLite Event Log** | Usar SQLite comum como tabela única de eventos. | Simples, zero infraestrutura adicional. | Sem projeções materializadas; leituras lentas. | Reprovado |
| **B) SQLite + Event Projection** | Event Log no SQLite + projeções em tabelas. | Bom desempenho de leitura. | Acoplamento entre gravação de log e projeção. | Reprovado |
| **C) SQLite WAL + Append-Only Log + Materialized Views** | Log append-only em SQLite WAL + Projeções assíncronas materializadas. | **Excelente performance ($P_{50} < 0.5\text{ms}$), integridade ACID, zero dependências externas complexas.** | Requer gerenciador de projeção na aplicação. | **APROVADO (Opção C)** |
| **D) Dedicated Event Store (Kafka/NATS/EventStoreDB)** | Cluster de Event Sourcing dedicado. | Desempenho massivamente distribuído. | Complexidade operacional e overhead desnecessário para single-node. | Reprovado |

---

## ⚡ 5. Decisão: Hybrid Causal Event Sourcing

O Lyzer Edge adotará o **Hybrid Causal Event Sourcing**:
- **Log Imutável (Append-Only)**: Fonte primária da verdade (`causal_events_log`).
- **Projeções Materializadas (State Views)**: Atualizadas de forma reativa para consultas instantâneas de alta velocidade (e.g. `current_positions`, `latest_spectrogram`).

---

## ⏪ 6. Capacidade de Reconstrução Temporal: "Rewind Market Reality"

Com o Hybrid Causal Event Sourcing, o sistema passa a possuir o motor de busca **Rewind Market Reality**.

Dado qualquer timestamp passado $T_0$, o sistema é capaz de executar a função:

$$\text{ReconstructState}(T_0) = \text{Fold}(\text{InitialState}, \text{Events}[0 \dots T_0])$$

Isso permite que engenheiros de quant e auditores de risco façam um "viagem no tempo" epistemológica:
- Visualizar a matriz CSRL exatamente como ela existia em $T_0$.
- Re-executar o julgamento da Corte ECA usando a lógica atual contra a realidade passada.
- Auditar causalmente o motivo de cada veto emitido.

---

## 🛣️ 7. Roadmap de Implementação Incremental (Fase 5.3)

1. **Fase 5.3.1**: Criação do esquema SQL de `causal_events_log` e tabela de projeção em `lyzer edge/backend/db.js`.
2. **Fase 5.3.2**: Instrumentação da gravação atômica de eventos em `streamEngine.js` e `ECA Court`.
3. **Fase 5.3.3**: Implementação do módulo de reconstrução `RewindEngine.js`.
4. **Fase 5.3.4**: Criar testes E2E de auditoria causal e viagem no tempo epistemológica.
