# Error Handling & Resilience Audit — Red Team

## 1. Error Handling Score by Module

| Módulo | try/catch ratio | Catch vazios | Logging | Retry | Circuit Breaker | Score |
|--------|:--------------:|:------------:|:-------:|:-----:|:---------------:|:-----:|
| **streamEngine.js** | 8/8 funções principais | 0 | ✅ console.error/warn | ❌ | ❌ | **7/10** |
| **server.js** | 18/20 rotas | 0 | ✅ console.error | ❌ | ❌ | **8/10** |
| **exchangeExecution.js** | 1/2 funções | 0 | ✅ console.error | ❌ | ❌ | **5/10** |
| **liveDataIngestor.js** | 3/6 funções | 0 | ✅ console.error/warn | ⚠️ URL rotation (multi-endpoint) | ⚠️ polling fallback | **8/10** |
| **TruthKernel (kernel.js)** | 0/1 | 0 | ❌ none | ❌ | ❌ | **2/10** |
| **ConstitutionalCourt (court.js)** | 0/1 | 0 | ❌ none (via ledger) | ❌ | ❌ | **3/10** |
| **C-CLIST** | 0/1 | 0 | ❌ none | ❌ | ❌ | **2/10** |
| **MOL** | 0/1 | 0 | ❌ none | ❌ | ❌ | **2/10** |
| **ResidualizationLayer** | 0/1 | 0 | ❌ none | ❌ | ❌ | **2/10** |
| **ExecutionTriggerLayer** | 0/1 | 0 | ❌ none | ❌ | ❌ | **1/10** |
| **Providers (v1-v4)** | 0/4 | 0 | ❌ none | ❌ | ❌ | **1/10** |
| **telegram.js** | 1/4 | 0 | ✅ console.error | ✅ exponential backoff (sendTelegramAlertWithRetry) | ❌ | **8/10** |
| **statePersistence.js** | 3/3 | 0 | ✅ console.error | ❌ | ❌ | **7/10** |
| **db.js** | 0/30+ métodos | 0 | ✅ console.error (only constructor) | ❌ | ❌ | **3/10** |
| **CausalMemoryDB (DB IO)** | 0/30+ | 0 | ❌ (no per-query logging) | ❌ | ❌ | **2/10** |
| **dualRealityMonitor.js** | 0/2 | 0 | ❌ none | ❌ | ❌ | **2/10** |
| **Vault, Ledger, ConstraintEngine** | 2/3 | 2 empty | ⚠️ minimal | ❌ | ❌ | **3/10** |
| **Research engines (decisionLedger, correlationRisk, etc.)** | >90% | 11 files com catch vazio | ⚠️ some console.log | ❌ | ❌ | **3/10** |

### Notas:
- **Score 8-10**: Módulos com fallback ou logging consistente (server.js, liveDataIngestor, telegram, statePersistence)
- **Score 1-4**: Pure math/computation kernels que não tratam erros e propagam exceções sem logging
- **Score 3-5**: DB módulos que propagam rejeições de Promise sem fallback

---

## 2. Critical Error Paths

### O que acontece se streamEngine.js lança uma exceção?

**processCandle** (`streamEngine.js:219-223`):
```js
try {
  await this.processCandle(candle, this.candles.length - 1);
} catch (e) {
  console.error('[STREAM] Error in processCandle:', e);
}
```
- ⚠️ O erro é **logado mas engolido**. A engine continua rodando, mas o candle que causou o erro é **silenciosamente dropado**.
- Se `processCandle()` corrompe estado interno (`this.activePosition`, `this.candles`) antes de falhar, o sistema fica em estado inconsistente.
- ❌ **Nenhuma notificação** é enviada para o Telegram quando `processCandle` falha.
- ❌ **Nenhum contador** de erros é incrementado para observabilidade.

**startSimulationLoop** (`streamEngine.js:157-183`):
- O `setInterval` NÃO tem try/catch. Se `processCandle` lançar uma exceção síncrona, o **interval inteiro morre** silenciosamente.
- A engine para de processar novos candles sem nenhum aviso além de um único log.

### O que acontece se o WebSocket cai?

**liveDataIngestor.js**:
- ✅ **Reconexão automática**: após 2 tentativas de WS, faz fallback para REST polling (`_startPolling`)
- ✅ **Fallback sintético**: gera dados sintéticos se todas as REST endpoints falham
- ❌ Timeout de reconexão é fixo (2 tentativas). Não há backoff exponencial.
- ❌ Reconexão falha NÃO atualiza `onStateChange` com 'FAILED' — fica em polling infinito

**server.js (wss)**:
- ❌ WebSocket server aceita conexões mas NÃO tem heartbeat/ping.
- ❌ Clientes conectados podem ficar "zumbis" — o array `clients` não limpa conexões mortas (só no `close`).
- ✅ `broadcast()` verifica `readyState === 1` antes de enviar.

### O que acontece se o banco SQLite está corrompido?

