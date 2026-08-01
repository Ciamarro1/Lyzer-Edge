# Escopo 3 — Backend server + db + segurança

**Projeto:** LYZER EDGE (monólito Node.js/Express + WebSocket, porta 7860)
**Fleet:** 6 StreamEngines (BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, EURUSDT, GBPUSDT)
**Arquivos analisados:** `server.js` (533 linhas), `db.js` (801 linhas), `experimentManager.js` (360 linhas), `alphaDiscoveryEngine.js` (160 linhas)
**Modo de execução:** EXPLORER (analisar e reportar — NÃO implementa)

---

## 1. Arquitetura do server (rotas, middleware, WS, fleet)

### Stack e bootstrap
- **Imports (server.js:1-9, 11):** `dotenv/config`, `express`, `http`, `ws/WebSocketServer`,
  `StreamEngine` + `arl` (de `./streamEngine.js`), `loadEngineState/saveEngineState/clearEngineState`
  (de `./statePersistence.js`), `sendTelegramAlert` (de `./telegram.js`), `db` (default export de `./db.js`),
  `ExperimentManager` (de `./experimentManager.js`). Em seguida, `register` (de `../src/observability/index.js`),
  `LyzerArcheologist`, e `LyzerMindMRI`.
- **App/HTTP/WS (server.js:21-23):** `app = express()`, `server = http.createServer(app)`,
  `wss = new WebSocketServer({ server })`. WS compartilha o mesmo server HTTP.
- **Observabilidade (server.js:37):** `register` importado de `../src/observability/index.js`
  e usado no endpoint `/metrics` (server.js:49-56). **Observação:** esta importação ocorre
  em *deferred import* (ESM) **depois** de definidas várias rotas — isso é válido em ESM
  porque os imports são *hoisted*, mas o padrão `register` parece exposto ao endpoint
  `/metrics`.
- **Static + JSON (server.js:34-35):** `app.use(express.static(path.join(__dirname, '../dist')))`
  serve o build Vite; `app.use(express.json())` faz parse de bodies JSON.

### Middleware de segurança (ou falta dele)
- **NÃO há** `helmet`, `cors`, `express-rate-limit`, `csurf`, `hpp`, ou qualquer
  middleware de segurança (server.js:1-56). Apenas `express.static` e `express.json`.
- `authenticateAdmin` (server.js:39-46) é o único controle de acesso — e é frágil
  (ver §2). Não é aplicado globalmente; só em rotas específicas.

### Rotas (server.js)

| Grupo | Rotas | Auth | Linhas | Observação |
|-------|-------|------|--------|------------|
| Métricas | `GET /metrics` | `authenticateAdmin` | 49-56 | Prometheus |
| Experiments (Quant Lab) | `GET /api/experiments/dashboard` | — (pública) | 61-68 | Exposição de dados |
| | `GET /api/experiments/active` | — (pública) | 71-79 | Exposição de dados |
| | `POST /api/experiments/freeze-and-new` | `authenticateAdmin` | 82-129 | Mutação crítica |
| | `POST /api/experiments/promote-champion` | `authenticateAdmin` | 132-142 | Mutação crítica |
| | `GET /api/experiments/alpha-discovery` | — (pública) | 145-152 | Leitura de trades |
| | `POST /api/experiments/update-status` | `authenticateAdmin` | 155-166 | Mutação |
| Archeologist | `GET /api/archeologist/dna` | — | 173-180 | Análise de código |
| | `GET /api/archeologist/rankings` | — | 183-185 | Análise de código |
| | `GET /api/archeologist/dead-code` | — | 188-191 | Análise de código |
| MindMRI | `GET /api/mind/mri` | — | 197-204 | Análise de código |
| | `GET /api/archeologist/philosopher-report` | — | 207-209 | Análise de código |
| Experiments (dados) | `GET /api/experiments/ranking` | — | 212-220 | Ranking público |
| | `GET /api/experiments/:id` | — | 223-233 | Detalhes públicos |
| Trades (Zero Entropy) | `POST /api/trades/close` | `authenticateAdmin` | 238-283 | Fechamento manual |
| | `POST /api/trades/delete` | `authenticateAdmin` | 286-290 | **403 bloqueado** (Zero Entropy) |
| | `POST /api/trades/wipe` | `authenticateAdmin` | 293-314 | Reescrito → Freeze+New |
| Core | `GET /api/status` | — | 323-325 | Health |
| | `GET /api/trades/export` | — (pública) | 327-343 | **Exporta todos os trades sem auth** |
| | `GET /api/test-telegram` | — (pública) | 345-352 | **Dispara alerta Telegram sem auth** |
| | `GET /api/candles/:symbol` | — | 354-379 | Candle data por symbol |
| Extinction | `GET /api/extinction/status` | — | 384-394 | Legacy `arl` singleton |
| SPA fallback | `app.use(...)` | — | 462-465 | Depois de todas API routes |

