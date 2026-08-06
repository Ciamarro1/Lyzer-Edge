# Análise de Gaps de Observabilidade — Lyzer Edge
**Data:** 2026-08-06  
**Autor:** Observability Engineer  
**Tipo:** Research Only — Gap Analysis  
**Projeto:** Lyzer Edge (`C:\Users\WDAGUtilityAccount\Downloads\Nova pasta`)

---

## 1. Resumo Executivo

O Lyzer Edge possui uma **camada de observabilidade definida em documentação** (architecture.md, metrics_catalog.md, runbook.md, slo_definition.md) que descreve um ecossistema completo de métricas Prometheus, tracing distribuído OpenTelemetry, logs estruturados JSON com Pino, dashboards Grafana e alertas automáticas. **Na prática, o código implementa apenas ~30% do que está documentado**, com lacunas críticas que impedem qualquer operação SRE real.

**Veredito:** A observabilidade é **100% funcional apenas no papel**. O que existe é uma fachada de métricas (`prom-client`) com métricas parcialmente instrumentadas, sem alertas, sem dashboards, sem tracing, sem logs estruturados e sem endpoints de saúde.

---

## 2. Comparação Docs vs Código

### 2.1 Matriz de Promessas vs Realidade

| Componente | O que os Docs Prometem | O que o Código Tem | Status |
|---|---|---|---|
| **`/metrics` endpoint** | Rota protegida com `prom-client`, autenticação Bearer | Existe em `server.js:82-90`, protegida por `authenticateAdmin` | ✅ Parcial — funcional |
| **Métricas de runtime** | `lyzer_runtime_*` (event loop lag, heap, GC, CPU) | Apenas `collectDefaultMetrics` do `prom-client` com prefixo `lyzer_runtime_` | ⚠️ Parcial — métricas padrão do Node existem, mas custom gauges (CPU, event loop lag) NÃO existem |
| **Métricas de pipeline** | `lyzer_pipeline_ticks_received_total`, `tick_processing_duration_seconds`, `csrl_processing_duration_seconds`, `cclist_evaluation_duration_seconds` | 4 métricas definidas em `metricsRegistry.js` e instrumentadas parcialmente em `streamEngine.js` | ⚠️ Parcial — `recordTickDuration` só grava com status `SUCCESS`, nunca `FAIL` |
| **Métricas constitucionais** | `lyzer_constitution_evaluations_total`, `lyzer_constitution_veto_total`, `risk_gateway_latency_seconds` | 3 métricas definidas; `ecaEvaluationsCounter` e `constitutionalVetoCounter` são chamados; `riskGatewayLatencyHistogram` NUNCA é usado | ❌ Gap — gRPC latency nunca medida |
| **Métricas de persistência** | `lyzer_persistence_sqlite_write_duration_seconds`, `sqlite_lock_wait_seconds` | `sqliteWriteDurationHistogram` chamado em `db.js` (2 locais); `sqliteLockWaitHistogram` NUNCA é usado | ⚠️ Parcial |
| **Métricas de sistema** | `lyzer_system_errors_total`, `lyzer_system_active_connections` | Ambas definidas em `metricsRegistry.js` mas **NUNCA incrementadas/setadas** em nenhum lugar do código | ❌ Gap crítico |
| **OpenTelemetry** | OTel SDK + propagação de contexto com UUIDv7 | Zero imports de OTel no código | ❌ Gap crítico |
| **Structured JSON Logging (Pino)** | Logs JSON estruturados com campos obrigatórios (timestamp, level, service, symbol, intent_id, etc.) | `console.log` / `console.error` / `console.warn` — 23 ocorrências em `streamEngine.js` apenas | ❌ Gap crítico |
| **Distributed Tracing** | Rastreabilidade causal com UUIDv7 em todas as mensagens IPC | Zero implementação de tracing | ❌ Gap crítico |
| **Health Endpoints** | `/healthz`, `/readyz` para Kubernetes liveness/readiness probes | NÃO existem em `server.js` | ❌ Gap crítico |
| **WebSocket Heartbeat** | Ping-pong periódico para detectar conexões mortas | Nenhuma implementação de heartbeat no `wss` | ❌ Gap crítico |
| **Prometheus Alert Rules** | Regras para `LyzerPipelineHighLatencyP99`, `LyzerConstitutionalVetoSpike`, `TELEGRAM_RETRY_EXHAUSTED` | **0 arquivos** de alert rules no repo | ❌ Gap crítico |
| **Grafana Dashboards** | Dashboards para métricas de runtime, pipeline, constitucional, persistência | **0 dashboards** no repo (apenas `dashboard_metric_contracts.json` que define contratos, não dashboards) | ❌ Gap crítico |
| **Alertas Automáticos** | Alertas automáticos via AlertManager → Telegram/Slack | Nenhuma integração de alerting baseada em métricas | ❌ Gap crítico |
| **Correlação Logs↔Traces** | Trace IDs em logs para rastreabilidade end-to-end | Nem logs estruturados existem, muito menos correlação | ❌ Gap crítico |
| **Business Metrics** | Trades/hora, PnL/dia, win rate em tempo real | Nenhuma métrica de negócio instrumentada | ❌ Gap crítico |
| **Métricas de Erro por Componente** | `system_errors_total` com labels `component` e `error_type` | Métrica definida mas **nunca incrementada** | ❌ Gap crítico |

