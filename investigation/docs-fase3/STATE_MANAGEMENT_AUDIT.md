# State Management & Data Flow Audit

## 1. State Map

| Estado | Tipo | Inicializado | Modificado | Lido | Singleton? | Persistente? |
|--------|:----:|:------------:|:----------:|:----:|:----------:|:------------:|
| `signalEngine` (EvSignalEngine) | Module-level | `streamEngine.js:34` | — (stateless evaluate) | All 6 engines via `this.signalEngine` | **SIM** | Não |
| `court` (ConstitutionalCourt) | Module-level | `court.js:97` | — (só configuração) | Tests, backtests | **SIM** | Não |
| `ledger.entries` (ConstitutionalLedger) | Module-level | `ledger.js:77` | `ledger.js:32` (appendRecord) | `constraintEngine.js:38` | **SIM** | Não (memória volátil) |
| `ledger.edgeRidingCounters` | Module-level | `ledger.js:10-13` | `ledger.js:32,43-44,53-57` | `ledger.js:65-67` | **SIM** | Não |
| `db` (CausalMemoryDB) | Module-level singleton | `db.js:799` | Toda escrita SQLite | Toda leitura SQLite | **SIM** | **SIM** (SQLite WAL) |
| **StreamEngine.court** (cada engine) | Instance | `streamEngine.js:64` | `streamEngine.js:552-553` (cclist/mol) | `streamEngine.js:716` (requestPermission) | 6 instâncias | Não |
| **StreamEngine.court.cclist.stressLevel** | Instance | `c-clist.js:9` | `c-clist.js:27,29,34,37` | `c-clist.js:40` | Por engine | Não |
| **StreamEngine.court.mol.state** | Instance | `mol.js:8` | `mol.js:27,41,58` | `court.js:49,56` | Por engine | Não |
| **StreamEngine.court.mol.durationOfInaction** | Instance | `mol.js:9` | `mol.js:28,42,59` | `court.js:53-54` | Por engine | Não |
| **StreamEngine.court.mol.structuralCoherenceLock** | Instance | `mol.js:10` | `mol.js:29,49,52,56,60` | `court.js:54` | Por engine | Não |
| **StreamEngine.truthKernel** | Instance | `streamEngine.js:60` | `streamEngine.js:548` (evaluate) | `streamEngine.js:548` | Por engine | Não |
| **StreamEngine.truthKernel.rl.history** | Instance | `residualization.js:12` | — (nunca usada) | — | Por engine | Não |
| **StreamEngine.tradeHistory** | Instance | `streamEngine.js:95` | `streamEngine.js:457,670` | `server.js:87,269,329,501-505` | Por engine | **SIM** (JSON file + SQLite) |
| **StreamEngine.activePosition** | Instance | `streamEngine.js:96` | `streamEngine.js:474,699,763,906` | Em toda processCandle, `server.js:245,361-374` | Por engine | **SIM** (JSON file) |
| **StreamEngine.candles** (1m) | Instance | `streamEngine.js:71` | `streamEngine.js:143,180,198,236,380` | `streamEngine.js:735,816` | Por engine | Não |
| **StreamEngine.mtfCandles** | Instance | `streamEngine.js:72` | `streamEngine.js:194,235-289` | Toda `processCandle` | Por engine | Não |
| **StreamEngine.ecoEngine** (EVAlphaResearch) | Instance | `streamEngine.js:66` | `streamEngine.js:816` (step) | `streamEngine.js:724-727` | Por engine | Não |
| **StreamEngine.ecoEngine.extinctionEngine** | Instance | `EVAlphaResearch...js:43` | `extinctionEngine.js:31-69` | `streamEngine.js:724-727` | Por engine | Não |
| **StreamEngine.ecoEngine.extinctionEngine.currentState** | Instance | `extinctionEngine.js:21` | `extinctionEngine.js:44,46,48` | `server.js:387` | Por engine | Não |
| **StreamEngine.ecoEngine.extinctionEngine.stressLevel** | Instance | `extinctionEngine.js:23` | `extinctionEngine.js:39` | `server.js:388` | Por engine | Não |
| **StreamEngine.globalEVMemory** | Instance | `streamEngine.js:111-115` | `computeTradeEV` (via globalMemory) | `computeTradeEV` | Por engine | Não |
| **StreamEngine.dailyCapitalUsed** | Instance | `streamEngine.js:101` | `streamEngine.js:909` | `streamEngine.js:904` | Por engine | Não |
| **StreamEngine.isRunning** | Instance | `streamEngine.js:94` | `streamEngine.js:119,935` | — | Por engine | Não |
| **StreamEngine.connectionState** | Instance | `streamEngine.js:98` | `streamEngine.js:341` | `streamEngine.js:213,355,824` | Por engine | Não |
| **StreamEngine._lastStabilizationLogged** | Instance | — (undefined) | `streamEngine.js:711` | `streamEngine.js:709` | Por engine | Não |
| **Dexie db (LyzerEdgeDB)** | Module-level | `database.js:63` | Operações IndexedDB | Operações IndexedDB | **SIM** (frontend) | **SIM** (IndexedDB) |
| **experimentManager** | Instance | `server.js:26` | `experimentManager.js` methods | `server.js` routes | **SIM** (server.js) | **SIM** via DB |
| **clients** (WebSocket array) | Module-level | `server.js:396` | `server.js:400,404` | `server.js:410` | **SIM** (server.js) | Não |
| **engines** (array de StreamEngine) | Module-level | `server.js:419` | `server.js:448` | `server.js:87,102-106,241,329,356,418,455,500` | **SIM** (server.js) | Não |
| `arlEngineInstance` (StreamEngine singleton) | Module-level | `streamEngine.js:949` | via StreamEngine methods | Qualquer import de `arlEngineInstance` | **SIM** | Não |

