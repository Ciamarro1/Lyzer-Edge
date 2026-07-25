# Especificação Técnica do Contrato de Eventos Causais (Fase 5.3.1) — Lyzer Edge

- **Status**: Especificação Técnica Aprovada
- **Data**: 2026-07-22
- **Autor**: Principal Event Sourcing Architect & Data Integrity Engineer (`@[lyzer-guardian]`)

---

## 🏛️ 1. Matriz de Categorias de Eventos (Event Taxonomy Matrix)

| Categoria de Evento | Produtor | Consumidor | Dados Obrigatórios |
|---|---|---|---|
| **OBSERVATION** | Market Ingestion (`StreamEngine`) | CSRL, Projeções | Klines, Volume, Timestamp, Symbol |
| **REALITY** | `CSRL / InvariantExtractor` | TruthKernel, Projeções | Tensor Invariantes, LHDS Score |
| **FEATURE** | `SmcEngineFacade` | EvSignalEngine | Structure, Liquidity, Trend, OrderBlocks |
| **INFERENCE** | `TruthKernel` | ECA Court | Regimes (A..E), EEF Flag, Authority Level |
| **CONSTITUTIONAL** | `ConstitutionalCourt` | RiskGateway, Spectrogram | Violated Constraints, Evidence, Severity |
| **RISK** | `RiskGateway` (Rust) | Execution Node | Capital Limits, Exposure Ratio, Timeouts |
| **EXECUTION** | `ExchangeExecution` | Causal Memory DB | Order ID, Fill Price, Executed Volume |
| **LEARNING** | Feedback Engine | Semantic Memory | Hypothesis Verification, Stress Matrix |
| **SYSTEM** | Server Core (`server.js`) | Prometheus, SRE Dashboard | Lifecycle Events, Fallback Flag, Errors |

---

## 📜 2. Payload Específico de Julgamento Constitucional (`CONSTITUTIONAL_JUDGMENT`)

A Corte Constitucional do Lyzer Edge não registra apenas "Veto". Ela registra o acórdão completo com a cadeia de evidências:

```json
{
  "event_type": "CONSTITUTIONAL_JUDGMENT",
  "payload": {
    "judgment_type": "VETO",
    "violated_constraint": "RESIDUAL_CONSENSUS_LIMIT_EXCEEDED",
    "evidence": {
      "lhds_score": 0.892,
      "cclist_stress": 0.941,
      "scl_threshold_met": false,
      "consensus_limit": 0.0
    },
    "confidence": 0.995,
    "severity": "CRITICAL",
    "alternative_allowed_action": "NO_OPERATION",
    "court_version": "2.1.0"
  }
}
```

---

## 🔒 3. Algoritmo de Validação da Cadeia de Hash (Hash Chain Integrity)

```javascript
import crypto from 'crypto';

export function computeEventHash(event, prevHash) {
  const content = [
    prevHash || '0'.repeat(64),
    event.event_id,
    event.timestamp,
    event.event_type,
    JSON.stringify(event.payload),
    JSON.stringify(event.context)
  ].join('|');

  return crypto.createHash('sha256').update(content).digest('hex');
}

export function verifyChainIntegrity(eventsLog) {
  for (let i = 0; i < eventsLog.length; i++) {
    const current = eventsLog[i];
    const prevHash = i === 0 ? '0'.repeat(64) : eventsLog[i - 1].hash;

    const expectedHash = computeEventHash(current, prevHash);
    if (current.hash !== expectedHash) {
      return { valid: false, corruptedIndex: i, eventId: current.event_id };
    }
  }
  return { valid: true };
}
```

---

## 🔄 4. Estratégia de Versionamento e Compatibilidade (Schema Registry)

- Todos os schemas seguem **Semantic Versioning (`v1.0.0`)**.
- Alterações que apenas adicionam novos campos opcionais incrementam a versão MINOR (`v1.1.0`).
- Alterações breaking que removem ou alteram tipos incrementam a versão MAJOR (`v2.0.0`).
- O `RewindEngine.js` utiliza adaptadores de backward compatibility para deserealizar versões legadas de eventos sem falha.