### 2.2 Detalhamento do que EXISTE vs o que é PROMETIDO

#### O que EXISTE (implementado de verdade):
1. **`/metrics` endpoint** — Funcional, protegido por `authenticateAdmin`, retorna métricas do `prom-client`
2. **`prom-client` instalado** — Versão 15.1.3 no `package.json`
3. **11 métricas definidas** em `metricsRegistry.js` (Counter, Histogram, Gauge)
4. **5 funções de instrumentação** chamadas no código:
   - `recordTickReceived` — chamado em `updateMtfCandles` (streamEngine.js:241)
   - `recordTickDuration` — chamado SOMENTE com status `'SUCCESS'` (streamEngine.js:961)
   - `recordCsrlDuration` — chamado no bloco CSRL (streamEngine.js:536)
   - `recordCclistEvaluation` — chamado no bloco CCLIST (streamEngine.js:561)
   - `recordEcaEvaluation` — chamado quando a Corte decide (streamEngine.js:778)
   - `recordSqliteWrite` — chamado em `db.js` (2 locais)
5. **`register` exportado** e usado em `server.js` para expor `/metrics`

#### O que NÃO EXISTE (documentado mas não implementado):
1. **`recordTickDuration` com status `FAIL`/`ERROR`** — Quando `processCandle` lança exceção (linha 229), o erro é apenas logado com `console.error` e nenhuma métrica de falha é gravada
2. **`recordSystemError`** — Definida mas nunca chamada em nenhum lugar
3. **`setActiveConnections`** — Definida mas nunca chamada
4. **`riskGatewayLatencyHistogram`** — Definida mas nunca usada em `riskGatewayClient.js` (o gRPC call é feito sem medição de latência)
5. **`sqliteLockWaitHistogram`** — Definida mas nunca usada em `db.js`
6. **`activeConnectionsGauge`** — Nunca setado
7. **`systemErrorsCounter`** — Nunca incrementado
8. **OpenTelemetry SDK** — Zero implementação
9. **Pino / structured logging** — Zero implementação
10. **`/healthz` endpoint** — Não existe
11. **`/readyz` endpoint** — Não existe
12. **WebSocket heartbeat** — Não existe
13. **Prometheus alert rules** — 0 arquivos
14. **Grafana dashboards** — 0 dashboards
15. **Alertmanager config** — Não existe
16. **Business metrics** — Nenhuma métrica de negócio

---

## 3. Matriz de Gaps de Observabilidade

