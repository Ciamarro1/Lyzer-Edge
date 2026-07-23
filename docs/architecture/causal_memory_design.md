# Especificação Técnica do Design da Memória Causal (Fase 5.3) — Lyzer Edge

- **Status**: Especificação Técnica de Arquitetura (Design Stage)
- **Data**: 2026-07-22
- **Autor**: Principal Data Architect & Knowledge Systems Engineer (`@[lyzer-guardian]`)

---

## 1. Auditoria da Memória Atual e Resposta à Questão de Governança

### Pergunta:
> *"O banco de dados atual consegue reconstruir uma decisão passada completamente?"*

### Resposta do Guardião da Arquitetura:
**NÃO.** Atualmente, o `CausalMemoryDB` armazena apenas dados brutos de preços (`candles`) e gravaçoes isoladas de ordens. 

Se um usuário ou auditor desejar saber por que um veto ocorreu às 14:32:15 do dia 12/03, o banco de dados atual não possui gravados os vetores tensoriais do CSRL, os escores de estresse do C-CLIST, nem o motivo formal emitido pela Corte Constitucional naquele instante específico.

---

## 2. Esquema DDL da Tabela `causal_events_log`

```sql
-- Tabela do Log Causal Imutável (Append-Only)
CREATE TABLE IF NOT EXISTS causal_events_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,       -- UUIDv7
    timestamp INTEGER NOT NULL,          -- Epoch ms
    event_type TEXT NOT NULL,            -- e.g. MARKET_OBSERVED, CSRL_INVARIANT_COMPUTED, CONSTITUTIONAL_VETO
    source TEXT NOT NULL,                -- Engine / Subsystem source
    causation_id TEXT,                   -- ID do evento predecessor direto
    correlation_id TEXT NOT NULL,        -- ID da sessão/iniciação temporal
    intent_id TEXT,                      -- ID do Intent de Execução
    parent_event TEXT,                   -- ID do evento pai
    version TEXT NOT NULL DEFAULT '1.0', -- Versão do schema do evento
    payload JSON NOT NULL,               -- Dados estruturados do evento
    context JSON NOT NULL,               -- Contexto do sistema no momento do evento
    hash TEXT NOT NULL                   -- SHA-256 hash da payload + context + ids
);

-- Índices de alta performance para busca e replay temporal
CREATE INDEX IF NOT EXISTS idx_causal_ts ON causal_events_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_causal_correlation ON causal_events_log (correlation_id);
CREATE INDEX IF NOT EXISTS idx_causal_intent ON causal_events_log (intent_id);
CREATE INDEX IF NOT EXISTS idx_causal_type_ts ON causal_events_log (event_type, timestamp);
```

---

## 3. Arquitetura dos 4 Domínios de Memória

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LYZER EDGE CAUSAL MEMORY HUB                           │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                                       │
          ▼                                                       ▼
┌───────────────────────────────────┐               ┌─────────────────────────┐
│       OPERATIONAL MEMORY          │               │     EPISODIC MEMORY     │
│ (In-Memory V8 State + Views)      │               │ (causal_events_log WAL) │
│ - Spectrogram Buffer (1000 max)   │               │ - Raw Observations      │
│ - Live Risk Limits                │               │ - CSRL Alignments       │
│ - Active Position Tracking        │               │ - Decision Records      │
└───────────────────────────────────┘               └─────────────────────────┘
          │                                                       │
          ▼                                                       ▼
┌───────────────────────────────────┐               ┌─────────────────────────┐
│        SEMANTIC MEMORY            │               │  CONSTITUTIONAL MEMORY  │
│ (Pattern & Regime Knowledge)      │               │ (ECA Court Case Law)    │
│ - Regime Identification Models    │               │ - Veto Rulings Log      │
│ - Stress Transition Probability   │               │ - EEF Validity Audit    │
│ - Historical Divergence Maps      │               │ - Operational Bounds    │
└───────────────────────────────────┘               └─────────────────────────┘
```

---

## 4. O Motor "Rewind Market Reality"

O módulo `RewindEngine.js` permitirá reconstruir qualquer ponto no tempo através da seguinte API abstrata:

```javascript
export class RewindEngine {
    constructor(causalMemoryDB) {
        this.db = causalMemoryDB;
    }

    // Reconstrói a realidade completa enxergada pelo sistema no timestamp T0
    async rewindToTimestamp(targetTimestampMs) {
        const events = await this.db.getEventsUntil(targetTimestampMs);
        
        const reconstructedReality = {
            timestamp: targetTimestampMs,
            marketState: null,
            csrlInvariants: null,
            cclistStress: null,
            courtDecision: null,
            executionStatus: null
        };

        for (const event of events) {
            this.applyEventToProjection(reconstructedReality, event);
        }

        return reconstructedReality;
    }
}
```

---

## 5. Matriz de Troca (Trade-off Analysis)

| Dimensão | Estado Anterior (Fase 5.2) | Nova Arquitetura Causal (Fase 5.3) |
|---|---|---|
| **Auditabilidade** | Baixa (Apenas candles e ordens isoladas) | **100% Total (Linhagem temporal UUIDv7 completa)** |
| **Capacidade Epistêmica** | Lembra apenas *o que* aconteceu | **Lembra *por que* cada decisão foi tomada** |
| **Throughput Esperado** | ~1,859 ticks/sec | **> 1,500 ticks/sec (Gravação em lote WAL)** |
| **Uso de Disco** | ~15MB por 1M candles | **~45MB por 1M eventos enriquecidos** |
| **Complexidade** | Baixa | **Moderada (Exige gerenciador de eventos)** |