**db.js**:
- ❌ `new sqlite3.Database()` no constructor não tem retry.
- ❌ Se o banco corrompe, todas as queries subsequentes lançam exceções que propagam como Promise rejections não tratadas.
- ❌ `init()` roda no constructor e falhas de `CREATE TABLE` são **ignoradas** (callback-style sem await).
- ❌ Os 30+ métodos que usam `new Promise((resolve, reject) => { ... })` propagam o erro para quem chamou — mas em `server.js`, chamadas como `db.insertExperimentTrade(...).catch(() => {})` **engolem o erro**.
- ❌ WAL mode é ativado, mas `wal_checkpoint` nunca é chamado em shutdown.
- ❌ Backup(`backup_restore.py`) roda via `exec()` — se o Python não está instalado, o erro é apenas logado.

### O que acontece se a Exchange API retorna erro?

**exchangeExecution.js**:
- ✅ Se API keys estão ausentes, retorna mock `FILLED_MOCK` (graceful degradation)
- ❌ **Sem retry**: se o fetch falha ou a exchange rejeita, a exceção propaga para o caller
- ❌ **Sem circuit breaker**: chamadas repetidas à exchange falham infinitamente
- ❌ No `streamEngine.js:471`, `placeOrder` é chamado com `.catch(e => console.error(...))` — erro é engolido
- ❌ No `streamEngine.js:686-696`, close order tem `.catch()` que apenas loga

### O que acontece se processCandle() falha no meio?

**streamEngine.js:483-915** — este é o método mais crítico do sistema.

1. **V1-V4 reconstruction** (linhas 487-490): se qualquer `.reconstruct()` lança, **toda a execução morre** — sem try/catch
2. **SMC Facade evaluation** (linha 493): sem proteção
3. **CSRL Phase** (linhas 514-526): ✅ `calculateDivergence` tem try/catch
4. **Dual Reality Divergence** (linha 544): `await this.dualMonitor.calculateDivergence()` — **sem try/catch**, se o DB query falha o LHDS não é calculado, mas também não quebra
5. **TruthKernel.evaluate** (linha 548): sem proteção
6. **Court evaluation** (linha 552-553): sem proteção
7. **Atualização de posição ativa** (linha 599-701): sem try/catch — se `computeTradeEV` ou `sendTelegramAlert` lançam, o estado `this.activePosition` pode ficar inconsistente
8. **Cálculo de ATR** (linha 738): se `candleList` tem elementos inválidos, `high - low` com `undefined` → NaN → propaga
9. **Criação de nova posição** (linha 763-795): sem proteção

---

## 3. Silent Failures

| Localização | Descrição | Impacto |
|------------|-----------|---------|
| `packages/lyzer-shared/src/research/governance/decisionLedger.js:51` | `catch(e) {}` vazio no `flushBatch` | Perda silenciosa de decisões de governança |
| `packages/lyzer-shared/src/research/governance/investmentCommitteeEngine.js:10` | `try { fs.mkdirSync(...) } catch(e) {}` | Diretório ausente → várias operações de escrita falham |
| `packages/lyzer-shared/src/research/risk/correlationRiskEngine.js:14` | Idem | Dados de correlação não persistidos |
| `packages/lyzer-shared/src/research/observability/observabilityLayer.js:23` | Idem | Health checks não registrados |
| `packages/lyzer-shared/src/research/lineage/dataLineageEngine.js:18` | Idem | Data lineage perdido |
| `packages/lyzer-shared/src/research/fund/fundAccountingEngine.js:13` | Idem | Relatórios financeiros não salvos |
| `packages/lyzer-shared/src/research/validation/independentValidationEngine.js:17` | Idem | Validações não registradas |
| `packages/lyzer-shared/src/research/memory/institutionalMemoryEngine.js:15` | Idem | Memória institucional perdida |
| `packages/lyzer-shared/src/research/reporting/institutionalReportingEngine.js:10` | Idem | Relatórios não gerados |
| `packages/lyzer-shared/src/research/ai/investmentCommitteeAI.js:14` | Idem | Decisões de IA não registradas |
| `packages/lyzer-shared/src/research/fund/shadowFundEngine.js:18` | Idem | Shadow fund tracking perdido |
| `lyzer edge/backend/server.js:94-98` | `try { await db.insertExperimentTrade(...) } catch (e) { /* vazio */ }` | Trades não persistidos no experimento ativo |
| `lyzer edge/backend/server.js:440` | `db.insertExperimentTrade(...).catch(() => {})` | Trade não salvo, erro ignorado |
| `lyzer edge/backend/server.js:443-445` | `catch (e) { /* Ignore background sync errors */ }` | Engole TODOS os erros de sincronização |
| `lyzer edge/backend/streamEngine.js:471` | `.catch(e => console.error(...))` — sem retry ou notificação | Ordem de fechamento falha sem alerta |
| `lyzer edge/backend/streamEngine.js:696` | Idem | Mesmo problema |
| `packages/lyzer-constitution/src/eca/vault.js:14,53` | `catch (e) { // Fallback silently }` | Irreversibility Vault falha em ambientes sem fs |

### Padrão Recorrente