| # | Gap | Severidade | Impacto Operacional | Evidência |
|---|---|---|---|---|
| **G1** | **Métricas de erro nunca incrementadas** (`systemErrorsCounter` nunca chamado) | 🔴 **CRÍTICA** | Impossível detectar falhas de componente automaticamente. O runbook cita `LyzerPipelineHighLatencyP99` mas não há como saber se erros estão ocorrendo sem métricas. | `recordSystemError` importada mas nunca invocada em `streamEngine.js`, `server.js`, `db.js`, ou `riskGatewayClient.js` |
| **G2** | **Histograma de latência só grava SUCCESS** (`recordTickDuration` nunca chamado com FAIL) | 🔴 **CRÍTICA** | O P99 de latência é calculado apenas para ticks bem-sucedidos. Ticks que falham (erros de processamento, gRPC failures, veto da Corte) não são medidos, distorcendo os percentis para baixo. | `streamEngine.js:961` — único call de `recordTickDuration` usa `'SUCCESS'`. O catch em `processCandle` (linha 229) só faz `console.error` |
| **G3** | **gRPC Risk Gateway latency nunca medida** (`riskGatewayLatencyHistogram` nunca usado) | 🔴 **CRÍTICA** | O runbook SRE cita `lyzer_constitution_risk_gateway_latency_seconds` como métrica de diagnóstico para Incidente 2, mas ela nunca é coletada. O `authorizeOrder` em `riskGatewayClient.js` não mede tempo de resposta. | `riskGatewayClient.js` não importa nem chama `riskGatewayLatencyHistogram` |
| **G4** | **SQLite lock wait nunca medida** (`sqliteLockWaitHistogram` nunca usado) | 🟠 **ALTA** | O runbook cita `lyzer_persistence_sqlite_lock_wait_seconds` para diagnóstico de Incidente 1 (latência de pipeline), mas a métrica não é coletada. | `sqliteLockWaitHistogram` definida em `metricsRegistry.js` mas nunca observada em `db.js` |
| **G5** | **Active connections nunca trackada** (`activeConnectionsGauge` nunca setada) | 🟠 **ALTA** | Impossível monitorar conexões WebSocket ativas ou conexões gRPC. O SLO definition exige `lyzer_system_active_connections` como métrica de saúde. | `setActiveConnections` nunca chamada em `server.js` (WS) nem em `riskGatewayClient.js` (gRPC) |
| **G6** | **OpenTelemetry inexistente** (docs prometem OTel SDK + propagação UUIDv7) | 🔴 **CRÍTICA** | Zero rastreabilidade causal entre os 7 estágios do pipeline (Observation → Reality → Court → Risk → Execution). Impossível correlacionar logs com traces ou diagnosticar onde um tick falha na cadeia. | Zero imports de `@opentelemetry/*` em todo o codebase |
| **G7** | **Structured JSON logging inexistente** (docs prometem Pino + JSON) | 🔴 **CRÍTICA** | Logs são `console.log`/`console.error`/`console.warn` — texto plano, sem estrutura, sem campos parseáveis. Impossível ingestão em Loki/FluentBit/Datadog. Zero campos obrigatórios (timestamp ISO, level, service, symbol, intent_id). | 23 chamadas `console.*` em `streamEngine.js` apenas; zero uso de `pino` no `package.json` |
| **G8** | **Distributed tracing inexistente** (docs prometem tracing distribuído) | 🔴 **CRÍTICA** | Sem spans, sem context propagation, sem trace IDs. Impossível seguir um tick do WebSocket até a execução na Binance. | Nenhuma implementação de tracing em nenhum arquivo |
| **G9** | **`/healthz` e `/readyz` endpoints não existem** | 🔴 **CRÍTICA** | Sem liveness/readiness probes para Kubernetes. O deployment não pode detectar se o pod está vivo ou pronto para receber tráfego. | `server.js` não tem rotas `/healthz` ou `/readyz` |
| **G10** | **WebSocket heartbeat/ping-pong inexistente** | 🟠 **ALTA** | Conexões WebSocket podem morrer silenciosamente (half-open) sem detecção. O `wss.on('connection')` não implementa nenhum mecanismo de keepalive. | `server.js` — `wss` criado sem `ping`/`pong` intervals |
| **G11** | **0 Prometheus alert rules** (runbook cita `LyzerPipelineHighLatencyP99`, `LyzerConstitutionalVetoSpike`, `TELEGRAM_RETRY_EXHAUSTED`) | 🔴 **CRÍTICA** | Alertas citados no runbook SRE simplesmente não existem. Zero automação de detecção de incidentes. | Nenhum arquivo `.yml` de alert rules no repo |
| **G12** | **0 Grafana dashboards** | 🔴 **CRÍTICA** | Sem visualização das métricas existentes. Operadores não têm dashboard para monitorar pipeline, constitucional, persistência ou runtime. | Nenhum arquivo `.json` de dashboard Grafana no repo |
| **G13** | **0 alertas automáticos baseados em métricas** | 🔴 **CRÍTICA** | Sem integração Prometheus → AlertManager → Telegram/Slack/Email. Toda detecção de incidente é manual (operador lendo logs). | Nenhuma configuração de alerting no repo |
| **G14** | **Falta de métricas de negócio** (trades/hora, PnL/dia, win rate em tempo real) | 🟠 **ALTA** | Métricas de runtime/pipeline existem (parcialmente), mas não há métricas de resultado de negócio. Impossível responder "quantos trades por hora?" ou "qual o win rate atual?" | Nenhuma métrica de `trades_total`, `trades_per_hour`, `win_rate`, `daily_pnl` no `metricsRegistry.js` |
| **G15** | **Falta de correlação logs↔traces** | 🟠 **ALTA** | Sem logs estruturados e sem tracing, é impossível correlacionar eventos entre serviços (Node.js ↔ Rust ↔ WebSocket ↔ Binance). | Nem logs estruturados existem, muito menos trace IDs |
| **G16** | **`recordTickDuration` nunca grava FAIL para erros de processamento** | 🔴 **CRÍTICA** | Quando `processCandle` falha (erro no CSRL, CCLIST, ou qualquer outra exceção), o tick é simplesmente perdido sem registro de falha. O runbook SRE não tem como detectar taxa de erros de processamento. | `streamEngine.js:229` — catch apenas loga `console.error`, sem `recordTickDuration(symbol, 'FAIL', ...)` |
| **G17** | **`recordSystemError` nunca chamada em nenhum ponto de falha** | 🔴 **CRÍTICA** | Erros de gRPC fallback (`riskGatewayClient.js`), erros de DB, erros de WebSocket, erros de Telegram — nenhum incrementa o counter de erros do sistema. | `recordSystemError` importada em `observability/index.js` mas nunca chamada em nenhum arquivo |
| **G18** | **`riskGatewayClient.js` não mede latência gRPC** | 🟠 **ALTA** | O `authorizeOrder` faz chamada gRPC sem medir duração. Se o Risk Gateway estiver lento, não há métrica para detectar. | `riskGatewayLatencyHistogram` nunca usado em `riskGatewayClient.js` |
| **G19** | **SRE report (observability-report.md) é enganoso** | 🟠 **ALTA** | O relatório do SRE Engineer afirma "Structured JSON logs with UUIDv7 tracing" e "4-Tier Explainability Engine" — nenhum dos dois existe no código. O relatório é um resumo de 3 linhas que descreve o que está documentado, não o que está implementado. | `engineering-audit/observability-report.md` — 3 linhas, zero evidência de código |
| **G20** | **`LIVE_TRADING_ENABLED=true` default no Dockerfile** (bomba de deploy) | 🔴 **CRÍTICA** | Se `ARL_MODE` for trocado para `LIVE`, o sistema opera com capital real sem auth e sem observabilidade mínima para detectar anomalias. | `Dockerfile:66` — `ENV LIVE_TRADING_ENABLED=true` |