### WebSocket (server.js:396-415)
- `let clients = []` (line 396); `wss.on('connection', ...)` (line 398).
- **Zero verificação de autenticação, origem, ou protocolo.** Conexão WS = acesso total.
- `broadcast` (line 408-415) envia JSON para todos clients com `readyState === 1`.

### Fleet / StreamEngines (server.js:417-459)
- `targetAssets` (line 418): `['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSDT', 'GBPUSDT']` — confirma 6 motores.
- Cada `StreamEngine` (line 423-427) recebe `mode: process.env.ARL_MODE`, `symbol`, `interval: '1m'`.
- Event listeners por engine (line 430-446): `'arl'` → broadcast; `'execution'` → broadcast `{liveExecution}`;
  `'state_changed'` → `saveEngineState` + sync de trades para SQLite (fire-and-forget).
- `loadEngineState(engines)` (line 452) — carrega estado persistido.
- Start staggered (line 455-459): `setTimeout(() => engine.start(), idx * 2000)` — 2s de offset
  entre cada um, total ~10s para toda a frota.

### Servico de backup (server.js:467-492)
- `exec(\`python3 "${scriptPath}" backup\`)` (line 472) — child_process.exec. `scriptPath` vem de
  `path.join(__dirname, '../backup_restore.py')` (line 470) — **não há entrada de usuário**
  interpolada. (Ver §2 para avaliação adversarial.)
- `setInterval(runBackup, 10 * 60 * 1000)` — backup a cada 10 min (line 480).
- SIGINT/SIGTERM (line 483-492): dispara backup e `process.exit(0)` após 4s. **NÃO**
  faz `server.close()`, `wss.close()`, ou para os engines — potencial perda de dados
  em shutdown.

### Serviço de relatório em grupo (server.js:494-520)
- `sendFleetReport` (line 495-517) relata PnL, trades, status de cada engine via Telegram.
- `setInterval(sendFleetReport, 4 * 60 * 60 * 1000)` — a cada 4h (line 520).
- Startup (line 522-533): `server.listen(PORT=7860, '0.0.0.0')`; backup inicial pós-warmup (line 526);
  notificação Telegram + fleet report após 1min (line 528-532).

### Configuração forçada (server.js:16-19) — CRÍTICO
```js
process.env.ARL_MODE = process.env.ARL_MODE || 'TESTNET';           // line 17
process.env.LIVE_TRADING_ENABLED = process.env.LIVE_TRADING_ENABLED || 'true';  // line 18  ← RISK
process.env.MAX_DAILY_CAPITAL = process.env.MAX_DAILY_CAPITAL || '1000';       // line 19
```
- `ARL_MODE` default = `'TESTNET'` (seguro).
- `LIVE_TRADING_ENABLED` default = **`'true'`** — ativa trading "ao vivo" por default,
  mesmo quando `ARL_MODE=TESTNET`. Interpretação ambígua, mas o *naming* sugere risco real.

---

## 2. Segurança: confirmação/refutação de achados anteriores

**Legenda:** ✅ Confirmado | ❌ Refutado | ⚠️ Parcial / nuance

