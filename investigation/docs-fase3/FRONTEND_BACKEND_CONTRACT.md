# Frontend-Backend Contract Verification

> Generated: 2026-07-27
> Scope: `lyzer edge/backend/server.js` + `lyzer edge/backend/streamEngine.js` ↔ `lyzer edge/src/`

---

## 1. Backend Routes Inventory

| # | Route | Method | Auth | Params | Response | WS? | Documentado? |
|---|-------|--------|:----:|--------|----------|:---:|:------------:|
| 1 | `/api/status` | GET | — | — | `{ status, mode }` | No | ❌ (api.md desatualizado) |
| 2 | `/api/candles/:symbol` | GET | — | `symbol` (path) | `{ symbol, candles[], trades[], connectionState }` | No | ✅ |
| 3 | `/api/trades/close` | POST | ✅ admin | `symbol, id, exitPrice, exitDate, fees` | `{ success, message }` | No | ❌ |
| 4 | `/api/trades/delete` | POST | ✅ admin | `symbol, id` | `{ error }` (403 always) | No | ❌ |
| 5 | `/api/trades/wipe` | POST | ✅ admin | (body optional) | `{ success, message, frozenExperiment, newExperiment }` | ✅ broadcasts `experiment_frozen` | ❌ |
| 6 | `/api/trades/export` | GET | — | — | `{ exportedAt, totalTrades, trades[] }` | No | ❌ |
| 7 | `/api/extinction/status` | GET | — | — | `{ state, stress, diversity }` | No | ❌ |
| 8 | `/api/experiments/dashboard` | GET | — | — | dashboard data | No | ❌ |
| 9 | `/api/experiments/active` | GET | — | — | `{ experiment_id, liveMetrics, ... }` | No | ❌ |
| 10 | `/api/experiments/freeze-and-new` | POST | ✅ admin | `{ reason? }` | `{ success, message, frozen, newActive, snapshot }` | ✅ broadcasts `experiment_frozen` | ❌ |
| 11 | `/api/experiments/promote-champion` | POST | ✅ admin | `{ experimentId, force? }` | `{ success, message, champion }` | ✅ broadcasts `champion_promoted` | ❌ |
| 12 | `/api/experiments/update-status` | POST | ✅ admin | `{ experimentId, status, reason? }` | (no response body — send + broadcast) | ✅ broadcasts `experiment_status_updated` | ❌ |
| 13 | `/api/experiments/alpha-discovery` | GET | — | — | discovery data | No | ❌ |
| 14 | `/api/experiments/ranking` | GET | — | `sortBy`, `limit` (query) | `{ ranking[] }` | No | ❌ |
| 15 | `/api/experiments/:id` | GET | — | `id` (path) | `{ experiment, snapshot, trades[] }` | No | ❌ |
| 16 | `/api/test-telegram` | GET | — | — | `{ success, message }` | No | ❌ |
| 17 | `/api/archeologist/dna` | GET | — | — | DNA data | No | ❌ |
| 18 | `/api/archeologist/rankings` | GET | — | — | rankings | No | ❌ |
| 19 | `/api/archeologist/dead-code` | GET | — | — | dead code candidates | No | ❌ |
| 20 | `/api/archeologist/philosopher-report` | GET | — | — | philosopher report | No | ❌ |
| 21 | `/api/mind/mri` | GET | — | — | MRI report | No | ❌ |
| 22 | `/metrics` | GET | ✅ admin | — | Prometheus metrics | No | ❌ |
| 23 | WebSocket `/` (wss) | WS | — | — | Broadcast de eventos | ✅ | ✅ (parcial) |
| 24 | `/*` (SPA fallback) | GET | — | — | `dist/index.html` | No | ❌ |

---

## 2. Frontend API Calls Map

