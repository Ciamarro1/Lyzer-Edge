---
proposito: "Índice mestre e guia de navegação da Base de Conhecimento Viva do Lyzer Edge"
data_criacao: "2026-07-22"
ultima_atualizacao: "2026-07-22"
origem_dados:
  - "AGENTS.md"
  - "PROJECT.md"
  - "lyzer edge/backend/server.js"
nivel_confianca: "Alto"
pendencias_conhecidas: "Nenhuma"
---

# LYZER EDGE — KNOWLEDGE BASE (BASE DE CONHECIMENTO VIVA)

Bem-vindo à **Base de Conhecimento Oficial do Lyzer Edge**. Este repositório de conhecimento é mantido de forma contínua, incremental e rastreável, servindo como a fonte primária de verdade para engenheiros e agentes de IA sobre o funcionamento interno, arquitetura, domínio e infraestrutura da plataforma.

---

## 🗺️ Estrutura de Navegação

### 1. 🏛️ [Arquitetura](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/architecture/overview.md)
- [Overview](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/architecture/overview.md) — Visão geral e topologia em 3 processos.
- [Runtime](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/architecture/runtime.md) — Inicialização, event loops e ciclo de vida do servidor.
- [Execution Flow](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/architecture/execution_flow.md) — Pipeline de decisão quantitativa de 7 camadas.
- [Dependency Graph](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/architecture/dependency_graph.md) — Grafos entre workspaces npm, Cargo e gRPC/NATS.
- [Data Flow](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/architecture/data_flow.md) — Trafegabilidade dos dados desde Klines até Ordens.
- [Sequence Diagrams](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/architecture/sequence_diagrams.md) — Diagramas Mermaid detalhados de sequência.

### 2. 🧩 [Módulos](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/modules/index.md)
- [Index de Módulos](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/modules/index.md) — Catálogo granular de subsistemas.
- [StreamEngine](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/modules/stream_engine.md) — Motor central de processamento de candles.
- [TruthKernel](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/modules/truth_kernel.md) — Avaliador de TRG, DVF e LHDS.
- [ECA Court](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/modules/eca_court.md) — Corte Constitucional, C-CLIST e MOL.
- [CSRL Subsystem](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/modules/csrl_subsystem.md) — Tensorial multi-escala.
- [SMC Suite](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/modules/smc_suite.md) — TimeframeManager, Structure e Liquidity.
- [Rust Workspaces](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/modules/rust_workspaces.md) — Crates em Rust (`src-rust`, `lyzer-workspace`, `lyzer edge/src-rust`).

### 3. 🔌 [Plugins & Adaptadores](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/plugins/index.md)
- [Binance Adapter](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/plugins/binance_adapter.md) — Ingestão e execução em Live/Testnet.
- [Telegram Notifier](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/plugins/telegram_notifier.md) — Notificações de ordens e emergências.

### 4. 🤖 [Agentes & Diretivas IA](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/agents/index.md)
- [Prompts](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/agents/prompts.md) — Diretivas cognitivas de IA (`AGENTS.md`, `GEMINI.md`).
- [Skills](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/agents/skills.md) — Mapeamento de habilidades do ecossistema AG Kit.

### 5. 🧠 [Domínio & Invariantes](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/domain/glossary.md)
- [Glossário](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/domain/glossary.md) — Definição de termos (TRG, DVF, LHDS, SCL, EEF).
- [Invariantes](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/domain/invariants.md) — Regras inegociáveis do sistema (ex: "The Court shall never learn").

### 6. 🛠️ [Desenvolvimento & ADRs](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/development/architecture_decisions.md)
- [ADRs](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/development/architecture_decisions.md) — Registros de decisão de arquitetura.
- [Onboarding](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/development/onboarding.md) — Guia de partida rápida para novos devs.

### 7. 📊 [Qualidade & Métricas](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/quality/metrics.md)
- [Métricas de Performance & Capping](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/quality/metrics.md) — Limites de retenção de memória RAM e otimizações tensoriais.