| # | Achego da auditoria anterior | Arquivo:Linha | Confirmado? | Evidência (adversarial) |
|----|------------------------------|---------------|-------------|--------------------------|
| S1 | Admin key via query param | server.js:43 | ✅ | `req.query.adminKey` aceito diretamente como credencial. Query params são logs, histórico, e referer — vazam credencial. |
| S2 | `if (!adminKey) return next()` — auth skip quando env não definida | server.js:42 | ✅ | Se `ADMIN_API_KEY` estiver unset, **todas** as rotas `authenticateAdmin` são completamente abertas. Falha de *secure-by-default*. |
| S3 | WS sem auth | server.js:398 | ✅ | `wss.on('connection', (ws) => {...})` — nenhum handshake, token, origin check ou `verifyClient`. Conexão WS = stream completo de ticks/exec/trades. |
| S4 | `exec()` sem sanitização | server.js:468-477 | ⚠️ **Refutado (injetabilidade)** | O `exec` (line 472) executa `python3 "${scriptPath}" backup`. `scriptPath` = `path.join(__dirname, '../backup_restore.py')` — **totalmente interno**, sem input do usuário. Não há vetor de injeção. Contudo: (a) `exec` usa shell (não `execFile`/`spawn`), (b) `__dirname` contém caminho do projeto — se o caminho tiver caracteres especiais, escapamento via `"${scriptPath}"` é frágil. Classifico como **LOW / *code smell***, não como RCE. |
| S5 | SQLi em db.js:672 (`${sets.join(', ')}`) | db.js:672 | ❌ **Refutado** | O template `${sets.join(', ')}` interpola **apenas strings hardcoded**: `'exit_price = ?'`, `'pnl = ?'`, `'pnl_pct = ?'`, `'status = ?'`, `'exit_timestamp = ?'`, `'reason_codes_json = ?'`, `'ev_json = ?'` (db.js:662-667). Nenhuma vem de usuário. Todos os *valores* são passados como parâmetros `?` (db.js:673). **Não é SQLi.** É um smell de estilo (não usar query builder), mas **não exploitable**. |
| S6 | Raw SQL em alphaDiscoveryEngine.js:22-34 | alphaDiscoveryEngine.js:22-34 | ✅ (raw SQL) / ❌ (SQLi) | A query é uma string literal completa (`SELECT ... FROM experiment_trades WHERE status = 'closed'`). **Não há interpolação de input.** É *raw SQL* no estilo, **não** é uma vulnerabilidade de SQLi. |
| S7 | err.message exposto em ~12 endpoints | server.js:54,66,77,127,140,150,164,178,202,218,231,312,341,350 | ✅ (piior: 14) | Contagem real: `/metrics` (line 54 — até pior, `res.end(err)` com objeto Error), dashboard (66), active (77), freeze-and-new (127), promote-champion (140), alpha-discovery (150), update-status (164), archeologist/dna (178), mind/mri (202), experiments/ranking (218), experiments/:id (231), wipe (312), trades/export (341), test-telegram (350). **14 endpoints** expõem informações de erro interno (stack/error objects). |
| S8 | Sem helmet | server.js (todos) | ✅ | Sem `helmet`/`helmet()` em imports ou `app.use`. |
| S9 | Sem CORS | server.js (todos) | ✅ | Sem `cors`/`cors()` importado ou usado. |
| S10 | Sem rate limit | server.js (todos) | ✅ | Sem `express-rate-limit` ou similar. Qualquer IP pode spamar `/api/test-telegram`, `/api/trades/export`, `/api/status`, etc. |
| S11 | Sem schema migrations | db.js:32-227 | ⚠️ **Parcial** | Não há *migration framework* (Umzug/Knex). Schema é criado via `CREATE TABLE IF NOT EXISTS` inline em `init()` (db.js:32-227). Funcionalmente *existe* um schema definido (8 tabelas + índices), mas **sem versionamento/migrations auditáveis, sem rollbacks estruturados, sem controle de versão de schema**. Em produção, evoluções de schema exigem alteração manual de código. |
| S12 | LIVE_TRADING_ENABLED=true por default | server.js:18 | ✅ | `process.env.LIVE_TRADING_ENABLED = process.env.LIVE_TRADING_ENABLED || 'true'`. Default ativo. |

### Achados adicionais (não levantados por auditorias anteriores) — CRÍTICOS
| # | Achado | Arquivo:Linha | Evidência |
|----|--------|---------------|-----------|
| S13 | `/api/trades/export` e `/api/test-telegram` são **endpoints administrativos/operacionais expostos publicamente** (sem `authenticateAdmin`) | server.js:327, 345 | Exporta todos os trades da frota (dados de PnL, prices, governança) e dispara alertas Telegram — ambos sem auth. Vazamento de dados de trading + abuso de Telegram. |
| S14 | `/api/archeologist/*` e `/api/mind/mri` expõem **análise interna de código** (DNA, dead-code, rankings, relatório filósofo) publicamente | server.js:173,183,188,197,207 | Revelam estrutura de módulos, importâncias, e relatórios estratégicos — vetor de reconhecimento interno. |
| S15 | `/metrics` (Prometheus) é protegido por `authenticateAdmin`, mas como `authenticateAdmin` pode ser bypassado (S2), métricas internas vazam | server.js:49,42 | |
| S16 | **Nenhum rate limiting nem proteção de brute-force** em credenciais via `x-admin-key` header | server.js:43-44 | |

---

## 3. db.js — schemas, migrations, SQLi