11 arquivos no `packages/lyzer-shared/src/research/*/` usam o mesmo anti-pattern:
```js
try { fs.mkdirSync(this.someDir, { recursive: true }); } catch(e) {}
```
Isso significa que **nenhum desses engines escreve em disco se o diretório não for criável** — e ninguém sabe.

---

## 4. Unhandled Rejections

### Sem `.catch()` — Promessas soltas

| Localização | Promessa | Risco |
|------------|----------|-------|
| `streamEngine.js:544` | `this.dualMonitor.calculateDivergence()` — await sem try | Se o DB falha, a Promise rejection propaga para o `setInterval` → **mata o loop de simulação** |
| `streamEngine.js:816` | `this.ecoEngine.step(this.candles, baseSignal)` — método async sem try | Se `extinctionEngine` falha, o erro não é capturado |
| `server.js:274` | `db.insertExperimentTrade(...).catch(() => {})` — catch vazio | Rejeição é engolida, mas trade não é persistido |
| `server.js:529-530` | `sendTelegramAlert(...).catch(...)` | ✅ OK (tem catch) |

### Nenhum handler global

- ❌ **`process.on('unhandledRejection')`** — NÃO implementado em `server.js` ou qualquer entrypoint
- ❌ **`process.on('uncaughtException')`** — NÃO implementado. Se qualquer exceção escapa, o processo Node.js morre.
- ⚠️ `SIGINT`/`SIGTERM` handlers fazem backup mas não tratam `uncaughtException`.

### Consequência

Qualquer Promise que rejeita sem `.catch()` causa:
```
node:internal/process/promises:289
            triggerUnhandledRejection(err, false);
            ^
UnhandledPromiseRejectionWarning
```
Em Node.js moderno, isso derruba o processo inteiro.

---

## 5. Resilience Recommendations

### 🔴 CRITICAL (deve ser implementado IMEDIATAMENTE)

1. **Adicionar `process.on('unhandledRejection')` e `process.on('uncaughtException')` em `server.js`**
   - Logar o erro, tentar backup, não derrubar o processo
   ```js
   process.on('uncaughtException', (err) => {
     console.error('[FATAL] Uncaught Exception:', err);
     runBackup();
   });
   process.on('unhandledRejection', (reason) => {
     console.error('[FATAL] Unhandled Rejection:', reason);
   });
   ```

2. **Proteger o `setInterval` da simulação em `streamEngine.js` com try/catch no callback**
   - Se processCandle lança, o intervalo inteiro morre. Envolver o callback:
   ```js
   this.simInterval = setInterval(() => {
     try {
       // ... tudo ...
     } catch (e) {
       console.error('[STREAM] Simulation loop error:', e);
     }
   }, 500);
   ```

3. **Wrapping de `processCandle` completo em try/catch no `streamEngine.js`**
   - Atualmente só protegido quando chamado via WebSocket callback (linha 219). Proteger também:
     - Chamada no `startSimulationLoop` (linha 181)
     - Chamada no `startFallbackLoop` (linha 381)
   - Adicionar notificação Telegram + métrica de erro

### 🟡 HIGH

4. **Circuit breaker para Exchange API calls em `exchangeExecution.js`**
   - Após N falhas consecutivas, parar de chamar a exchange por X segundos
   - Prevenir banimento da API por rate limit excessivo

5. **Adicionar retry com backoff nas queries de DB críticas**
   - `insertCausalEvent`, `insertExperimentTrade`, `getActiveExperiment`
   - Usar `busy_timeout` + retry para conflitos WAL

6. **Remover os 11 empty catches e substituir por logging adequado**
   - `packages/lyzer-shared/src/research/*/` — pelo menos `console.warn`
   - Verificar se o diretório existe antes de criar, não apenas engolir o erro

7. **Adicionar mecanismo de health check no WebSocket do servidor**
   - Ping/pong a cada 30s para detectar clientes zumbis

### 🟢 MEDIUM

8. **Melhorar logging de erros com contexto**
   - `console.error('[STREAM] processCandle failed:', e)` não inclui qual candle, qual símbolo, qual estado
   - Adicionar `this.symbol`, `index`, `connectionState` nas mensagens de erro

9. **Adicionar contadores de erro no sistema de observabilidade**
   - `recordTickDuration` existe mas só para SUCCESS — adicionar contagem de FAILURE
   - Criar métrica de erros por fase (CSRL, Kernel, Court, Execution)

10. **Implementar estado DEGRADED explícito para DB**
    - Se o SQLite falha em N queries consecutivas, o sistema deve entrar em modo degradado (sem persistência, apenas trading in-memory)

### 📋 Summary — Top 5 Priority

| # | Ação | Severidade | Esforço |
|---|------|-----------|---------|
| 1 | Global unhandledRejection/uncaughtException handlers | 🔴 Crítica | 10 min |
| 2 | try/catch no setInterval de simulação | 🔴 Crítica | 5 min |
| 3 | processCandle protegido em TODOS os call paths | 🔴 Crítica | 15 min |
| 4 | Circuit breaker para Exchange API | 🟡 Alta | 1 dia |
| 5 | Substituir empty catches por logging | 🟡 Alta | 30 min |