### 8. 👁️ [Observabilidade & SRE](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/observability/architecture.md)
- [Observability Architecture](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/observability/architecture.md) — Arquitetura de observabilidade e integridade causal UUIDv7.
- [Metrics Catalog](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/observability/metrics_catalog.md) — Especificação técnica oficial do catálogo de métricas.
- [Performance Baseline (Fase 5.1.5)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/observability/performance_baseline.md) — Linha de base empírica de throughput e latência P50/P95/P99.
- [SLO Definition & Readiness Checklist](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/observability/slo_definition.md) — SLOs/SLIs e Production Readiness Checklist.
- [Chaos Experiments](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/chaos/experiments/CE001-sqlite-latency.md) — Runbooks executáveis de Engenharia do Caos (CE001, CE002, CE003).
- [Persistence Architecture & WAL Strategy (Fase 5.2)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/persistence/architecture.md) — Documentação oficial do upgrade institucional SQLite WAL Mode.
- [ADR-006: Causal Memory Architecture (Fase 5.3)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-006-causal-memory-architecture.md) — Desenho arquitetural da Memória Causal e Reconstrução Epistemológica.
- [ADR-007: Causal Event Contract (Fase 5.3.1)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-007-causal-event-contract.md) — Contrato formal do evento, integridade Hash Chain e explicabilidade.
- [ADR-008: Causal Memory Runtime (Fase 5.4)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-008-causal-memory-runtime.md) — Desenho do runtime executável, componentes, invariantes e Soberania Causal.
- [Causal Memory Implementation MVP (Fase 5.5)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/causal-memory/implementation.md) — Documentação oficial da implementação do MVP do Runtime Causal.
- [ADR-009: Causal Integration Coverage & CCS (Fase 5.6)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-009-causal-integration-coverage.md) — Auditoria de integração, Matriz de Cobertura Causal e score CCS (85.7%).
- [Causal Integration Audit Report](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/causal_integration_audit.md) — Relatório completo de auditoria do pipeline e plano de elevação do CCS.
- [CCS 100% Upgrade Report (Fase 5.6.1)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/causal-memory/ccs_upgrade_report.md) — Relatório de conclusão do upgrade para CCS 100.0% e LearningEngine.
- [ADR-010: Epistemic Learning Architecture (Fase 6)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-010-epistemic-learning-architecture.md) — Contrato de aprendizado epistêmico, limites mutáveis vs imutáveis.
- [ADR-011: Adaptive Governance Model (Fase 6)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-011-adaptive-governance-model.md) — Governança adaptativa: Proposta ≠ Alteração, ParameterProposal e CognitiveAuditor.
- [ADR-012: Semantic Memory Architecture (Fase 6)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-012-semantic-memory-architecture.md) — Memória Semântica, Grafo Cognitivo de Causalidade e tabela `semantic_memory`.
- [ADR-013: Cognitive Reflection Architecture (Fase 6.6)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-013-cognitive-reflection-architecture.md) — Arquitetura de metacognição, Dream Cycle, raciocínio contrafactual e decay.
- [ADR-014: Adaptive Parameter Governance (Fase 7.0)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-014-adaptive-parameter-governance.md) — Governança de parâmetros adaptativos, ParameterProposal e limites de variação.
- [ADR-015: Shadow Intelligence Architecture (Fase 7.0)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-015-shadow-intelligence-architecture.md) — Execução Shadow não-destrutiva, score ACS e SHADOW_COMPARISON_EVENT.
- [ADR-016: Parameter Version Control (Fase 7.0)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-016-parameter-version-control.md) — Controle de versão semântico de parâmetros, reversibilidade total e rollback.
- [Adaptive Sandbox Architecture Spec (Fase 7.0)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/adaptive_sandbox_architecture.md) — Especificação técnica do laboratório interno Sandbox.
- [Adaptive Sandbox Implementation (Fase 7.0)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/adaptive-sandbox/implementation.md) — Documentação oficial da implementação do laboratório Sandbox.
- [ADR-017: Adaptive Pipeline Controller (Fase 7.1)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/ADR-017-adaptive-pipeline-controller.md) — Orquestrador central do ciclo adaptativo: Reflexão → Sandbox → ECA Court → Produção.
- [Causal Learning Architecture Spec (Fase 6)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/causal_learning_architecture.md) — Especificação completa da camada de auto-melhoria cognitiva.
- [Causal Reflection Architecture Spec (Fase 6.6)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/architecture/causal_reflection_architecture.md) — Especificação técnica oficial de metacognição.
- [Causal Learning Implementation (Fase 6)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/causal-learning/implementation.md) — Documentação oficial da implementação dos motores da Fase 6.
- [Causal Reflection Implementation (Fase 6.6)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/causal-reflection/implementation.md) — Documentação oficial de implementação da camada de metacognição.
- [SRE Runbook](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/observability/runbook.md) — Guia operacional de resposta a incidentes.

---

## 📜 Histórico de Manutenção

Toda alteração nesta Base de Conhecimento é registrada no [knowledge_history.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/changelog/knowledge_history.md).