---

## 4. Classificação de Severidade

### 🔴 CRÍTICA (P0 — Bloqueia operação SRE)
| Gap | Razão |
|---|---|
| G1 — systemErrorsCounter nunca chamado | Impossível detectar falhas de componente |
| G2 — Latência só grava SUCCESS | Percentis distorcidos, falsos negativos em latência |
| G3 — gRPC latency nunca medida | Runbook cita métrica que não existe |
| G6 — OpenTelemetry inexistente | Zero rastreabilidade causal |
| G7 — Structured logging inexistente | Zero ingestão automatizada de logs |
| G8 — Distributed tracing inexistente | Zero correlação end-to-end |
| G9 — /healthz e /readyz inexistentes | Sem probes Kubernetes |
| G11 — 0 alert rules | Zero detecção automática de incidentes |
| G12 — 0 Grafana dashboards | Zero visibilidade operacional |
| G13 — 0 alertas automáticos | Toda detecção é manual |
| G16 — TickDuration nunca grava FAIL | Erros de processamento invisíveis |
| G17 — recordSystemError nunca chamada | Falhas silenciosas em toda a stack |
| G20 — LIVE_TRADING_ENABLED=true default | Bomba de deploy sem observabilidade |

### 🟠 ALTA (P1 — Degrada operação significativamente)
| Gap | Razão |
|---|---|
| G4 — SQLite lock wait nunca medida | Runbook cita métrica que não existe |
| G5 — Active connections nunca trackada | Sem monitoramento de conexões |
| G10 — WebSocket heartbeat inexistente | Conexões mortas não detectadas |
| G14 — Sem métricas de negócio | Impossível responder perguntas operacionais básicas |
| G15 — Sem correlação logs↔traces | Diagnóstico de incidentes muito mais lento |
| G18 — gRPC latency não medida no client | Gargalo de latência invisível |
| G19 — SRE report enganoso | Documentação não reflete realidade |

