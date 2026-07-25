# Definição de SLOs/SLIs & Production Readiness Checklist — Lyzer Edge

- **Status**: Aprovado pelo Comitê SRE & Production Reliability
- **Data**: 2026-07-22
- **Autor**: Production Reliability Engineer (`@[lyzer-guardian]`)

---

## 🎯 Objetivos de Nível de Serviço (SLOs Institucionais)

| Dimensão | Indicador (SLI) | Meta de SLO | Janela de Medição | Impacto se Violado |
|---|---|---|---|---|
| **Latência P50** | `lyzer_pipeline_tick_processing_duration_seconds` | $< 1.0\text{ ms}$ | Rolante (24h) | Baixa eficiência operacional |
| **Latência P95** | `lyzer_pipeline_tick_processing_duration_seconds` | $< 2.5\text{ ms}$ | Rolante (24h) | Alerta preventivo SRE |
| **Latência P99** | `lyzer_pipeline_tick_processing_duration_seconds` | $< 5.0\text{ ms}$ | Rolante (24h) | Investigação de cauda e GC |
| **Latência P99.9** | `lyzer_pipeline_tick_processing_duration_seconds` | $< 15.0\text{ ms}$ | Rolante (7 dias) | Escalação imediata P0 |
| **Vazão (Throughput)** | `lyzer_pipeline_ticks_received_total` | $> 500\text{ ticks/sec}$ | Contínua | Alerta de engargalamento de socket |
| **Taxa de Erro** | `lyzer_system_errors_total` / Total Ticks | $< 0.01\%$ ($99.99\%$ sucesso) | Rolante (30 dias) | Desconexão imediata de Live Trading |
| **Disponibilidade** | Uptime sem indisponibilidade não planejada | **99.95% Availability** | Mensal | Violação de SLA Institucional |

---

## 📋 LYZER EDGE PRODUCTION READINESS CHECKLIST

Antes de autorizar a execução financeira em modo `LIVE` com capital real, a plataforma deve cumprir integralmente o seguinte checklist:

### 1. 🏛️ Arquitetura (Architecture)
- [x] **Topologia de 3 Processos Isolados**: Node de Execução (Rust), ECA Court Node (Rust/JS), Dashboard Node (Vite/Node).
- [x] **Axioma "The Court shall never learn"**: Zero parâmetros de entrada estocásticos na Corte.
- [x] **Isolamento por Ativo**: Instanciamento escopado de `truthKernel` e `court` por ativo (`StreamEngine`).

### 2. 🔐 Segurança (Security)
- [x] **Proteção de Endpoints REST**: Autenticação administrativa com `authenticateAdmin` e `ADMIN_API_KEY`.
- [x] **Trava de Operação Live**: Variável `LIVE_TRADING_ENABLED=true` e `MAX_DAILY_CAPITAL > 0` validadas estritamente.
- [ ] **Rota `/metrics` Protegida**: Exigir cabeçalho `Authorization: Bearer <ADMIN_API_KEY>` na raspagem Prometheus.

### 3. 📊 Observabilidade (Observability)
- [ ] **Exportação de Métricas Prometheus**: Rota `/metrics` ativa via `prom-client`.
- [ ] **Distributed Tracing**: Rastreabilidade causal preservada com UUIDv7 em todas as mensagens IPC.
- [ ] **Alertas de Cauda P99**: Configuração de regras de alerta Prometheus em `P99 > 5ms`.

### 4. 🚒 Resiliência & Recuperação (Disaster Recovery)
- [x] **Telegram Retry Queue**: Retentativa assíncrona com exponential backoff em `sendTelegramAlertWithRetry`.
- [x] **FallBack Loop Safe Guard**: Flag `isFallbackActive` impedindo corridas entre WebSocket e simulação.
- [ ] **WAL Mode no SQLite**: `PRAGMA journal_mode = WAL;` para suportar concorrência de escritas HFT.

### 5. ⚡ Performance & Recursos (Performance)
- [x] **Capping de RAM**: Limite de 1.000 candles max no buffer $1m$ (-66.7% uso de RAM).
- [x] **Payload Cap**: Limite estrito de 300 zonas SMC e 50 pares de liquidez.

### 6. 🧪 Testabilidade & Qualidade (Testing)
- [x] **Suíte Vitest Green**: 100% de testes automatizados aprovados (164 testes em 9 arquivos).
- [x] **Verificação de Scripts**: Testes de integridade em `tests/verification/`.

### 7. 🚀 Deploy & Operações (Deployment & Rollback Strategy)
- [x] **Docker Multi-Stage Build**: Imagem 2-stage baseada em `ubuntu:24.04`.
- [ ] **Rollback Strategy**: Script de reversão instantânea para a versão `v1.4.0` validado.