| # | Component / File | URL Called | Method | Backend Match? | Contrato OK? | Notas |
|---|-----------------|-----------|:------:|:--------------:|:------------:|-------|
| 1 | `LiveTradeSyncService:32` | `/api/candles/${sym}` | GET | ✅ R#2 | ✅ | Espera `data.trades[]`, `data.candles[]`, `data.mode` — compatível |
| 2 | `LiveTradingView:1173` | `/api/candles/${symbol}` | GET | ✅ R#2 | ✅ | Espera `data.candles[]`, `data.trades[]` — compatível |
| 3 | `db/queries.js:169` | `/api/trades/close` | POST | ✅ R#3 | ⚠️ Parcial | `authenticateAdmin` não enviado; se ADMIN_API_KEY setada, falha 401 |
| 4 | `db/queries.js:210` | `/api/trades/delete` | POST | ✅ R#4 | ⚠️ Min | Backend sempre responde 403 (Zero Entropy), frontend não trata o 403 |
| 5 | `db/queries.js:817` | `/api/trades/wipe` | POST | ✅ R#5 | ⚠️ Parcial | `authenticateAdmin` não enviado; se ADMIN_API_KEY setada, falha 401 |
| 6 | `LiveTradingView:1555` | `/api/trades/wipe` | POST | ✅ R#5 | ⚠️ Parcial | Inline button, não envia headers de admin |
| 7 | `ZSpaceDashboard:55` | `/api/extinction/trigger` | POST | ❌ **404** | ❌ **MISMATCH** | Rota INEXISTENTE no backend — retorna 404 ou SPA fallback |
| 8 | `experimentService:15` | `/api/experiments/dashboard` | GET | ✅ R#8 | ✅ | Usado por `ExperimentDashboardWidget` |
| 9 | `experimentService:44` | `/api/experiments/freeze-and-new` | POST | ✅ R#10 | ⚠️ Parcial | `authenticateAdmin` não enviado |
| 10 | `experimentService:29` | `/api/experiments/active` | GET | ✅ R#9 | 🟡 Nunca chamado | Método existe no service, mas nenhum componente importa/usa |
| 11 | `experimentService:66` | `/api/experiments/promote-champion` | POST | ✅ R#11 | 🟡 Nunca chamado | Idem |
| 12 | `experimentService:89` | `/api/experiments/ranking` | GET | ✅ R#14 | 🟡 Nunca chamado | Idem |
| 13 | `experimentService:104` | `/api/experiments/:id` | GET | ✅ R#15 | 🟡 Nunca chamado | Idem |
| 14 | `experimentService:117` | `/api/experiments/alpha-discovery` | GET | ✅ R#13 | 🟡 Nunca chamado | Idem |
| 15 | `experimentService:134` | `/api/experiments/update-status` | POST | ✅ R#12 | 🟡 Nunca chamado | Idem |
| 16 | `wsClient:19` | `ws://<host>` | WS | ✅ R#23 | ✅ | Conecta ao WebSocket do server |
| 17 | `BinanceSeederService:24` | `https://api.binance.com/...` | GET | 🔗 Externo | ✅ | Chamada externa legítima |

---

## 3. Mismatches

### 3.1 Rota no backend não chamada pelo frontend (mas documentada no Service)

| Backend Route | Método | Status |
|--------------|:------:|:------:|
| `/api/experiments/active` | GET | 🟡 Service importado, método `getActive()` NUNCA invocado |
| `/api/experiments/promote-champion` | POST | 🟡 Service importado, método `promoteChampion()` NUNCA invocado |
| `/api/experiments/ranking` | GET | 🟡 Service importado, método `getRanking()` NUNCA invocado |
| `/api/experiments/:id` | GET | 🟡 Service importado, método `getExperiment()` NUNCA invocado |
| `/api/experiments/alpha-discovery` | GET | 🟡 Service importado, método `getAlphaDiscovery()` NUNCA invocado |
| `/api/experiments/update-status` | POST | 🟡 Service importado, método `updateStatus()` NUNCA invocado |

> Nota: `ExperimentDashboardWidget` obtém todos esses dados via `getDashboard()` (endpoint composto), tornando estes métodos redundantes no frontend.

### 3.2 URL no frontend sem backend correspondente

| Frontend URL | Arquivo | Problema |
|-------------|---------|----------|
| `POST /api/extinction/trigger` | `ZSpaceDashboard.js:55` | ❌ **Rota INEXISTENTE.** Backend só tem `GET /api/extinction/status`. Chamada resulta em 404 (ou pior: SPA fallback retorna HTML, causando parse error). |

### 3.3 Contratos Diferentes

| Endpoint | Backend retorna | Frontend espera | Problema |
|---------|----------------|-----------------|----------|
| `/api/trades/close` | `{ success, message }` (com auth) | Apenas chama fetch, não verifica resposta | ⚠️ Baixo impacto |
| `/api/trades/delete` | `{ error }` status 403 (sempre) | Espera sucesso | ⚠️ Backend bloqueia, mas frontend não trata o 403 — pode causar erro silencioso |
| `/api/trades/wipe` | `{ success, message, frozenExperiment, newExperiment }` | `queries.js`: só loga status. LTV: `location.reload()` sem verificar | ⚠️ Baixo impacto |
| `/api/experiments/freeze-and-new` | `{ success, message, frozen, newActive, snapshot }` | `experimentService`: espera `{ success, message }` ou erro | ✅ Compatível |

### 3.4 Autenticação (ADMIN_API_KEY)

**6 endpoints** usam `authenticateAdmin` middleware. Nenhuma chamada frontend envia `x-admin-key` ou `Authorization` header. Se a env `ADMIN_API_KEY` estiver configurada, todas estas chamadas falharão com 401:

- `POST /api/trades/close` ← `queries.js`
- `POST /api/trades/delete` ← `queries.js`
- `POST /api/trades/wipe` ← `queries.js` + `LiveTradingView`
- `POST /api/experiments/freeze-and-new` ← `ExperimentDashboardWidget`
- `POST /api/experiments/promote-champion` ← (nunca chamado)
- `POST /api/experiments/update-status` ← (nunca chamado)

---

## 4. Dead Routes