---

## 5. Plano de Observabilidade Mínima (Métricas Essenciais)

### Fase 1 — Observabilidade de Sobrevivência (Semanas 1-2)

| Prioridade | Métrica | Tipo | Labels | Onde Instrumentar | Status Atual |
|---|---|---|---|---|---|
| **P0** | `lyzer_system_errors_total` | Counter | `component`, `error_type` | `catch` blocks em `streamEngine.js`, `riskGatewayClient.js`, `db.js`, `server.js` | ❌ Definida mas nunca chamada |
| **P0** | `lyzer_pipeline_tick_processing_duration_seconds` (FAIL) | Histogram | `symbol`, `status` | `catch` de `processCandle` (streamEngine.js:229) | ❌ Só SUCCESS |
| **P0** | `lyzer_system_active_connections` | Gauge | `protocol` | `wss.on('connection')` e `wss.on('close')` em `server.js` | ❌ Definida mas nunca setada |
| **P0** | `lyzer_constitution_risk_gateway_latency_seconds` | Histogram | `service`, `status` | Dentro de `authorizeOrder` em `riskGatewayClient.js` | ❌ Definida mas nunca usada |
| **P0** | `lyzer_persistence_sqlite_lock_wait_seconds` | Histogram | `db_name` | Ao redor de `db.run()` em `db.js` | ❌ Definida mas nunca usada |
| **P0** | `/healthz` endpoint | — | — | `server.js` | ❌ Não existe |
| **P0** | `/readyz` endpoint | — | — | `server.js` | ❌ Não existe |
| **P0** | WebSocket heartbeat (ping/pong) | — | — | `server.js` — `wss` config | ❌ Não existe |

### Fase 2 — Observabilidade de Diagnóstico (Semanas 3-4)

| Prioridade | Métrica | Tipo | Labels | Onde Instrumentar |
|---|---|---|---|---|
| **P1** | `lyzer_pipeline_tick_processing_duration_seconds` (FAIL) com error_type label | Histogram | `symbol`, `status`, `error_type` | `catch` de `processCandle` |
| **P1** | `lyzer_runtime_event_loop_lag_seconds` | Gauge | `service` | `setInterval` que mede lag do event loop |
| **P1** | `lyzer_runtime_heap_usage_bytes` | Gauge | `type` | `process.memoryUsage().heapUsed` |
| **P1** | `lyzer_pipeline_ticks_dropped_total` | Counter | `symbol`, `reason` | Quando tick é descartado (buffer cheio, conexão perdida) |
| **P1** | Structured JSON logging (Pino) | — | — | Substituir todos os `console.*` por `pino` com fields: `timestamp`, `level`, `service`, `symbol`, `trace_id` |

### Fase 3 — Observabilidade de Negócio (Semanas 5-6)

| Prioridade | Métrica | Tipo | Labels | Descrição |
|---|---|---|---|---|
| **P2** | `lyzer_business_trades_total` | Counter | `symbol`, `decision` (`ALLOW`/`REJECT`) | Total de trades processados pela Corte |
| **P2** | `lyzer_business_trades_per_hour` | Gauge | `symbol` | Trades nas últimas 1h (janela deslizante) |
| **P2** | `lyzer_business_win_rate` | Gauge | `symbol` | Win rate em janela de 24h |
| **P2** | `lyzer_business_daily_pnl` | Gauge | `symbol` | PnL acumulado do dia |
| **P2** | `lyzer_business_drawdown` | Gauge | `symbol` | Drawdown atual da posição |
| **P2** | `lyzer_business_sharpe_ratio` | Gauge | `symbol` | Sharpe ratio em janela de 7 dias |

