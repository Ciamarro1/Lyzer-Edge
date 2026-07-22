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

---

## 📜 Histórico de Manutenção

Toda alteração nesta Base de Conhecimento é registrada no [knowledge_history.md](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/changelog/knowledge_history.md).
