---
proposito: "Índice detalhado de todos os módulos do Lyzer Edge"
data_criacao: "2026-07-22"
ultima_atualizacao: "2026-07-22"
origem_dados:
  - "AGENTS.md"
  - "PROJECT.md"
  - "packages/"
  - "lyzer edge/backend/"
nivel_confianca: "Alto"
pendencias_conhecidas: "Nenhuma"
---

# Catálogo e Inventário de Módulos

| Módulo | Localização | Finalidade Principal | Linguagem | Maturidade |
|---|---|---|---|---|
| **StreamEngine** | `lyzer edge/backend/streamEngine.js` | Orquestrador síncrono de mercado e pipeline de decisão por tick | Node.js (ESM) | Produção |
| **TruthKernel** | `packages/lyzer-shared/src/engine/kernel.js` | Avaliação tensorial de TRG, DVF e LHDS; emissão da EEF | Node.js (ESM) | Alta |
| **ECA Court** | `packages/lyzer-constitution/src/eca/court.js` | Julgamento constitucional determinístico e oráculo C-CLIST | Node.js (ESM) | Institucional |
| **CSRL Subsystem** | `packages/lyzer-shared/src/csrl/` | Topologia de tensores multi-escala e extração de invariantes | Node.js (ESM) | Alta |
| **SMC Suite** | `packages/lyzer-shared/src/smc/` | Estrutura de mercado, liquidez e bias sem lookahead | Node.js (ESM) | Transição |
| **Rust Workspaces** | `src-rust/`, `lyzer-workspace/`, `lyzer edge/src-rust/` | Gateway gRPC, NATS JetStream, Risk Gateway e OMS | Rust | Alta |