### Fase 4 — Infraestrutura de Observabilidade (Semanas 7-8)

| Item | Descrição |
|---|---|
| **Prometheus alert rules** | Criar `prometheus/alert_rules.yml` com regras para: `LyzerPipelineHighLatencyP99`, `LyzerConstitutionalVetoSpike`, `LyzerSystemErrorRateHigh`, `LyzerWebSocketConnectionDown` |
| **AlertManager config** | Criar `alertmanager.yml` com rotas para Telegram (já existe `telegram.js`) e email |
| **Grafana dashboards** | Criar dashboards JSON para: Runtime, Pipeline, Constitutional, Persistence, Business |
| **OTel SDK** | Implementar `@opentelemetry/sdk-node` com propagação de contexto UUIDv7 |
| **Pino structured logging** | Substituir `console.*` por `pino` com transporte para Loki/FluentBit |
| **Correlação logs↔traces** | Adicionar `trace_id` e `span_id` a todos os logs estruturados |

---

## 6. Plano de Ação Imediata (Próximas 48h)

### Ação 1: Instrumentar `recordSystemError` em todos os catch blocks
**Arquivos:** `streamEngine.js`, `riskGatewayClient.js`, `db.js`, `server.js`  
**Esforço:** 2h  
**Impacto:** Permite detectar falhas de componente automaticamente

### Ação 2: Gravar `recordTickDuration` com status `FAIL` no catch de `processCandle`
**Arquivo:** `streamEngine.js` (linha 229)  
**Esforço:** 30min  
**Impacto:** Percentis de latência realistas, detecção de degradação

### Ação 3: Medir latência gRPC em `riskGatewayClient.js`
**Arquivo:** `riskGatewayClient.js` — envolver `client.Authorize()` com `performance.now()`  
**Esforço:** 1h  
**Impacto:** Métrica de latência do Risk Gateway funcional

### Ação 4: Criar `/healthz` e `/readyz` endpoints
**Arquivo:** `server.js`  
**Esforço:** 1h  
**Impacto:** Kubernetes liveness/readiness probes funcionais

### Ação 5: Implementar WebSocket heartbeat
**Arquivo:** `server.js` — adicionar `setInterval` com `ws.ping()`  
**Esforço:** 1h  
**Impacto:** Detecção de conexões WebSocket mortas

### Ação 6: Criar `prometheus/alert_rules.yml`
**Esforço:** 2h  
**Impacto:** Alertas automáticos para latência P99 e veto spike

---

## 7. Conclusão

A observabilidade do Lyzer Edge segue o padrão **"documentação rica, implementação vazia"**. O `metricsRegistry.js` é um catálogo bem definido de 11 métricas, mas apenas ~6 são efetivamente instrumentadas no código, e nenhuma delas cobre cenários de falha. O runbook SRE cita métricas e alertas que simplesmente não existem. O relatório do SRE Engineer (`observability-report.md`) é um resumo de 3 linhas que descreve o estado documentado, não o estado implementado.

**A observabilidade mínima funcional exige:**
1. Instrumentar as métricas que já estão definidas mas nunca chamadas (`systemErrorsCounter`, `activeConnectionsGauge`, `riskGatewayLatencyHistogram`, `sqliteLockWaitHistogram`)
2. Gravar falhas no histograma de latência (`recordTickDuration` com status `FAIL`)
3. Criar endpoints de saúde (`/healthz`, `/readyz`)
4. Implementar WebSocket heartbeat
5. Criar alertas Prometheus para as regras citadas no runbook
6. Substituir `console.log` por logging estruturado (Pino)

Sem essas ações, o Lyzer Edge opera **às cegas** — sem como detectar degradação, sem como diagnosticar incidentes automaticamente, e sem como responder às perguntas básicas que um SRE precisa fazer.
