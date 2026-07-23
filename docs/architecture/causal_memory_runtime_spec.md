# Especificação Técnica do Runtime de Memória Causal (Fase 5.4) — Lyzer Edge

- **Status**: Especificação Técnica de Arquitetura Aprovada
- **Data**: 2026-07-22
- **Autor**: Principal Backend Architect & Event Sourcing Specialist (`@[lyzer-guardian]`)

---

## 🛠️ 1. Especificação de Interface dos Componentes

### 1. `EventFactory.js`
```javascript
export class EventFactory {
  static createEvent({ type, source, causationId, correlationId, intentId, parentEvent, payload, context, prevHash, regime }) {
    const eventId = generateUUIDv7();
    const timestamp = Date.now();
    const version = "1.0.0";
    
    const event = {
      event_id: eventId,
      timestamp,
      event_type: type,
      source,
      causation_id: causationId || null,
      correlation_id: correlationId,
      intent_id: intentId || null,
      parent_event: parentEvent || null,
      version,
      hash_prev: prevHash || '0'.repeat(64),
      epistemic_regime: regime || 'REGIME_A_CONSENSUS',
      payload,
      context,
      hash: ''
    };

    event.hash = computeEventHash(event, event.hash_prev);
    return event;
  }
}
```

### 2. `EventValidator.js`
```javascript
export class EventValidator {
  static validate(event, expectedPrevHash) {
    if (!event.event_id || !event.correlation_id || !event.event_type) {
      throw new Error(`[EventValidator] Invalid event: missing mandatory identifiers.`);
    }

    if (event.hash_prev !== expectedPrevHash) {
      throw new Error(`[EventValidator] Hash chain broken for event ${event.event_id}. Expected prev ${expectedPrevHash}, got ${event.hash_prev}`);
    }

    const recomputedHash = computeEventHash(event, event.hash_prev);
    if (event.hash !== recomputedHash) {
      throw new Error(`[EventValidator] Tamper detection: hash mismatch for event ${event.event_id}`);
    }

    return true;
  }
}
```

---

## 🧪 2. Matriz de Suíte Conceitual de Testes (Runtime Verifications)

| Cenário de Teste | Descrição | Comportamento Esperado |
|---|---|---|
| **Reconstrução Temporal** | Replay de 5.000 eventos até $T_0$. | Reconstrução 100% fiel do estado da memória operacional em $T_0$. |
| **Corrupção de Hash** | Injeção de payload alterado no evento $N$. | O `EventValidator` detecta a quebra da Hash Chain e bloqueia a ingestão. |
| **Evento Fora de Ordem** | Tentativa de inserir `EXECUTION` antes de `RISK`. | Rejeição imediata por violação da Invariante I1. |
| **Evento Duplicado** | Re-envio de evento com `event_id` já existente. | Descarte idempotente por constraint UNIQUE de chave primária. |
| **Recuperação Pós-Crash** | Simulação de SIGKILL durante escrita em lote. | Replay atômico do log WAL do SQLite restabelecendo a consistência. |

---

## 🧠 3. Transição para a Fase 6 (Causal Intelligence Layer)

Com a estabilização do **Causal Memory Runtime**, o Lyzer Edge prepara o terreno para a **Fase 6 (Causal Intelligence Layer)**, onde a inteligência do sistema minerará a própria memória histórica:
- Identificar quais regimes estatísticos produziram vetos falsos-positivos.
- Medir a eficiência preditiva de cada hipótese do CSRL sob estresse.
- Evoluir dinamicamente o parâmetro de imunidade constitucional.
