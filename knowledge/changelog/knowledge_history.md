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