---

## 2. Singleton Analysis

### 2.1 `signalEngine` (EvSignalEngine) — `streamEngine.js:34`
- **Criado uma vez** no módulo de `streamEngine.js`.
- **Compartilhado** por TODAS as 6 instâncias de `StreamEngine` via `this.signalEngine = signalEngine` (linha 59).
- **Estado interno**: `this.memory` (featureHistory, trendScores, signalCache) e `this.fce`.
- **Risco**: `memory.featureHistory` e `signalCache` acumulam dados de TODOS os símbolos no mesmo objeto. Não há separação por símbolo nos métodos de avaliação — a engine recebe apenas `(candles, index)`. Se o `evaluate` modifica o estado interno baseado nos candles recebidos, haverá **interferência entre símbolos**.
- **Análise**: `evaluate` em `evSignalRedesign.js` parece ser stateless dentro de cada chamada (apenas lê candles), mas escreve em `memory.signalCache` e `featureHistory` que são globais. Cache de sinais pode misturar resultados de diferentes símbolos.

### 2.2 `court` (ConstitutionalCourt) — `court.js:97`
- **NÃO é usado** pelas 6 engines em produção. Cada engine cria seu próprio `new ConstitutionalCourt(...)` (linha 64).
- O singleton `court` é usado apenas em testes (`verify_eca.js`, `e2e_suite.test.js`, etc.) e scripts standalone (`run_binance_backtest.js`, `optimize_backtest.js`).
- **IMPORTANTE**: `court.js` importa `ledger` (linha 8) — todas as instâncias de ConstitutionalCourt compartilham o **mesmo** `ConstitutionalLedger` singleton.

### 2.3 `ledger` (ConstitutionalLedger) — `ledger.js:77`
- **Singleton verdadeiro**. Cada `court.requestPermission()` chama `ledger.appendRecord()`.
- Se duas engines compartilhassem o mesmo court (o que não ocorre atualmente), ambas escreveriam no mesmo `entries[]`.
- Como cada engine tem seu próprio court, mas o ledger é o mesmo módulo importado, na prática todas as engines **compartilham o ledger** através do `court.js` import.