### Classe e conexão (db.js:13-30)
- `CausalMemoryDB` classe; padrão **singleton** (db.js:11, 15-16, 27-29): se nenhum `customDbPath`,
  retorna `sharedInstance`.
- DB path: `process.env.DB_PATH || path.join(DATA_DIR=/tmp/data, 'historical_causal_memory.db')`
  (db.js:7-9). **Default em `/tmp/data`** — em containers é comum, mas em prod local é efêmero
  (perdida em reboot).
- `import { recordSqliteWrite } from '../src/observability/index.js'` (db.js:4) — instrumentation.

### Pragmas de WAL (db.js:33-41)
- `journal_mode=WAL`, `synchronous=NORMAL`, `busy_timeout=5000`, `temp_store=MEMORY`,
  `cache_size=-64000` (64MB), `mmap_size=30000000000` (30GB mmap!), `wal_autocheckpoint=1000`.
- `mmap_size=30GB` (db.js:40) é **altíssimo** para um SQLite local — risco de OOM/mmap failure
  em ambientes com pouca RAM. Configuração agressiva.

### Schemas (tabelas criadas via `CREATE TABLE IF NOT EXISTS` em `init()`, db.js:44-226)

| Tabela | Linhas | Colunas/notas | Índices |
|--------|--------|---------------|---------|
| `candles` | 44-57 | id, symbol, timeframe, timestamp, open/high/low/close, volume, close_time | `idx_symbol_tf_ts` (59), `idx_symbol_tf_close` (60) |
| `causal_events_log` | 63-81 | event_id (UNIQUE), timestamp, event_type, source, causation_id, correlation_id, intent_id, parent_event, version, hash_prev, epistemic_regime, payload, context, hash | `idx_causal_ts` (83), `idx_causal_correlation` (84) |
| `semantic_memory` | 87-102 | pattern_id (UNIQUE), pattern_type, conditions_json, observations_count, success_rate, avg_pnl, confidence_score, graph_edges_json, version, created_at, updated_at | `idx_semantic_pattern` (104) |
| `parameter_versions` | 107-120 | module, parameter, version (UNIQUE), value_json, status, proposal_id, approved_by, created_at, rollback_reason | `idx_param_ver` (122) |
| `evolution_ledger` | 125-146 | ledger_id (UNIQUE), event_type, module, parameter, from/to_version, from/to_value_json, acs_score, ars_score, regime_stability_json, impact_analysis_json, reason, proposal_id, decided_by, observed_result_json, created_at | `idx_evo_module` (148), `idx_evo_type` (149) |
| `experiments` | 152-168 | id, experiment_id (UNIQUE), display_name, status, strategy_hash, config_snapshot_json, model_snapshot_json, champion_flag, created_at, frozen_at, frozen_by, notes, parent_experiment_id | `idx_exp_status` (169), `idx_exp_champion` (170) |
| `experiment_trades` | 173-197 | id, trade_id, experiment_id, symbol, direction, entry_price, exit_price, stop_loss, take_profit, quantity, pnl, pnl_pct, status, signal_json, regime, governance_decision, reason_codes_json, ev_json, entry_timestamp, exit_timestamp, created_at | `idx_exp_trades_exp` (198), `idx_exp_trades_symbol` (199), `idx_exp_trades_status` (200) |
| `experiment_snapshots` | 203-226 | id, experiment_id (UNIQUE), total_trades, winning_trades, losing_trades, win_rate, profit_factor, total_pnl, total_pnl_pct, max_drawdown, max_drawdown_pct, sharpe_ratio, avg_trade_pnl, best_trade_pnl, worst_trade_pnl, avg_holding_time_ms, equity_curve_json, drawdown_curve_json, monthly_returns_json, snapshot_timestamp | *(sem índice customizado)* |

### Métodos (db.js) — análise de SQLi e padrões

