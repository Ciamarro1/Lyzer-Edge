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

## [v4.5.0] — 2026-07-22
- **Fase 7.4 (Evolution Governance Certification) Concluída com Sucesso**:
  - Implementados 3 módulos e fachada em `lyzer edge/src/evolution-governance/`:
    - `EvolutionReplayEngine.js`: Replay determinístico de histórico de transações e ledger sem corrupção de estado.
    - `EvolutionHealthScore.js`: Cálculo do EHS global ($\in [0, 100\%]$) com zonas (`HEALTHY`, `MODERATE_DEGRADATION`, `CRITICAL_EVOLUTION_HALT`).
    - `EvolutionObservatory.js`: Painel observatório cognitivo em tempo real e relatório de auditoria constitucional.
    - `EvolutionGovernanceFacade` (`index.js`): Certificação de integridade evolutiva (ECS-1000).
  - Aprovado **ADR-024** (Cognitive Evolution Certification Framework).
  - Validação 100% aprovada na suíte de certificação `tests/evolution-governance/` (7/7 testes PASSED em 4 arquivos).

## [v4.4.0] — 2026-07-22
- **Fase 7.3 (Adaptive Evolution Runtime) Concluída com Sucesso**:
  - Implementados 4 módulos e fachada em `lyzer edge/src/adaptive-evolution/`:
    - `EvolutionExecutor.js`: Transações evolutivas atômicas (PENDING → ACTIVE → COMPLETED | ROLLED_BACK).
    - `ParameterVersionManager.js`: Versionamento Git-like com cognitive snapshots, diff e lineage.
    - `AdaptiveRuntimeMonitor.js`: Vigia pós-promoção com 5 triggers (drawdown, PnL, Sharpe, win rate, veto rate).
    - `AutomaticRollbackEngine.js`: Motor de reversão automática com quarentena de 1.000 ticks.
    - `AdaptiveEvolutionFacade` (`index.js`): Fachada unificada do runtime evolutivo.
  - Aprovados **ADR-021** (Adaptive Evolution Runtime), **ADR-022** (Parameter Version Governance), **ADR-023** (Evolution Rollback Constitution).
  - Validação 100% aprovada na suíte `tests/adaptive-evolution/` (11/11 testes PASSED em 5 arquivos).

## [v4.3.0] — 2026-07-22
- **Fase 7.2 (Adaptive Intelligence Evaluation Layer) Concluída com Sucesso**:
  - Implementados 4 módulos e fachada em `lyzer edge/src/adaptive-evaluation/`:
    - `AdaptationImpactAnalyzer.js`: Avaliação multidimensional (frequência, exposição, drawdown, Sharpe).
    - `RegimeStressEvaluator.js`: Teste de estabilidade multi-regime com RSS (Regime Stability Score).
    - `AdaptationRiskScore.js`: Adaptive Risk Score (ARS) composto com 4 zonas (SAFE/OBSERVATION/ECA_REVIEW/BLOCKED).
    - `EvolutionLedger.js`: Registro imutável da história genética do sistema.
    - `AdaptiveEvaluationFacade` (`index.js`): Fachada unificada com `evaluateProposal()`.
  - Adicionada a tabela `evolution_ledger` em `lyzer edge/backend/db.js`.
  - Aprovados **ADR-018** (Adaptive Evaluation Architecture), **ADR-019** (Evolution Ledger Model), **ADR-020** (Regime Stability Governance).
  - Validação 100% aprovada na suíte `tests/adaptive-evaluation/` (14/14 testes PASSED em 5 arquivos).

## [v4.2.0] — 2026-07-22
- **Fase 7.1 (Adaptive Pipeline Controller) Concluída com Sucesso**:
  - Implementado o `AdaptivePipelineController.js` em `lyzer edge/src/adaptive-sandbox/`:
    - Orquestra o ciclo completo: REFLECT → EXTRACT → PROPOSE → AUDIT → SHADOW → SCORE → COURT → PROMOTE.
    - Extrai propostas automaticamente do relatório de reflexão (`runDreamCycle`).
    - Executa simulação shadow não-destrutiva e calcula ACS antes de submeter à Corte ECA.
    - Implementa monitoramento pós-promoção com rollback proativo ($Drawdown > 5\%$ ou $PnL < -2\%$).
  - Aprovado **ADR-017** (Adaptive Pipeline Controller Architecture).
  - Validação 100% aprovada na suíte completa `tests/adaptive-sandbox/` (11/11 testes PASSED em 6 arquivos).