### 2.4 `db` (CausalMemoryDB) — `db.js:799`
- Singleton com padrão de instância compartilhada (linhas 11, 15-18, 27-29).
- Todas as engines e experimentManager usam a mesma conexão SQLite.
- SQLite WAL mode permite leitura concorrente. Escritas são serializadas por `db.serialize()`.

### 2.5 `arlEngineInstance` — `streamEngine.js:949`
- Singleton `StreamEngine` para compatibilidade legada.
- Usado como fallback pela UI via export `arl` em `server.js:5,384`.

---

## 3. Race Condition Analysis

### 3.1 Dentro do mesmo processo (Node.js single-thread)
Não há race conditions verdadeiras porque Node.js executa em uma única thread. Operações síncronas são atômicas. Contudo:

### 3.2 `signalEngine` compartilhado
- **Problema**: `memory.featureHistory` é global. Se duas engines processam candles de símbolos diferentes, o cache pode associar características de um símbolo a outro.
- **Impacto**: ALTO. Sinais de BTC podem contaminar sinais de ETH.

### 3.3 `ledger` compartilhado entre courts
- 6 courts → 6 instâncias de `ConstitutionalCourt` → todos importam o mesmo `ledger`.
- `appendRecord` é síncrono — sem race. Mas o ledger contém registros de TODOS os símbolos misturados.
- `edgeRidingCounters` são compartilhados — um near-miss do BTCUSDT afeta a decisão do ETHUSDT (via `constraintEngine.js:38` que lê `ledger.getNearMissCount('drawdown')`).
- **Impacto**: MÉDIO. Edge-riding detection é cross-symbol.

### 3.4 `clients` (WebSocket array)
- Modificado em callbacks `ws.on('connection')` e `ws.on('close')`.
- `broadcast()` itera sobre o array. Não há problemas de concorrência em Node single-thread.

### 3.5 `engines` array
- Modificado apenas durante inicialização (`server.js:448`).
- Lido em handlers de API — seguro pois é imutável após startup.

---

## 4. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW (por engine)                       │
└─────────────────────────────────────────────────────────────────────┘

[Exchange/Binance WS] ──candle──▶ [LiveDataIngestor]
                                        │
                                        ▼
                                  ┌─────────────┐
                                  │ mtfCandles  │ (instance, volátil)
                                  │ candles[]   │
                                  └──────┬──────┘
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  ▼                      ▼                      ▼
          ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
          │ V1 (SMC/ICT) │      │ V2 (SnD/SNR) │      │ V3 (Momentum)│
          └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
                 │                     │                     │
                 ▼                     ▼                     ▼
          ┌──────────────────────────────────────────────────────────┐
          │              CSRL Subsystem                              │
          │  ScaleNormalizer → CrossScaleTensorGraph →               │
          │  InvariantExtractor → DivergenceDetector                 │
          └──────────────────────────┬───────────────────────────────┘
                                     │
                                     ▼ sds, invariants
          ┌──────────────────────────────────────────────────────────┐
          │              TruthKernel (por engine)                    │
          │  ResidualizationLayer → ExecutionTriggerLayer → OCL     │
          │  Output: { dvf, trg, eef, epistemic_authority }         │
          └──────────────────────────┬───────────────────────────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               ▼                     ▼                     ▼
       [C-CLIST]              [MOL]              [EEF Gate]
       stressLevel            state/DOI/SCL       isStabilized?
               │                     │                     │
               └─────────────────────┼─────────────────────┘
                                     ▼
                          ┌──────────────────────┐
                          │  ConstitutionalCourt  │
                          │  requestPermission()  │──▶ ledger (singleton)
                          └──────────┬───────────┘
                                     │ permissionToken
                                     ▼
                          ┌──────────────────────┐
                          │   Execution Decision  │
                          │   open/close/reject   │
                          └──────────┬───────────┘
                                     │
                          ┌──────────▼───────────┐
                          │  ExchangeExecution   │
                          │  (live orders)       │
                          └──────────────────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  EV Profiling         │
                          │  computeTradeEV()     │──▶ globalEVMemory
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  ExperimentManager    │
                          │  (Zero Entropy)      │──▶ SQLite DB
                          └──────────────────────┘