**Métodos que usam *prepared statements corretamente* (parameterized `?`):**
- `insertParameterVersion` (db.js:230-256) ✅
- `getActiveParameterVersion` (db.js:258-266) ✅
- `rollbackParameterVersion` (db.js:268-278) ✅
- `insertEvolutionLedgerEntry` (db.js:280-314) ✅
- `updateEvolutionLedgerResult` (db.js:316-324) ✅
- `getEvolutionLedgerEntries` (db.js:326-334) ✅
- `getAllEvolutionLedgerEntries` (db.js:336-344) ✅
- `insertSemanticPattern` (db.js:357-394) ✅ (inclui `ON CONFLICT ... DO UPDATE`)
- `getSemanticPatterns` (db.js:396-408) ✅
- `getCausalEventsUntil` (db.js:469-481) ✅
- `getCausalEventsByCorrelation` (db.js:483-495) ✅
- `insertCausalEvent` (db.js:419-455) ✅
- `getNextExperimentId` (db.js:543-555) ✅
- `createExperiment` (db.js:557-579) ✅
- `getActiveExperiment` (db.js:581-589) ✅
- `getExperiment` (db.js:591-599) ✅
- `getAllExperiments` (db.js:601-609) ✅
- `freezeExperiment` (db.js:611-619) ✅
- `insertExperimentTrade` (db.js:621-656) ✅ — 19 parâmetros `?`
- `getExperimentTrades` (db.js:680-690) ✅
- `getExperimentTradeCount` (db.js:692-700) ✅
- `insertExperimentSnapshot` (db.js:702-737) ✅
- `getExperimentSnapshot` (db.js:739-752) ✅
- `setChampion` (db.js:754-766) ✅ (2 queries fixas)
- `getChampion` (db.js:768-776) ✅
- `insertBatch` (db.js:497-521) ✅ (prepared `stmt`, transaction)

**Ponto de atenção — interpolação dinâmica (NÃO é SQLi, mas smell):**
- `updateExperimentTrade`: `${sets.join(', ')}` (db.js:672) → confutado na §2 (S5).
- `getExperimentRanking`: `ORDER BY s.${col} DESC` (db.js:787) → `col` vem de *whitelist*
  `['profit_factor','sharpe_ratio','win_rate','total_pnl_pct','total_trades']` (db.js:780-781),
  com fallback a `'profit_factor'`. **Não é SQLi** (defesa por lista branca), mas ainda
  interpola no SQL. Defense-in-depth recomendável, mas não exploitable.

### Conclusão de SQLi (db.js)
- **Nenhum ponto de injeção SQLi confirmado.** 17/17 queries de escrita/leitura usam
  prepared statements. O único uso de template literal em SQL (db.js:672) interpela
  strings *hardcoded*. O `ORDER BY s.${col}` (db.js:787) é whitelistado.
- **O achado de auditoria "SQLi em db.js:672" é ❌ REFUTADO.**

---

## 4. ExperimentManager — config defaults vs streamEngine

### 6-State Lifecycle (experimentManager.js:185-200)
- Estados: `ACTIVE, VALIDATING, CHAMPION, LEGACY, ARCHIVED, REJECTED` (line 186).
- `updateStatus` (experimentManager.js:185-200) usa **prepared statement** (`?`) ✅.

### Defaults de configuração (experimentManager.js:96-117 — `collectCurrentConfig`)

| Param | Source env | Default | Observação |
|-------|-----------|---------|------------|
| takeProfit | `TAKE_PROFIT` | `0.02` | |
| stopLoss | `STOP_LOSS` | `0.01` | |
| longEnabled | `LONG_ENABLED` | `true` (a não ser 'false') | |
| shortEnabled | `SHORT_ENABLED` | `true` (a não ser 'false') | |
| leverage | `LEVERAGE` | `1` | |
| symbols | `ACTIVE_SYMBOLS` | `BTCUSDT,ETHUSDT,SOLUSDT` | **Diferente da fleet do server!** Server usa 6 símbolos (BTC/ETH/SOL/BNB/EUR/GBP); config default coletada só lista 3 (BTC/ETH/SOL). Drift de configuração entre fleet e experiment snapshot. |
| activeFilters | `ACTIVE_FILTERS` | `RESIDUAL,TRG,LHDS,CCLIST,MOL` | |
| models | `ACTIVE_MODELS` | `V1_SMC,V2_SnD,V3_Momentum` | **NÃO referenciado no streamEngine** (ver abaixo) |
| mlConfig.mode | `ARL_MODE` | `TESTNET` | Alinhado com server.js:17 |
| timeframe | `TIMEFRAME` | `1h` | **Diferente do fleet!** Fleet usa `interval: '1m'` (server.js:426); config coletada usa `1h`. Drift crítico — snapshot grava 1h mas execução é 1m. |
| trgThreshold | `TRG_THRESHOLD` | `0.4` | |
| residualConsensusLimit | `RESIDUAL_CONSENSUS_LIMIT` | `0.0` | Zero = nenhuma limitação de consenso residual por default |
| cclistLethalIllusionLimit | `CCLIST_LETHAL_ILLUSION_LIMIT` | `0.9` | |
| molSclThreshold | `MOL_SCL_THRESHOLD` | `3` | |
| lhdsVetoLimit | `LHDS_VETO_LIMIT` | `0.8` | |
| ontologicalCollapseTrg | `ONTOLOGICAL_COLLAPSE_TRG` | `0.7` | |
| disabledProviders | `DISABLED_PROVIDERS` | `''` (vazio) | Nenhum provider desativado por default |

