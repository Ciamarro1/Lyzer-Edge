---
proposito: "Histórico de versão e registros de atualização da Base de Conhecimento /knowledge"
data_criacao: "2026-07-22"
ultima_atualizacao: "2026-07-22"
origem_dados:
  - "knowledge/README.md"
nivel_confianca: "Alto"
pendencias_conhecidas: "Nenhuma"
---

# Histórico de Alterações da Base de Conhecimento (`/knowledge`)

## [v2.5.1] — 2026-07-22
- **Fase 5.3.1 (Causal Event Contract Review) Concluída**:
  - Aprovado o **ADR-007** em [ADR-007-causal-event-contract.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-007-causal-event-contract.md).
  - Elaborada a especificação técnica [causal_event_contract_spec.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/causal_event_contract_spec.md).
  - Estabelecida a anatomia auto-contida de 14 campos do evento causal, incluindo `epistemic_regime` e `hash_prev`.
  - Definidas as 9 categorias da taxonomia oficial de eventos e o payload enriquecido da Corte Constitucional (`CONSTITUTIONAL_JUDGMENT`).
  - Projetados o encadeamento criptográfico de hash (Hash Chain SHA-256) e a regra de compatibilidade do Schema Registry.

## [v2.5.0] — 2026-07-22
- **Fase 5.3 (Causal Memory Architecture Design) Concluída**:
  - Criado o **ADR-006** em [ADR-006-causal-memory-architecture.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-006-causal-memory-architecture.md).
  - Elaborada a especificação técnica [causal_memory_design.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/causal_memory_design.md).
  - Definidos os 4 domínios funcionais de memória (Operational, Episodic, Semantic, Constitutional Memory).
  - Projetados o esquema DDL de `causal_events_log` e o motor de viagem temporal `Rewind Market Reality`.

## [v2.4.0] — 2026-07-22
- **Fase 5.2 (SQLite Institutional Persistence Upgrade) Concluída**:
  - Habilitado o modo `PRAGMA journal_mode = WAL;` com ajuste fino de pragmas (`synchronous = NORMAL`, `busy_timeout = 5000`, `temp_store = MEMORY`, `cache_size = -64000`, `mmap_size = 30GB`, `wal_autocheckpoint = 1000`) em `db.js`.
  - Implementado o método de checkpoint `db.walCheckpoint(mode)`.
  - Criada a suíte de benchmark de persistência WAL em `benchmark_persistence_wal.test.js` e validados 100% dos 168 testes do sistema.
  - Documentada a camada de persistência em `docs/persistence/` (`architecture.md`, `wal_strategy.md`, `performance_comparison.md` e `disaster_recovery.md`).

## [v2.3.5] — 2026-07-22
- **Fase 5.1.5 (Observability Validation & Production Baseline) Concluída**:
  - Medido o baseline empírico: Throughput de **1,859.96 ticks/sec**, $P_{50} = 0.336\text{ ms}$, $P_{95} = 1.209\text{ ms}$, $P_{99} = 3.783\text{ ms}$.
  - Criado o documento [performance_baseline.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/observability/performance_baseline.md).
  - Estruturados os 3 runbooks executáveis de Engenharia do Caos sob `docs/chaos/experiments/` (`CE001-sqlite-latency.md`, `CE002-websocket-loss.md`, `CE003-tick-storm.md`).
  - Confirmado com dados empíricos que o gargalo de escrita de I/O em disco no SQLite autoriza a entrada na Fase 5.2.

## [v2.3.0] — 2026-07-22
- **Implementação da Camada de Observabilidade (Fase 5.1) & Chaos Engineering**:
  - Criado o núcleo isolado de observabilidade em `lyzer edge/src/observability/` (`metricsRegistry.js` e `index.js`).
  - Integrada a biblioteca `prom-client` e exposta a rota protegida `/metrics` em `server.js`.
  - Instrumentado o `StreamEngine.js` e `db.js` com captura de latência e contadores de ticks.
  - Criado o plano de resiliência [chaos_engineering_plan.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/observability/chaos_engineering_plan.md).
  - 100% dos testes validados com sucesso no Vitest (166 testes aprovados em 10 suítes).