```

### Shared Memory Cross-Contamination Path

```
signalEngine.memory (singleton)
    ▲                         ▲
    │                         │
  Engine 1 (BTC)          Engine 2 (ETH)
  signalEngine.evaluate()  signalEngine.evaluate()
  → escreve em             → escreve em
    memory.signalCache       memory.signalCache
  → lê memory.featureHistory → pode ler dados do BTC
```

---

## 5. State Persistence

### 5.1 Persistido em Disco

| Que | Onde | Como | Frequência |
|-----|------|------|-----------|
| `tradeHistory` + `activePosition` | `/tmp/data/engine_state.json` | JSON file (saveEngineState) | A cada `state_changed` |
| Candles históricos | SQLite `candles` table | `CausalMemoryDB.insertBatch` | Batch no warmup |
| Eventos causais | SQLite `causal_events_log` | `insertCausalEvent` | Por evento |
| Experiments | SQLite `experiments` | `createExperiment` | No freeze/startup |
| Experiment trades | SQLite `experiment_trades` | `insertExperimentTrade` | A cada trade + sync |
| Experiment snapshots | SQLite `experiment_snapshots` | `insertExperimentSnapshot` | No freeze |
| Semantic memory | SQLite `semantic_memory` | `insertSemanticPattern` | Sob demanda |
| Parameter versions | SQLite `parameter_versions` | `insertParameterVersion` | Em evolução |
| Evolution ledger | SQLite `evolution_ledger` | `insertEvolutionLedgerEntry` | Em evolução |
| Frontend data | IndexedDB (Dexie) `LyzerEdgeDB` | Dexie API | Pelo frontend |

### 5.2 Apenas em Memória (Volátil)

| Estado | Risco |
|--------|-------|
| `cclist.stressLevel` | Perdido em reinicialização — C-CLIST recomeça de 0 |
| `mol.state` | Perdido — MOL recomeça como 'EXECUTE' |
| `mol.durationOfInaction` | Perdido — DOI zera |
| `mol.structuralCoherenceLock` | Perdido — SCL zera |
| `signalEngine.memory` | Perdido — feature history é resetado |
| `globalEVMemory` | Perdido — EV stats resetados |
| `mtfCandles` (todos os TFs) | Perdido — precisa re-warmup |
| `ecoEngine.population` | Perdido — população genética reinicia |
| `extinctionEngine.currentState` | Perdido — recomeça como 'NORMAL' |
| `dailyCapitalUsed` | Perdido — limite diário é resetado |
| TruthKernel instances | Perdido — cada engine recria |
| `ledger.entries` | Perdido — histórico da corte perdido |
| `ledger.edgeRidingCounters` | Perdido — contadores de near-miss resetados |

### 5.3 Implicações
- **C-CLIST stressLevel volátil**: se o sistema estava acumulando stress (indicando "stability illusion"), após restart o C-CLIST zera, potencialmente permitindo execuções em mercados que ainda estão em regime de estabilidade ilusória.
- **MOL recovery state volátil**: se o MOL estava em 'RECOVERY' com SCL = 2 (prestes a liberar execução), após restart o MOL volta para 'EXECUTE' sem passar pela recuperação.
- **`dailyCapitalUsed` volátil**: se o servidor reinicia no meio do dia, o limite diário de capital (MAX_DAILY_CAPITAL) é resetado, permitindo execuções adicionais.

---

## 6. Critical Findings

### 🔴 CRITICAL 1: `signalEngine` Singleton Cross-Contamination

**Arquivo**: `streamEngine.js:34,59` → `evSignalRedesign.js:22-26`

**Problema**: O `EvSignalEngine` é instanciado uma vez e compartilhado por todas as 6 engines. Seu `this.memory.featureHistory` não diferencia por símbolo. Duas engines chamando `evaluate()` com candles diferentes podem corromper o cache de características uma da outra.

**Evidência**: Em `evSignalRedesign.js:22-26`:
```js
this.memory = {
  featureHistory: {},   // ← global, sem separação por symbol
  trendScores: {},      // ← global
  signalCache: {}       // ← global
};
```

**Recomendação**: Criar um `EvSignalEngine` por engine, ou adicionar prefixo de símbolo nas chaves do cache.

### 🔴 CRITICAL 2: `ledger` Singleton Compartilhado Entre 6 Courts

**Arquivo**: `court.js:8` → `ledger.js:77`

**Problema**: Cada engine tem seu próprio `ConstitutionalCourt`, mas todos usam o mesmo `ledger` (import de módulo). O `constraintEngine` lê `ledger.getNearMissCount('drawdown')` que acumula contadores de **todos os símbolos**. Edge-riding de um símbolo pode bloquer outro.

**Evidência**:
- `constraintEngine.js:38`: `const drawdownMisses = ledger.getNearMissCount('drawdown');`
- `ledger._updateEdgeRidingMetrics` é chamado para cada requestPermission de qualquer engine.
- Se BTCUSDT tem 3 near-misses e ETHUSDT tem 3, juntos chegam ao limite de 5 e bloqueiam ambos.

**Recomendação**: Separar per-symbol no ledger, ou criar um ledger por engine.

### 🟡 HIGH 3: Estado Volátil do C-CLIST e MOL Perdido em Reinicialização

**Arquivo**: `c-clist.js:9`, `mol.js:8-11`

**Problema**: `cclist.stressLevel`, `mol.state`, `mol.durationOfInaction`, `mol.structuralCoherenceLock` são resetados no restart. O sistema perde memória do estresse epistemológico e estado de recuperação.

**Impacto**: Uma reinicialização quente pode resetar o estado de segurança da corte, permitindo execuções que seriam bloqueadas se o estado tivesse sido preservado.

**Recomendação**: Persistir court state no mesmo `engine_state.json` ou SQLite.

### 🟡 HIGH 4: `globalEVMemory` Não Persistido

**Arquivo**: `streamEngine.js:111-115`

**Problema**: `this.globalEVMemory.signalBuckets` e `regimeBuckets` acumulam dados de EV profiling que são perdidos no restart.

**Impacto**: O sistema perde capacidade de classificar trades com base em EV histórico.

**Recomendação**: Persistir EV memory no SQLite.

### 🟡 MEDIUM 5: `engines` Array Mutável por Referência

**Arquivo**: `server.js:419`

**Problema**: O array `engines` é module-level e referenciado por mutação (`engines.push(engine)`, `engines.flatMap(...)`, `engines.find(...)`). Qualquer módulo que importe `server.js` indiretamente pode acessar e modificar este array.

**Recomendação**: Encapsular em um módulo com getter, ou congelar o array após inicialização.

### 🟡 MEDIUM 6: `clients` WebSocket Array em Escopo de Módulo

**Arquivo**: `server.js:396`

**Problema**: `let clients = []` é mutado por conexões WebSocket. Potencial para memory leak se conexões não forem limpas corretamente.

**Recomendação**: Implementar heartbeat/ping para detectar conexões mortas.

### 🟢 LOW 7: `residualizationLayer.history` Não Utilizado

**Arquivo**: `residualization.js:12`

**Problema**: `this.history = []` é declarado mas nunca lido ou modificado no código.

**Recomendação**: Remover ou implementar temporalidade.

### 🟢 LOW 8: Module-level Mixin StrategyGenome.prototype

**Arquivo**: `EVAlphaResearchEngineV3_3.js:13-30`

**Problema**: `StrategyGenome.prototype.metrics` e `.summary` são adicionados como side-effect de import. Pode causar comportamento inesperado se StrategyGenome for importado antes ou em ordem diferente.

**Recomendação**: Mover para definição da classe ou funções utilitárias separadas.

---

## 7. Respostas às Perguntas Específicas

### 1. As 6 instâncias de StreamEngine compartilham estado?
**Sim, parcialmente.**
- **Compartilham**: `signalEngine` (EvSignalEngine singleton - CRÍTICO), `db` (SQLite singleton), `ledger` (ConstitutionalLedger singleton via court.js).
- **Não compartilham**: `court` (cada engine tem seu próprio), `cclist`, `mol`, `truthKernel`, `ecoEngine`, candles, tradeHistory.
- **AGENTS.md** diz "court é singleton" e "signalEngine é singleton" mas na prática: `court` é **recriado por engine** (linha 64), enquanto `signalEngine` é **genuinamente compartilhado** (linha 34,59).

### 2. Como o estado é persistido entre reinicializações?
- **tradeHistory + activePosition**: via `statePersistence.js` → `/tmp/data/engine_state.json`
- **Trades + Experiments + Eventos Causais + Candles**: via `CausalMemoryDB` → `/tmp/data/historical_causal_memory.db` (SQLite)
- **Backup para HF Storage**: `backup_restore.py` a cada 10 min e no SIGINT/SIGTERM

### 3. Existe estado volátil que deveria ser persistido?
**Sim**. Estados críticos de segurança:
- `cclist.stressLevel` — estabilidade ilusória
- `mol.state/DOI/SCL` — estado de recuperação
- `dailyCapitalUsed` — limite diário
- `globalEVMemory` — memória de proficiência

### 4. O sistema tem memória entre ticks?
**Sim, múltiplos níveis:**
- **Causal Event Sourcing**: `causal_events_log` SQLite (append-only, hash-encadeado)
- **C-CLIST**: memória de estresse acumulado (volátil)
- **MOL**: memória de inação/coerência (volátil)
- **EV Profiling**: `globalEVMemory` mantém buckets de EV por decisão (volátil)
- **Experiment Manager**: histórico de trades por experimento (persistente)
- **Ledger da Corte**: registro de permissões (volátil)
- **Não há verdadeiro event sourcing entre engines** — cada engine é independente exceto pela contaminação do `signalEngine`.

### 5. Como o estado é resetado?
- **Freeze experiment** (`/api/experiments/freeze-and-new`): `engine.tradeHistory = []`, `engine.bootTime = Date.now()`, `engine.activePosition = null`.
- **Reinicialização**: Volátil (C-CLIST, MOL, etc.) volta a valores padrão.
- **Clear state**: `clearEngineState()` deleta o JSON de persistência.
- **Não há mecanismo de "hard reset" de court/cclist/mol via API** — apenas criando novas instâncias.

---

## 8. Sumário de Recomendações

| Prioridade | Recomendação | Esforço |
|:----------:|-------------|:-------:|
| 🔴 | Separar `EvSignalEngine` por símbolo ou adicionar symbol key no cache | Baixo |
| 🔴 | Separar `ledger` por engine ou por símbolo | Médio |
| 🟡 | Persistir `cclist.stressLevel` e `mol.state` no restart | Baixo |
| 🟡 | Persistir `globalEVMemory` | Baixo |
| 🟡 | Congelar `engines` array após init | Muito Baixo |
| 🟡 | Adicionar heartbeat em WebSocket clients | Baixo |
| 🟢 | Remover `rl.history` não utilizado | Muito Baixo |
| 🟢 | Mover mixin `StrategyGenome.prototype` | Baixo |