### Drift entre ExperimentManager.collectCurrentConfig e StreamEngine fleet (server.js:418-427)
- **Símbolos:** `collectCurrentConfig` default = 3 (BTC/ETH/SOL); fleet server = 6 (+BNB/EUR/GBP).
- **Timeframe:** `collectCurrentConfig` default = `1h`; fleet server = `1m`.
- **ACTIVE_MODELS (`V1_SMC,V2_SnD,V3_Momentum`):** coletado para snapshot/hash, mas **não há
  importação ou passagem desses modelos para `StreamEngine`** em server.js. O `StreamEngine`
  é construído com apenas `{mode, symbol, interval}` (server.js:423-427). Isso sugere que o
  `ACTIVE_MODELS` default é **meramente ilustrativo no snapshot** — os modelos reais não são
  injetados via esta configuração aqui. Drift/placebo de configuração.
- **RESIDUAL_CONSENSUS_LIMIT default = `0.0`** (experimentManager.js:110): zero limita
  *nothing* — qualquer consenso residual aceita. Dependendo da semântica, `0.0` pode significar
  "desativado" (aceita tudo) ou "exigir consenso perfeito". Ambiguidade.
- **DISABLED_PROVIDERS default = `[]`** (experimentManager.js:115): nenhum provider bloqueado.
  Em testnet isso é esperado, mas em live seria risco.

### Hash da estratégia (experimentManager.js:72-90)
- `computeStrategyHash` inclui: takeProfit, stopLoss, longEnabled, shortEnabled, leverage,
  symbols, activeFilters, models, mlConfig, indicators, timeframe, trgThreshold,
  residualConsensusLimit, cclistLethalIllusionLimit, molSclThreshold, lhdsVetoLimit,
  ontologicalCollapseTrg, disabledProviders.
- Hash de 8 chars uppercase SHA-256 (experimentManager.js:89).

### promoteChampion (experimentManager.js:228-247)
- Exige ≥30 trades fechados (line 235) — a menos que `force=true`.
- Exige snapshot existente (line 239-242).
- Chama `db.setChampion` + `updateStatus('CHAMPION')`.

---

## 5. alphaDiscoveryEngine — raw SQL e lógica

### Query (alphaDiscoveryEngine.js:22-34)
```sql
SELECT symbol, direction, regime, take_profit, stop_loss, pnl, status, experiment_id
FROM experiment_trades
WHERE status = 'closed'
```
- **Raw SQL string literal** — confirma o estilo. **Nenhuma interpolação de usuário.**
- Executado via `this.db.db.all(sql, [], async (err, rows) => {...})` (line 36).

### Lógica (alphaDiscoveryEngine.js:56-156)
- Aggregations por: direction, symbol, regime, take_profit (tpStats).
- `formatGroup` (line 102-116): winRate, avgPnlPct, totalPnlPct.
- Top factors (lines 124-143): best direction, top 3 symbols, best regime, best TP.
- `conclusionSummary` (line 145): string construída com `totalExperiments` e `totalTrades`.
- **Não há SQLi** — query é fixa. Confirmação de "raw SQL" (estilo) mas **refutação de vulnerabilidade**.

### BUG OPERACIONAL CRÍTICO — unhandled rejection (alphaDiscoveryEngine.js:36-52)
```js
this.db.db.all(sql, [], async (err, rows) => {   // line 36 — callback ASYNC
    if (err) return reject(err);                    // line 37
    ...
    const experiments = await this.db.getAllExperiments();  // line 52 — AWAIT dentro de callback async
    ...
    resolve({...});
});
```
- O callback (line 36) é `async`. `sqlite3.all` **não consome** o *promise* retornado
  pelo callback. Se `getAllExperiments()` (line 52) rejeitar, a rejeição vira
  **unhandled promise rejection** → o `new Promise` externo **nunca resolve nem rejeita**
  → o caller (`discoverAlpha()`) **fica pendurado para sempre** → endpoint
  `/api/experiments/alpha-discovery` (server.js:145-152) **trava indefinidamente**.
- **severidade: HIGH** — endpoint pode entrar em dead-lock sob falha de DB.

