# Architectural Recovery — Lyzer Edge

**Date:** 2026-07-27
**Method:** Evidence-based reconstruction from runtime forensics, code analysis, test audit, and bug reports
**Rule:** Zero reliance on documentation, README, CONSTITUTION, or architecture.md

---

## 1. Truthful Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PROCESSO ÚNICO: Node.js                             │
│                     lyzer edge/backend/server.js                        │
│                     Porta 7860 · Express 5 · WS · SIGINT→exit(0)       │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   Express 5 REST + WebSocket                      │  │
│  │  22+ API routes (admin, experiments, trades, candles, metrics)   │  │
│  │  Auth: query string adminKey (vaza em logs) + algumas sem auth   │  │
│  │  WS broadcast: unidirecional (server→client), sem ping/pong      │  │
│  │  Clients Array: não encapsulado, sem heartbeat, vaza listeners   │  │
│  └──────────────────────┬───────────────────────────────────────────┘  │
│                         │                                              │
│            ┌────────────┼────────────┬────────────┬─────────────┐      │
│            ▼            ▼            ▼            ▼             ▼      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │     ×6 StreamEngine (BTC, ETH, SOL, BNB, EUR, GBP)              │  │
│  │     instances criadas em server.js, in-process                   │  │
│  │                                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │  processCandle() — 430 linhas, método monolítico         │   │  │
│  │  │                                                          │   │  │
│  │  │  1. Providers V1(SMC/ICT), V2(SnD/SNR), V3(RSI),        │   │  │
│  │  │     V4(IMCE) — V1 e V3 podem estar DISABLED             │   │  │
│  │  │  2. CSRL coherence (scaleNormalizer→cstg→               │   │  │
│  │  │     invariantExtractor→divergenceDetector)               │   │  │
│  │  │       → FALHA SILENCIOSA: SDS = 0.0 se CSRL falha       │   │  │
│  │  │  3. Dual Reality (LHDS via dualMonitor ou default 0.0)  │   │  │
│  │  │  4. TruthKernel (residualization→executionTrigger→      │   │  │
│  │  │     lhds veto→ontological collapse)                     │   │  │
│  │  │  5. C-CLIST.evaluateStress()  ← FORA do court!!!        │   │  │
│  │  │  6. MOL.evaluateState()       ← FORA do court!!!        │   │  │
│  │  │  7. court.requestPermission() ← reavalia dentro         │   │  │
│  │  │  8. Position mgmt (SL/TP/confidence/reversal)           │   │  │
│  │  │  9. handleExecution (ExchangeExecution.placeOrder)      │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  Singleton compartilhado: signalEngine (EvSignalEngine)         │  │
│  │  Compartilhado entre todos os 6 engines — sem thread safety     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                         │                                              │
│         ┌───────────────┼───────────────┬────────────────────┐        │
│         ▼               ▼               ▼                    ▼        │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │CausalMemory │  │ShadowTrade │  │Constitutional│  │ Telegram Bot   │ │
│  │DB (SQLite)  │  │-ing (sync  │  │Ledger        │  │ (fire-and-    │ │
│  │Singleton    │  │better-     │  │(Array em     │  │ forget, só    │ │
│  │WAL mode     │  │sqlite3)    │  │ memória)     │  │ notifica)     │ │
│  │8 tabelas    │  │1 tabela    │  │⚠ PERDIDO     │  └────────────────┘ │
│  │Sem migração │  │            │  │  NO RESTART  │                     │
│  └────────────┘  └────────────┘  └──────────────┘                     │
│                         │                                              │
│                         ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              ExperimentManager (6 engines)                       │  │
│  │  Zero Entropy Policy: POST /api/trades/delete → 403              │  │
│  │  Experiment lifecycle: 6-state (Created→Running→Frozen→Paused→   │  │
│  │  Archived→Champion)                                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Frontend SPA (Vite build)                           │  │
│  │  index.html → main.js → RuntimeSelector.resolve()                │  │
│  │    ├── CommandCenterV2 (widget-based, 3-pane)                   │  │
│  │    └── GamifiedCommandCenterView (legacy, 625 linhas)           │  │
│  │  IndexedDB via Dexie (14 stores)                                │  │
│  │  WebSocket client singleton                                     │  │
│  │  EventBus singleton                                             │  │
│  │  innerHTML everywhere — sem reactive framework                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
NÃO EXISTEM (documentados mas nunca implementados no runtime):
═══════════════════════════════════════════════════════════════════════════