## [v2.2.0] — 2026-07-22
- **Especificação da Arquitetura de Observabilidade & SRE Checklist**:
  - Criados os 4 documentos institucionais sob `docs/observability/`: `architecture.md`, `metrics_catalog.md`, `slo_definition.md` e `runbook.md`.
  - Formalizado o axioma da **Integridade Causal rastreável por UUIDv7** sobre a latência pura.
  - Criado o **Lyzer Edge Production Readiness Checklist** para transição segura ao ecossistema institucional.

## [v2.1.0] — 2026-07-22
- **Aprovação da ADR-005 pelo Comitê de Arquitetura**:
  - Realizado o mapeamento detalhado do caminho crítico completo (do WebSocket ao I/O em disco).
  - Aprovada a **Opção D (Evolução Progressiva Guiada por Observabilidade)**.
  - Criado o registro oficial [ADR-005-phase5-hft-evolution.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-005-phase5-hft-evolution.md).
  - Atualizado o índice de ADRs em `knowledge/development/architecture_decisions.md`.

## [v2.0.0] — 2026-07-22
- **Auditoria Técnica v2.0 Concluída**:
  - Publicado o relatório de auditoria pós-implementação em `docs/audit/post_implementation_audit_v2.md`.
  - Confirmada a conformidade de 100% dos subsistemas com os axiomas constitutivos ("The Court shall never learn", 3-process isolation, 7-layer quantitative pipeline).
  - Mapeadas novas oportunidades para a Fase 5 (SQLite WAL Mode, C-CLIST Rust Offloading e OpenTelemetry).

## [v1.4.0] — 2026-07-22
- **Fase 4 (Performance) Concluída**:
  - Capping rigoroso de retenção de candles $1m$ ajustado de 3.000 para 1.000 candles max em `StreamEngine.js`, reduzindo o consumo de memória RAM por instância em 66.7%.
  - Otimizações no `ScaleNormalizer` e `LiquidityEngine` com limites estritos de 300 zonas para prevenção de bloat em transporte WebSocket.
  - Criado o documento de qualidade `knowledge/quality/metrics.md`.
  - 100% dos testes validados com sucesso no Vitest (164 testes aprovados).

## [v1.3.0] — 2026-07-22
- **Fase 3 (Refatoração) Concluída**:
  - Criado o módulo `SmcEngineFacade` em `@lyzer/shared/src/smc/smcFacade.js`, unificando a avaliação do `TimeframeManager`, `TrendEngine`, `StructureEngine` e `LiquidityEngine`.
  - Refatorado `StreamEngine.js` para consumir a fachada SMC unificada em `processCandle`, eliminando chamadas redundantes e mantendo 100% de retrocompatibilidade com os adaptadores legados V1/V2/V3.
  - Adicionada a suíte de testes unitários `smcFacade.test.js` com 100% de taxa de aprovação no Vitest (164 testes aprovados).

## [v1.2.0] — 2026-07-22
- **Fase 2 (Estabilização) Concluída**:
  - Reorganizados 12 scripts de verificação `verify_*.js` para a pasta dedicada `lyzer edge/tests/verification/`.
  - Adicionado runner unificado `verify_suite.test.js` e o script `"test:verify"` no `package.json`.
  - Integrada a função `sendTelegramAlertWithRetry` com retentativa por exponential backoff no `telegram.js`.
  - 100% dos testes validados com sucesso (163 testes aprovados em 8 arquivos de teste).

## [v1.1.0] — 2026-07-22
- **Fase 1 (Correções Críticas) Concluída**:
  - Eliminado Singleton Pollution: `StreamEngine` agora instancia suas próprias cópias escopadas de `TruthKernel` e `ConstitutionalCourt`.
  - Proteção de Endpoints REST: Middleware `authenticateAdmin` adicionado em `server.js` para as rotas `/api/trades/*`.
  - Prevenção de Condição de Corrida: Flag booleana `isFallbackActive` integrada ao `StreamEngine`.
  - 100% dos testes da suíte Vitest validados com sucesso (148 testes aprovados).

## [v1.0.0] — 2026-07-22
- **Criação da Base de Conhecimento Viva**: Inicialização completa do diretório `/knowledge`.
- **Estruturação de Módulos**: Mapeamento detalhado de `StreamEngine`, `TruthKernel`, `ECA Court`, `CSRL Subsystem` e `SMC Suite`.
- **Governança & Invariantes**: Documentação do axioma "The Court shall never learn", UUIDv7 e oráculo C-CLIST.
- **Registros ADR**: Consolidação das ADRs do ecossistema.