### BUG — inconsistência de schema vs snapshot (alphaDiscoveryEngine → experimentManager)
- `discoverAlpha` lê `experiment_trades` (alphaDiscoveryEngine.js:32) e `getAllExperiments`
  (line 52). Mas o **snapshot** gravado em `freezeAndCreateNew` (experimentManager.js:146)
  passa campos que `db.insertExperimentSnapshot` **não persiste** (ver §6/Bug B1). Portanto,
  a análise de alpha opera sobre trades, mas os *snapshots* ricos (metrics_json,
  market_snapshot_json, alpha_score) são perdidos — a "descoberta de alpha" entrevislha
  dados incompletos.

---

## 6. Bugs operacionais encontrados

### Bug B1 — MISMATCH de campos: snapshot gravado é ZERADO (severidade: CRÍTICA)
- **Onde:** `experimentManager.js:138-146` (caller) vs `db.js:702-736` (DB layer) vs
  schema `experiment_snapshots` (db.js:203-226).
- **Caller passa (experimentManager.js:138-145):**
  `{ experiment_id, snapshot_time, metrics_json, market_snapshot_json, alpha_score, reason_for_snapshot }`
- **DB layer espera (db.js:712-731):** `experiment_id, totalTrades, winningTrades, ..., snapshot_timestamp`
- **Problemas:**
  1. `snapshot_time` ≠ `snapshot_timestamp` → timestamp do snapshot **sempre** = `Date.now()`
     fallback (db.js:731), nunca o valor coletado.
  2. `metrics_json` (JSON com todos os métricos de `ExperimentMetrics.computeFromTrades`) →
     **não é coluna** → **totalmente descartado**.
  3. `market_snapshot_json` → **não é coluna** → **descartado**.
  4. `alpha_score` → **não é coluna** → **descartado**.
  5. `reason_for_snapshot` → **não é coluna** → **descartado**.
  6. `totalTrades`, `winningTrades`, etc. → **undefined** (caller nunca os passa) →
     gravados como `0` (defaults db.js:713-730).
- **Impacto:** Toda "freeze" grava um snapshot com **todos os métricos = 0** e descarta
  o metrics_json, market_snapshot, alpha_score e reason. A lógica de `promoteChampion`
  (experimentManager.js:239-242) requer snapshot, mas o snapshot é vazio → **dados de
  qualidade de estratégia são perdidos**. `getRanking` (db.js:778-795) ordena por
  `profit_factor` etc. — tudo zero. **Leaderboard e champion selection opera sobre
  dados em branco.**
- **Evidência linha-exata:** experimentManager.js:140 (`snapshot_time`), :141
  (`metrics_json`), :142 (`market_snapshot_json`), :143 (`alpha_score`), :144
  (`reason_for_snapshot`); db.js:731 (`snapshot.snapshot_timestamp`).

### Bug B2 — Unhandled rejection congele endpoint de alpha discovery (severidade: HIGH)
- **Onde:** `alphaDiscoveryEngine.js:36` (callback `async`) + `alphaDiscoveryEngine.js:52`
  (`await this.db.getAllExperiments()`).
- **Impacto:** Endpoint `/api/experiments/alpha-discovery` (server.js:145) **trava para
  sempre** se `getAllExperiments` falhar → hang sem timeout, sem response → *socket hang up*
  no cliente. Não há `try/catch` ao redor do `await` interno (line 52-156).

### Bug B3 — `res.status(500).end(err)` envia objeto Error como body (severidade: MÉDIA)
- **Onde:** `server.js:54` (`app.get('/metrics')`).
- `res.end(err)` com `err` um objeto `Error` → Express tenta serializar → pode lançar
  `TypeError: Converting circular structure to JSON` ou expor stack interno.
- **Evidência:** server.js:54.

### Bug B4 — `/api/trades/export` e `/api/test-telegram` sem auth (severidade: CRÍTICA)
- **Onde:** server.js:327 (`/api/trades/export`) e server.js:345 (`/api/test-telegram`).
- Nenhuma rota de trade exportação ou teste de telegrama exige `authenticateAdmin`.
- **Impacto:** Qualquer um pode baixar **todos os trades** da frota (PnL, prices, regimes,
  decisões de governança) e **disparar spam de Telegram** ilimitado (abuse do canal).

### Bug B5 — Fire-and-forget sync de trades perde erros (severidade: BAIXA)
- **Onde:** server.js:434-446 (`engine.on('state_changed')`) e server.js:92-99.
- `await db.insertExperimentTrade(...).catch(() => {})` — swallow silencioso de erro de escrita.
- **Impacto:** Se a inserção de trade falhar (ex: lock WAL), o trade é perdido sem log.