Endpoints no backend que **nenhum código frontend chama**:

| Route | Method | Criado para |
|-------|:------:|-------------|
| `/api/experiments/active` | GET | Experiment detail (nunca chamado via service) |
| `/api/experiments/promote-champion` | POST | Admin (nunca chamado) |
| `/api/experiments/alpha-discovery` | GET | Cross-experiment insights (nunca chamado) |
| `/api/experiments/update-status` | POST | 6-State Lifecycle (nunca chamado) |
| `/api/experiments/ranking` | GET | Leaderboard (nunca chamado) |
| `/api/experiments/:id` | GET | Single experiment detail (nunca chamado) |
| `/api/archeologist/dna` | GET | Codebase DNA (nunca chamado) |
| `/api/archeologist/rankings` | GET | Module rankings (nunca chamado) |
| `/api/archeologist/dead-code` | GET | Dead code audit (nunca chamado) |
| `/api/archeologist/philosopher-report` | GET | Philosopher report (nunca chamado) |
| `/api/mind/mri` | GET | Project MRI (nunca chamado) |
| `/api/status` | GET | Health check (nunca chamado) |
| `/api/trades/export` | GET | Export (nunca chamado) |
| `/api/test-telegram` | GET | Test (nunca chamado) |
| `/api/extinction/status` | GET | Extinction status (nunca chamado) |
| `/metrics` | GET | Prometheus (nunca chamado) |

> **Total: 16 dead routes** (mais da metade do backend).

---

## 5. WebSocket Events

| Event Type | Emitter (backend) | Listener (frontend) | Match? | Notas |
|-----------|:-----------------:|:-------------------:|:------:|-------|
| `{ type: 'tick', symbol, market, mode }` | `streamEngine.js:207` — `this.emit('arl', { type: 'tick', ... })` | `wsClient.onData()` → `LiveTradeSync._onMessage()` + componentes | ✅ | Payload: `{ type, symbol, market, mode }` |
| `{ type: 'arl', trade, symbol, mode }` | `streamEngine.js:476` — `this.emit('arl', { type: 'arl', trade, symbol, mode })` | wsClient → LiveTradeSync | ✅ | Payload: `{ type, trade: {...}, symbol, mode }` |
| `{ type: 'arl', ...full payload }` | `streamEngine.js:897` — `this.emit('arl', payload)` | wsClient → LiveTradeSync + GamifiedCommandCenterView | ✅ | Payload completo: signal, kernel, overlays, trade, ev, arl |
| `{ liveExecution: { symbol, side, order, price, quantity } }` | `server.js:431` — `engine.on('execution', p => broadcast({ liveExecution: p }))` | `LiveTradeSync._onMessage()` — trata `data.liveExecution` | ✅ | Payload: `{ liveExecution: { symbol, side, order, price, quantity } }` |
| `{ type: 'experiment_frozen', frozenExperiment, newExperiment }` | `server.js:110-114` — `broadcast(...)` | Ninguém escuta especificamente | 🟡 **Sem listener específico** | wsClient genérico recebe, mas nenhum handler filtra `experiment_frozen` |
| `{ type: 'champion_promoted', champion }` | `server.js:137` — `broadcast(...)` | Ninguém escuta especificamente | 🟡 **Sem listener específico** | Idem |
| `{ type: 'experiment_status_updated', experiment }` | `server.js:162` — `broadcast(...)` | Ninguém escuta especificamente | 🟡 **Sem listener específico** | Idem |
| `engine.emit('state_changed')` | `streamEngine.js` (vários pontos) | `server.js:434` — `engine.on('state_changed', ...)` | ✅ | Apenas server-side, não via WebSocket |

---

## 6. Summary

### 🔴 Critical Issues
1. **`POST /api/extinction/trigger`** chamado pelo frontend (`ZSpaceDashboard.js:55`) **não existe** no backend. Resulta em 404 (ou SPA HTML retornado, causando JSON parse error).
2. **`ADMIN_API_KEY` nunca enviado pelo frontend** — se configurado, quebra 4 funcionalidades (wipe, close, freeze-and-new, delete).

### 🟡 Warning Issues
3. **16 dead routes** (~70% do backend) nunca chamadas pelo frontend. Código morto.
4. **6 métodos do `experimentService`** nunca são invocados por nenhum componente (`getActive`, `promoteChampion`, `getRanking`, `getExperiment`, `getAlphaDiscovery`, `updateStatus`).
5. **3 eventos WebSocket** (`experiment_frozen`, `champion_promoted`, `experiment_status_updated`) são transmitidos mas **ninguém escuta** no frontend.
6. **`knowledge/api.md`** drasticamente desatualizado: lista `GET /api/state` e `GET /health` que não existem, e não documenta 20+ endpoints reais.

### 🔵 Minor Issues
7. `POST /api/trades/delete` sempre retorna 403 — frontend não trata adequadamente.
8. Contrato de resposta `/api/trades/wipe` não é verificado pelo frontend (apenas `location.reload()` ou log de status).
