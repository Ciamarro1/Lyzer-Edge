# ADR-007: Contrato de Eventos Causais e Explicabilidade Epistemológica (Fase 5.3.1)

- **Status**: Aprovado pelo Architecture Decision Board (Principal Event Sourcing Architect, Data Integrity Engineer, Quant Systems Auditor, SRE Lead)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🏛️ 1. Contexto & Motivação

Na Fase 5.3, foi aprovado o **ADR-006 (Causal Memory Architecture)**, estabelecendo o padrão *Hybrid Causal Event Sourcing* no Lyzer Edge.

Antes de escrever qualquer linha de código SQL ou JavaScript, a **Fase 5.3.1** formaliza o **Contrato Epistemológico do Evento Causal (Causal Event Contract)**.

Em sistemas cognitivos de alta integridade, o evento é a menor unidade indivisível da verdade histórica. Se a estrutura do evento for omissa ou ambígua, toda a memória do sistema futuro estará corrompida.

---

## 📐 2. Anatomia Completa e Auto-Contida do Evento Causal

Para garantir que a reconstrução histórica em $T_0$ seja 100% determinística sem depender de bancos de dados externos, o Evento Causal possui 14 campos obrigatórios:

```json
{
  "event_id": "0190a6e4-4d80-7a00-8000-123456789abc",
  "timestamp": 1704067200000,
  "event_type": "CONSTITUTIONAL_JUDGMENT",
  "source": "ECA_COURT_NODE",
  "causation_id": "0190a6e4-4d7f-7a00-8000-987654321xyz",
  "correlation_id": "0190a6e4-4d70-7a00-8000-111111111111",
  "intent_id": "0190a6e4-4d75-7a00-8000-222222222222",
  "parent_event": "0190a6e4-4d7e-7a00-8000-333333333333",
  "version": "1.0.0",
  "hash_prev": "8f4e5a2b...3c1d0e9a",
  "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "epistemic_regime": "REGIME_C_COLLAPSE",
  "payload": {
    "judgment_type": "VETO",
    "violated_constraint": "RESIDUAL_CONSENSUS_LIMIT_EXCEEDED",
    "evidence": {
      "lhds_score": 0.892,
      "cclist_stress": 0.941,
      "scl_threshold_met": false
    },
    "confidence": 0.995,
    "severity": "CRITICAL",
    "alternative_allowed_action": "NO_OPERATION",
    "court_version": "2.1.0"
  },
  "context": {
    "arl_mode": "LIVE",
    "symbol": "BTCUSDT",
    "active_timeframes": ["1m", "5m", "15m"]
  }
}
```

---

## 🔀 3. Separação Conceitual Estrita

Para impedir a poluição semântica do log, o sistema proíbe a mistura dos seguintes conceitos:

| Conceito | Definição | Exemplo de Event Type |
|---|---|---|
| **Event** | Fato imutável que ocorreu no ambiente. | `MARKET_OBSERVATION_RECEIVED` |
| **State Snapshot** | Projeção agregada do estado em $T$. | `CURRENT_RISK_SNAPSHOT` |
| **Decision** | Escolha ou ação de mercado selecionada pelo motor. | `TRADE_INTENT_AUTHORIZED` |
| **Judgment** | Avaliação epistemológica com evidências formais da Corte ECA. | `CONSTITUTIONAL_JUDGMENT` |

---

## 🏷️ 4. Taxonomia de Eventos (9 Categorias Oficiais)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TAXONOMIA DE EVENTOS DO LYZER EDGE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. OBSERVATION   : Dados brutos de mercado (Klines, Ticks).                │
│ 2. REALITY       : Reconstrução tensorial de invariantes pelo CSRL.         │
│ 3. FEATURE       : Indicadores SMC extraídos pelo SmcEngineFacade.          │
│ 4. INFERENCE     : Identificação de regime de estresse pelo TruthKernel.    │
│ 5. CONSTITUTIONAL: Julgamentos com evidências e acórdãos da Corte ECA.      │
│ 6. RISK          : Checagens de limites operacionais pelo RiskGateway.      │
│ 7. EXECUTION     : Ordens enviadas, preenchidas ou rejeitadas.              │
│ 8. LEARNING      : Ajustes de hipóteses e calibragem semântica.             │
│ 9. SYSTEM        : Eventos de ciclo de vida (startup, fallback, shutdown).  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 5. Encadeamento Criptográfico de Hash (Hash Chain Immutability)

Para impedir a adulteração retroativa do histórico (tamper-evidence), cada evento $N$ calcula o seu SHA-256 integrando o `hash_prev` do evento $N-1$:

$$\text{Hash}_N = \text{SHA256}(\text{Hash}_{N-1} \parallel \text{EventID}_N \parallel \text{Timestamp}_N \parallel \text{Payload}_N \parallel \text{Context}_N)$$

Qualquer alteração em um evento passado invalidará a cadeia de hashes em cascata.

---

## ⏪ 6. Escopo do Rewind Engine (Opção D: Realidade Completa Percebida)

O motor **Rewind Market Reality** adotará o escopo **Opção D**:

> Dado um timestamp $T_0$, o sistema reconstrói a **Realidade Completa Percebida pelo Agente**: dados brutos + features tensoriais + inferências de regime + julgamento constitucional + contexto do sistema.

Isso garante 100% de explicabilidade causal e auditabilidade institucional.