### Bug B6 — Falta de graceful shutdown (severidade: MÉDIA)
- **Onde:** server.js:483-492 (SIGINT/SIGTERM).
- Em shutdown: chama `runBackup()` + `process.exit(0)` após 4s. **NÃO** faz:
  - `server.close()` (HTTP server)
  - `wss.close()` (WebSocket)
  - `engine.stop()` / limpeza de timers dos 6 StreamEngines
- **Impacto:** Conexões WS cortadas abruptamente, trades em memória não sincronizados
  (perda de dados de experimento), backups interrompidos.

### Bug B7 — mmap_size=30GB em SQLite (severidade: BAIXA)
- **Onde:** db.js:40 (`PRAGMA mmap_size = 30000000000`).
- 30GB de memory-mapped I/O em um DB local é extrema — em ambientes com <30GB de RAM,
  falha silenciosa ou OOM. Inadequado para deploy leve.

### Bug B8 — Drift timeframe symbols (severidade: BAIXA)
- **Onde:** experimentManager.js:103 (`ACTIVE_SYMBOLS` default 3) vs server.js:418 (6 símbolos
  na fleet); experimentManager.js:108 (`TIMEFRAME` default `1h`) vs server.js:426 (`1m`).
- **Impacto:** Snapshots de experimento registram config 1h/3 símbolos enquanto a execução
  real é 1m/6 símbolos. **Inconsistência de dados historicamente irreparável.**

### Bug B9 — setChampion não atômico (severidade: BAIXA)
- **Onde:** db.js:754-766.
- Dois `UPDATE` separados (`champion_flag=0` depois `champion_flag=1`) dentro de `serialize`
  mas **sem `BEGIN/COMMIT`**. Se o processo morrer entre, pode ficar sem champion ou com 2.
- `getAllExperiments` + loop de `getExperimentSnapshot` em `getDashboard` (experimentManager.js:317-333)
  é um padrão N+1 — 1 query + N queries de snapshot. Performance degrada com N de experimentos.

---

## 7. Sumário executivo (adversarial)

| Categoria | Achado | Veredito |
|-----------|--------|----------|
| SQLi db.js:672 | `${sets.join(', ')}` | ❌ **REFUTADO** — strings hardcoded, valores parametrizados |
| SQLi alphaDiscovery:22-34 | raw SQL fixeda | ❌ **REFUTADO como SQLi** — ✅ raw SQL (estilo), 0 interpolação |
| Admin key via query param | server.js:43 | ✅ Confirmado |
| Admin auth skip se env unset | server.js:42 | ✅ Confirmado — **CRÍTICO** |
| WS sem auth | server.js:398 | ✅ Confirmado — **CRÍTICO** |
| err.message exposto | server.js:54,66,... | ✅ Confirmado — **14 endpoints** (piior que ~12) |
| Sem helmet/CORS/rate-limit | server.js todo | ✅ Confirmado |
| exec() injeção | server.js:472 | ⚠️ **REFUTADO como injeção** — input interno fixo; *code smell* LOW |
| LIVE_TRADING_ENABLED=true default | server.js:18 | ✅ Confirmado |
| **Snapshot zerado / dados perdidos** | experimentManager.js:138-146 vs db.js:702-736 | ✅ **Bug CRÍTICO B1** — metrics_json/market_snapshot/alpha_score/reason NÃO persistidos; campos zerados |
| **Hang endpoint alpha-discovery** | alphaDiscoveryEngine.js:36,52 | ✅ **Bug HIGH B2** — unhandled rejection congela Promise |
| **Export/trades sem auth** | server.js:327,345 | ✅ **Bug CRÍTICO B4** |
| Graceful shutdown inexistente | server.js:483-492 | ✅ **Bug MÉDIO B6** |
| Drift config fleet vs snapshot | experimentManager.js:103,108 vs server.js:418,426 | ✅ **Bug BAIXA B8** |

**Conclusão do EXPLORER:** A auditoria anterior estava **maioria correta**, mas dois achados
precisam de reclassificação: (1) a "SQLi db.js:672" é um **falso positivo** (refutado) — as
queries estão parametrizadas; (2) a "raw SQL alphaDiscovery" é raw pelo estilo, mas **não
injetável**. O que as auditorias anteriores **não levantaram** são os bugs operacionais mais
graves: **B1 (snapshot zerado → perda total de métricas de experimento)**, **B2 (hang do
endpoint de alpha discovery)**, e **B4 (export de trades + teste de telegram públicos)**.
Esses três são prioridade absoluta para correção antes de qualquer exposição prod.