## [v4.1.0] — 2026-07-22
- **Fase 7.0 (Adaptive Intelligence Sandbox Implementation) Concluída com Sucesso**:
  - Implementados os 4 submódulos e fachada em `lyzer edge/src/adaptive-sandbox/`:
    - `ParameterProposalEngine.js`: Construção de `ParameterProposal` e restrição de boundary clamping ($\pm 15\%$).
    - `AdaptiveShadowEngine.js`: Simulação paralela não-destrutiva contra ticks reais e evento `SHADOW_COMPARISON_EVENT`.
    - `AdaptiveScoreEngine.js`: Métrica `Adaptive Confidence Score (ACS)` com cortes de submissão à Corte ECA ($ACS > 95\%$) e auto-rejeição ($ACS < 80\%$).
    - `ParameterVersionStore.js`: Rastreabilidade imutável em `parameter_versions` e método `rollback()`.
    - `AdaptiveSandboxFacade` (`index.js`): Coordenação unificada do laboratório Sandbox.
  - Adicionada a tabela `parameter_versions` em `lyzer edge/backend/db.js`.
  - Validação 100% aprovada na suíte de testes `tests/adaptive-sandbox/` (6/6 testes PASSED).
  - Publicada a documentação em [implementation.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/adaptive-sandbox/implementation.md).

## [v4.0.0] — 2026-07-22
- **Fase 7.0 (Adaptive Intelligence Sandbox - Architecture & ADRs) Formalizada**:
  - Aprovado o **ADR-014** em [ADR-014-adaptive-parameter-governance.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-014-adaptive-parameter-governance.md) (Governança de Parâmetros Adaptativos & Objeto ParameterProposal).
  - Aprovado o **ADR-015** em [ADR-015-shadow-intelligence-architecture.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-015-shadow-intelligence-architecture.md) (Execução Shadow Não-Destrutiva & Adaptive Confidence Score ACS).
  - Aprovado o **ADR-016** em [ADR-016-parameter-version-control.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-016-parameter-version-control.md) (Controle de Versão de Parâmetros & Mecanismo Proativo de Rollback).
  - Publicada a especificação técnica em [adaptive_sandbox_architecture.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/adaptive_sandbox_architecture.md).

## [v3.2.0] — 2026-07-22
- **Fase 6.6 (Cognitive Reflection Layer) Concluída com Sucesso**:
  - Aprovado o **ADR-013** em [ADR-013-cognitive-reflection-architecture.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-013-cognitive-reflection-architecture.md) (Arquitetura de Metacognição e Raciocínio Contrafactual).
  - Implementados os 5 submódulos metacognitivos em `lyzer edge/src/causal-reflection/`:
    - `ReflectionEngine.js`: Ciclo de reflexão offline ("Dream Cycle").
    - `CounterfactualSimulator.js`: Simulações hipotéticas ("What-If") sobre o SQLite WAL.
    - `KnowledgeConflictResolver.js`: Resolução de contradições no Grafo Cognitivo por amostragem e recência.
    - `ConfidenceDecayEngine.js`: Decaimento exponencial ($t_{1/2} = 30 \text{ dias}$) de scores de confiança.
    - `LearningReportGenerator.js`: Relatórios institucionais de metacognição para a Corte ECA.
  - Validação 100% aprovada na suíte de testes `tests/causal-reflection/` (5/5 testes PASSED).
  - Publicada a especificação em [causal_reflection_architecture.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/causal_reflection_architecture.md) e o relatório de implementação em [implementation.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/causal-reflection/implementation.md).

## [v3.1.0] — 2026-07-22
- **Fase 6 (Cognitive Self Improvement Layer Implementation) Concluída com Sucesso**:
  - Implementados os 5 submódulos em `lyzer edge/src/causal-learning/`:
    - `MemoryMiningEngine.js`: Mineração histórica de padrões epistêmicos no SQLite WAL.
    - `HypothesisEngine.js`: Avaliação de predição vs realidade empírica pós-fill.
    - `CognitiveKnowledgeGraph.js`: Grafo direcionado de causalidade (`CAUSED_BY`, `EVIDENCED_BY`, `PREVENTED_BY`).
    - `CognitiveAuditor.js`: Auditoria autônoma de propostas ($N \ge 500$, ganho de PnL $> +5\%$, estabilidade multi-regime, viés temporal e compliance constitucional).
    - `CausalLearningFacade` (`index.js`): Coordenação do ciclo adaptativo e gravação em `semantic_memory`.
  - Criada a tabela `semantic_memory` em `lyzer edge/backend/db.js`.
  - Validação 100% aprovada na suíte de testes `tests/causal-learning/` (7/7 testes PASSED).
  - Publicada a documentação em [implementation.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/causal-learning/implementation.md).