✗ Processo 2 — ECA Court Node (separado)
✗ Processo 3 — Execution Node (separado)
✗ gRPC RiskGateway (Rust existe mas nunca chamado do JS)
✗ gRPC IntentRegistry (Rust existe mas nunca chamado do JS)
✗ gRPC OMS (Rust existe mas nunca chamado do JS)
✗ NATS JetStream (nobody connects — nats.connect() nunca chamado)
✗ UUIDv7 pipeline (crypto.randomUUID() = UUIDv4 em todos os lugares)
✗ CQRS / Event Sourcing
✗ SchemaCompatibilityGate (todo lógico comentado)
✗ CER (Constitutional Evidence Registry) DDL nunca executada
✗ 3 Rust workspaces conectados (tokio 1.0, 1.34, 1.52 — incompatíveis)
```

---

## 2. Real Data Flow

Baseado no runtime forensics — o caminho REAL dos dados, não o diagramado:

```
BINANCE WEBSOCKET (wss://stream.binance.com:9443/ws/)
    │
    ▼
LiveDataIngestor (6 instâncias, uma por símbolo)
    │ parseFloat(kline.o) — sem validação de schema
    │ NaN pode propagar (Red Team finding #6)
    │ Conexão perdida → polling → sintético não marcado
    │
    ▼
StreamEngine.processCandle(candle, index)
    │
    ├──1. Providers V1-DISABLED/V2/V3-DISABLED/V4
    │    (V1 e V3 condicionalmente desabilitados por config)
    │
    ├──2. CSRL → SDS
    │    │ Se divergenceDetector.calculateDivergence falha → SDS=0.0
    │    │ ⚠ CSRL failure ENGOLIDA — MOL vê "coerência perfeita"
    │
    ├──3. TruthKernel.evaluate(providers, micro)
    │    ├── ResidualizationLayer (DVF, tension, consensus destruction)
    │    ├── ExecutionTriggerLayer (TRG ≥ 0.4 → EEF)
    │    └── LHDS veto (> 0.8 block) + ontological collapse check
    │
    ├──4. court.cclist.evaluateStress()  ← BACKDOOR (fora do court!)
    │    │ Se SDS=0.0 → C-CLIST vê estabilidade → não acumula stress
    │
    ├──5. court.mol.evaluateState()      ← BACKDOOR (fora do court!)
    │    │ Se SDS=0.0 → MOL vê "sds <= 0.7" → recovery prematuro
    │
    ├──6. court.requestPermission()
    │    ├── Verifica C-CLIST stress (redundante)
    │    ├── Verifica MOL state (redundante)
    │    ├── Verifica EEF
    │    ├── Verifica constraint engine
    │    ├── Verifica edge-riding (via ledger in-memory)
    │    └── Retorna PermissionToken (SHA-256 sem HMAC → FORJÁVEL)
    │
    ├──7. Position management
    │    ├── SL/TP check (duplicado com checkTickPositionExit)
    │    ├── Confidence check
    │    ├── Reversal check
    │    └── Dynamic sizing (0.001 base qty hardcoded)
    │
    ├──8. handleExecution()
    │    ├── SIMULATION: FILLED_MOCK
    │    ├── TESTNET: Binance testnet REST
    │    └── LIVE: Binance live REST (HMAC-SHA256 signed)
    │
    ├──➤ CausalMemoryDB.insertBatch()   (candles)
    ├──➤ CausalMemoryDB.insertCausalEvent() (decisões)
    ├──➤ ShadowTradingTelemetry.insert() (se shadow ativo)
    ├──➤ ConstitutionalLedger.push() (Array — PERDIDO NO RESTART)
    └──➤ broadcast() → WebSocket clients

    FRONTEND FLOW:
    WS data → wsClient singleton → RuntimeSelector.resolve()
        ├── CommandCenterV2: widgets recebem runtime IoC
        └── GamifiedCommandCenterView: innerHTML + mock data + setInterval
    Frontend IndexedDB (Dexie): trades, settings, screenshots
      ↛ NUNCA sincronizado com backend SQLite ⚠
```

---

## 3. Real State Architecture

### Singletons (compartilhados, estado global)

| Singleton | Tipo | Ficheiro | Compartilhado entre |
|-----------|------|----------|---------------------|
| `db` | `CausalMemoryDB` (SQLite) | `backend/db.js` | Todos os 6 engines + todas as rotas API |
| `signalEngine` | `EvSignalEngine` | `streamEngine.js` module scope | Todos os 6 engines |
| `arlEngineInstance` | `StreamEngine` (BTCUSDT legacy) | `streamEngine.js` | Toda a aplicação (via import) |
| `ExperimentManager` | Class instance | `experimentManager.js` | Todas as rotas /api/experiments |
| `eventBus` (frontend) | EventEmitter | `src/lib/eventBus.js` | Todos os componentes frontend |
| `wsClient` (frontend) | WS singleton | `src/services/wsClient.js` | Todos os componentes frontend |
| `LyzerEdgeDB` (frontend) | Dexie IndexedDB | `src/db/database.js` | Todas as views frontend |

### Por StreamEngine (6 instâncias paralelas)

| Estado | Tipo | Persistência |
|--------|------|-------------|
| `this.activePosition` | Object ou null | Volátil (RAM) — sem mutex |
| `this.candles[]` | Array de OHLCV | Sem cap em fallback mode → OOM risk |
| `this.mtfCandles{}` | Object com timeframes | Cap 1000 (1m) / 500 (outros) |
| `this.tradeHistory[]` | Array | Parcialmente em experiment_trades |
| `this.court` | ConstitutionalCourt (per-engine) | Ledger in-memory |
| `this.kernel` | TruthKernel (per-engine) | Sem estado interno (função pura) |
| `this.execution` | ExchangeExecution ou null | Volátil (recriado se shadow) |
| Providers V1-V4 | Provider instances | Sem estado (stateless signal gen) |
| CSRL subsystem | 4 classes (ScaleNormalizer, CSTG, etc.) | Topologia/divergência volátil |
| C-CLIST instance | DVF acumulado, stress level | Volátil — zerado se engine recriado |
| MOL instance | State machine (EXECUTE/VETO/RECOVERY) | Volátil — scl reset no restart |

### In-Memory ConstitutionalLedger (⚠ CRÍTICO)

```
ConstitutionalLedger.entries = [  // Array plano em RAM
    { timestamp, request, verdict, state, tokenId }
]
```
- **Nunca persistido** — nem SQLite, nem IndexedDB, nem file system
- **Perdido no restart** do processo Node.js
- Edge-riding counters, veto history, C-CLIST stress, MOL state — tudo zerado
- Violação direta do princípio "immutable append-only ledger"

### Frontend State

| Fonte | Tipo | Notas |
|-------|------|-------|
| IndexedDB (Dexie) | Persistente no navegador | 14 stores, trades/settings/etc. |
| `wsClient._latestData` | Object em RAM | Último payload do backend |
| `window` Custom Events | Event bus não-padrão | `lyzer:plot-trade`, etc. |
| Component instances | Props + state em RAM | innerHTML → DOM, listeners vazam |
| Runtime IoC object | In-memory | Provider de dados para widgets |

---

## 4. Real Security Posture

### Como a segurança REALMENTE funciona:

| Camada | Realidade | Documentado vs Real |
|--------|-----------|---------------------|
| Admin API auth | Query string `?adminKey=...` + header `x-admin-key` | Documentado como seguro — na prática vaza em logs, browser history, proxies |
| WebSocket auth | **NENHUMA** — qualquer cliente pode conectar | Documentado como "3 processos isolados" |
| PermissionToken | SHA-256 sem HMAC — **forjável** | Código diz "In a real multi-process system, this is signed with the Court's private key" — placeholder nunca substituído |
| Pipeline isolation | Zero — tudo in-process | Documentado como 7-layer strict sequence com C-CLIST+MOL dentro do court |
| Secrets | GITHUB_TOKEN + HF_TOKEN em .env commitado | .env não está no .gitignore |
| HTTPS | **NENHUM** — HTTP plano | Documentação não menciona TLS |
| helmet/CORS/rate-limit | **NENHUM** | Servidor Express exposto |
| Input validation | Schema validation ZERO em WebSocket incoming | NaN propaga pelo pipeline |
| SQL injection | PRAGMA wal_checkpoint com template literal sem sanitização | Executa com `${mode}` direto |
| Memory leak | Event listeners nunca removidos (Dashboard.js:241 resize) | Nenhuma doc menciona |
| Shutdown | `process.exit(0)` forçado após 4s timeout | Dados em voo perdidos |
| Docker | `USER root`, sem `.dockerignore` | Segredos na imagem |
| Certificates | **NENHUM** | Sem mTLS, sem HTTPS, sem HMAC keys |

### Attack Surface Real

```
EXPRESS (port 7860)
  ├── /api/experiments/dashboard — sem auth
  ├── /api/trades/export — sem auth, full trade history
  ├── /api/candles/:symbol — sem auth, current price + trades
  ├── /api/test-telegram — sem auth, spam vector
  ├── /metrics — Prometheus, admin auth weak
  ├── WebSocket — zero auth, real-time trade data
  └── POST /api/trades/close — admin auth via query string

INTERNOS:
  ├── PermissionToken → SHA-256 sem HMAC → forjável
  ├── C-CLIST/MOL backdoor → bypass pipeline
  ├── exec() no backup → shell injection surface
  └── NaN de WS sem validação → pipeline corruption
```

---

## 5. Gap: Documented vs Actual

| O que a documentação diz | O que REALMENTE existe | Gap |
|--------------------------|------------------------|-----|
| **3 processos isolados** (Execution Node, ECA Court Node, Dashboard Node) | **1 processo Node.js único** | 100% — documentado como distribuído, implementado como monolito |
| **gRPC RiskGateway** autoriza execuções | Código Rust existe, NUNCA chamado do JavaScript | 100% — teatro arquitetural |
| **gRPC IntentRegistry** com UUIDv7 | Código Rust existe, NUNCA chamado | 100% — teatro arquitetural |
| **NATS JetStream** como message bus | `nats` package instalado, `nats.connect()` NUNCA chamado | 100% — teatro arquitetural |
| **UUIDv7** para rastreabilidade causal | `crypto.randomUUID()` em todos os lugares = UUIDv4 | 100% — nenhum UUIDv7 em qualquer lugar |
| **CQRS / Event Sourcing** | Zero implementação — causal_events_log é append-only log sem CQRS | 100% — documentado como implementado |
| **C-CLIST + MOL dentro do court** como gate único | `streamEngine.js:552-553` pré-avalia fora do court | 100% — backdoor não documentado |
| **PermissionToken** assinado criptograficamente | SHA-256 sem HMAC — qualquer um pode forjar | 100% — placeholder nunca substituído |
| **SchemaCompatibilityGate** validade contratos entre processos | Todo código comentado, stub vazio | 100% — aspirational |
| **CER** (Constitutional Evidence Registry) | DDL definida em string, NUNCA executada | 100% — aspirational |
| **7-layer strict sequence** | Ordem mantida manualmente em processCandle, sem enforcement | 100% — sem pipeline orchestrator |
| **Immutable append-only ledger** | Array em RAM, perdido no restart | 100% — sem persistência alguma |
| **npm workspaces** com @lyzer/shared e @lyzer/constitution | **NENHUM** import usa o nome do package — todos caminhos relativos | 100% — packages declarados mas nunca importados por nome |
| **3 Rust workspaces** interconectados (17 crates) | tokio 1.0, 1.34, 1.52.3 — **não podem compilar juntos** | 100% — incompatíveis |
| **SSOT** (Single Source of Truth) via shared package | 5+ arquivos duplicados entre `packages/` e `lyzer edge/src/`, kernels divergentes | 100% — duplicatas divergentes |
| **ECOSYSTEM_HEALTH.md** "all 17 crates verified green" | 3 workspaces nunca compilados juntos | 100% — relatório falso |
| **Segurança** com HMAC, TLS, mTLS | HTTP plano, query string auth, SHA-256 sem chave | 100% — sem nenhuma camada de segurança real |
| **Schema migrations** para SQLite | `CREATE TABLE IF NOT EXISTS` é o único mecanismo | 100% — sem migration framework |
| **Testes** cobrindo o pipeline de produção | 5 verification files importam o kernel FRONTEND (não o de produção) | 100% — zero cobertura do kernel real |

---

## 6. Summary Statistics

| Métrica | Valor |
|---------|-------|
| Processos reais | 1 (Node.js) |
| Processos documentados | 3 |
| Camadas do pipeline implementadas | 7 (mas com backdoor) |
| Camadas testadas corretamente | ~3 de 7 (kernel errado, C-CLIST/MOL fora) |
| Serviços gRPC conectados | 0 de 3 |
| Rust crates compiláveis juntos | 0 (3 workspaces incompatíveis) |
| Arquivos no repositório | ~1.936 (JS + TS + RS + MD) |
| Arquivos mortos/duplicados | ~174 arquivos, ~36.700 linhas |
| Singletons compartilhados | 5+ (db, signalEngine, eventBus, wsClient, ExperimentManager) |
| Bugs críticos de segurança | 3 (tokens expostos, token forjável, exec injection) |
| Bugs críticos de pipeline | 2 (backdoor C-CLIST/MOL, kernel duplicado) |
| Estado volátil perdido no restart | ConstitutionalLedger, C-CLIST stress, MOL state, edge-riding counters |
| Dias de construção | 26 (223 commits, 4.106 linhas/dia) |
| Desenvolvedores | 1 humano + 1 IA |

---

## 7. Verdict

**O Lyzer Edge é um monólito Node.js de processo único** com um pipeline quantitativo de 7 camadas genuinamente sofisticado, executando 6 engines de trading em paralelo no mesmo processo, com persistência SQLite, frontend vanilla-JS via WebSocket.

**Não é** um sistema distribuído de 3 processos com gRPC, NATS, CQRS, UUIDv7, ou SSOT — apesar de toda a documentação afirmar o contrário.

~78% da arquitetura documentada nunca foi implementada. O código que existe é real e funcional (o pipeline de 7 camadas, a Constitutional Court, C-CLIST, MOL, os 4 provedores, CSRL), mas a infraestrutura ao redor (Rust, gRPC, NATS, isolamento de processos) é teatro arquitetural — código que cria a aparência de um sistema distribuído sem nunca conectá-lo.