## [v3.0.0] — 2026-07-22
- **Fase 6 (Cognitive Self Improvement Layer - Architecture & ADRs) Formalizada**:
  - Aprovado o **ADR-010** em [ADR-010-epistemic-learning-architecture.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-010-epistemic-learning-architecture.md) (Contrato de Aprendizado Epistêmico & Axiomas Imutáveis).
  - Aprovado o **ADR-011** em [ADR-011-adaptive-governance-model.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-011-adaptive-governance-model.md) (Governança Adaptativa: Proposta ≠ Alteração, `CognitiveAuditor` & `ParameterProposal`).
  - Aprovado o **ADR-012** em [ADR-012-semantic-memory-architecture.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-012-semantic-memory-architecture.md) (Memória Semântica & Grafo Cognitivo de Causalidade).
  - Publicada a especificação em [causal_learning_architecture.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/causal_learning_architecture.md).

## [v2.9.0] — 2026-07-22
- **Fase 5.6.1 (Causal Completeness Upgrade) Concluída**:
  - Implementadas as 3 Sprints de elevação do Causal Completeness Score (CCS) de **85.7% para 100.0%**.
  - **Sprint 1**: Criado `REALITY_SNAPSHOT_CREATED` com compressão de tensores CSRL.
  - **Sprint 2**: Criado `FEATURE_GENERATED` integrando estruturas SMC (`OrderBlocks`, `LiquidityPools`, `MarketStructure`).
  - **Sprint 3**: Criado o `LearningEngine.js` e evento `LEARNING_FEEDBACK` para ciclo adaptativo predito vs realizado.
  - Publicado o relatório em [ccs_upgrade_report.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/causal-memory/ccs_upgrade_report.md).

## [v2.8.0] — 2026-07-22
- **Fase 5.6 (Causal Memory Integration Audit) Concluída**:
  - Aprovado o **ADR-009** em [ADR-009-causal-integration-coverage.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-009-causal-integration-coverage.md).
  - Elaborado o relatório de auditoria [causal_integration_audit.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/causal_integration_audit.md).
  - Formulada a métrica institucional **Causal Completeness Score (CCS)** e apurado o valor atual do sistema em **85.7%**.
  - Mapeada a Matriz de Cobertura Causal detalhando os eventos cobertos, parciais e faltantes (`FEATURE_GENERATED`, `LEARNING_FEEDBACK`).

## [v2.7.0] — 2026-07-22
- **Fase 5.5 (Causal Memory Runtime MVP Implementation) Concluída**:
  - Criado o diretório e módulo `lyzer edge/src/causal-memory/` (`EventFactory.js`, `EventValidator.js`, `EventStore.js`, `ProjectionEngine.js`, `RewindEngine.js`, `index.js`).
  - Adicionado o suporte à tabela `causal_events_log` e métodos de consulta/inserção em `db.js`.
  - Criada a suíte de testes em `lyzer edge/tests/causal-memory/` (5 novas suítes de teste).
  - Validados **100% dos 177 testes** da aplicação no Vitest sem alterar os contratos dos motores de trading.
  - Documentados em `docs/causal-memory/` (`implementation.md`, `runtime_flow.md`, `testing.md`).

## [v2.6.0] — 2026-07-22
- **Fase 5.4 (Causal Memory Runtime Layer Design) Concluída**:
  - Aprovado o **ADR-008** em [ADR-008-causal-memory-runtime.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-008-causal-memory-runtime.md).
  - Elaborada a especificação técnica [causal_memory_runtime_spec.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/causal_memory_runtime_spec.md).
  - Proclamado o **Axioma da Soberania Causal (Causal Sovereignty Axiom)**.
  - Projetados os 5 componentes executáveis (`EventFactory`, `EventValidator`, `EventStore`, `ProjectionEngine`, `RewindEngine`).
  - Estabelecido o fluxo determinístico causal de decisão e as 4 invariantes invioláveis do runtime.

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
