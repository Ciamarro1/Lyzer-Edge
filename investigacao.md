# Mission Plan: Investigação Completa do Lyzer Edge

## Nível: L1 (System Map)
## Tipo: Pesquisa/Investigação — Nenhum código será alterado

## Escopo
- Mapear arquitetura completa (backend, frontend, packages, serviços Rust)
- Analisar dependências e configurações
- Mapear pipeline quantitativo de 7 camadas
- Identificar riscos, dívida técnica e pontos cegos
- Documentar entrypoints e fluxos principais

## Agentes Necessários
1. explorer-agent — Mapeamento de código-fonte
2. backend-specialist — Análise do backend (server.js, streamEngine, engine/)
3. frontend-specialist — Análise do frontend SPA
4. code-archaeologist — Arquitetura legada e padrões
5. security-auditor — Análise de segurança
6. database-architect — Análise de dados e schemas

## Fases

### Fase 1: Mapa do Sistema (explorer-agent)
**Objetivo:** Levantar estrutura completa de diretórios, configurações root, workspaces e dependências.

**Tarefas:**
- [ ] Listar topologia de diretórios (raiz, `packages/`, `lyzer edge/`, `src-rust/`, `lyzer-workspace/`)
- [ ] Analisar `package.json` raiz e `lyzer edge/package.json` — scripts, dependências, workspaces
- [ ] Analisar `AGENTS.md`, `.env.template`, `Dockerfile`
- [ ] Mapear workspace packages: `@lyzer/shared`, `@lyzer/constitution`
- [ ] Identificar entrypoints principais: backend, frontend, Rust binaries
- [ ] Analisar `vite.config.js`, `eslint.config.*`, `vitest.config.*`

**Entregáveis:**
- Árvore de diretórios anotada
- Tabela de dependências npm e workspaces
- Mapa de entrypoints

---

### Fase 2: Análise Backend (backend-specialist)
**Objetivo:** Compreender server.js, StreamEngine, pipeline quantitativo e serviços auxiliares.

**Tarefas:**
- [ ] Analisar `lyzer edge/backend/server.js` — Express 5, WebSocket, spawn de engines
- [ ] Analisar `lyzer edge/backend/streamEngine.js` — ciclo de vida: ingestão → sinais → TruthKernel → ECA court → execução
- [ ] Mapear `engine/` — provedores V1/V2/V3, ResidualizationLayer, ExecutionTriggerLayer
- [ ] Analisar TruthKernel — LHDS veto, ontological collapse
- [ ] Analisar C-CLIST (stress oracle), MOL (recovery state)
- [ ] Analisar ConstitutionalCourt — EEF, constraint engine, edge-riding
- [ ] Analisar `ExchangeExecution` e simulação de ordens

**Entregáveis:**
- Diagrama do pipeline de 7 camadas (textual)
- Fluxo de uma trade: do candle ao execution
- Mapa de configurações e env vars do backend

---

### Fase 3: Análise Frontend (frontend-specialist)
**Objetivo:** Compreender SPA, roteamento hash-based, componentes e comunicação com backend.

**Tarefas:**
- [ ] Analisar `lyzer edge/src/main.js` → `app.js` — 24 rotas, lazy loading
- [ ] Mapear componentes principais por rota
- [ ] Analisar WebSocket client ou polling
- [ ] Analisar stores/estado global (se houver)
- [ ] Verificar aliases Vite (`@`)
- [ ] Analisar testes frontend (`tests/`)

**Entregáveis:**
- Mapa de rotas e componentes
- Fluxo de dados frontend ← → backend
- Lista de dependências frontend (chart libs, etc.)

---

### Fase 4: Análise de Segurança (security-auditor)
**Objetivo:** Identificar superfície de ataque, credenciais, validaçãoins e riscos.

**Tarefas:**
- [ ] Verificar exposição de secrets em `.env.template`, `Dockerfile`, scripts
- [ ] Analisar validação de inputs no backend (Express 5)
- [ ] Verificar headers de segurança (CORS, CSP)
- [ ] Analisar WebSocket sem autenticação
- [ ] Verificar gRPC serviços (`lyzer.proto`) — RiskGateway, IntentRegistry
- [ ] Checar NATS exposto sem auth
- [ ] Revisar `deploy-experiments.ps1` para vazamento de tokens

**Entregáveis:**
- Lista de vulnerabilidades priorizadas (CVSS-like)
- Recomendações de hardening

---

### Fase 5: Análise de Dados (database-architect)
**Objetivo:** Mapear schemas, bancos de dados e fluxo de dados persistidos.

**Tarefas:**
- [ ] Analisar `intent_registry.db` — SQLite, schema, UNIQUE constraints
- [ ] Analisar `src-rust/` — Rust data models, protobuf
- [ ] Analisar `lyzer-workspace/` — constitutional hub, dados de corte
- [ ] Verificar `backup_restore.py` — estratégia de backup
- [ ] Analisar `setup-nats.ts` — NATS JetStream, subjects
- [ ] Mapear fluxo de dados: engine → banco → corte → auditoria

**Entregáveis:**
- Schema de dados (entidades principais)
- Fluxo de dados persistidos
- Riscos de integridade/consistência

---

### Fase 6: Síntese Final
**Objetivo:** Consolidar descobertas, priorizar riscos e gerar recomendações.

**Tarefas:**
- [ ] Consolidar mapas de fases 1-5
- [ ] Priorizar riscos e dívida técnica
- [ ] Identificar pontos cegos
- [ ] Gerar recomendações para próximos sprints
- [ ] Sugerir Nível L2 (se aplicável)

**Entregáveis:**
- Documento de arquitetura consolidado
- Risk register (priorizado)
- Roadmap de melhorias sugerido

---

## Critérios de Sucesso
- Documento de arquitetura atualizado
- Mapa de dependências completo
- Riscos identificados e priorizados
- Recomendações para próximos passos

## Duração Estimada
- Fase 1: 1 iteração
- Fases 2-5: Paralelo, 1 iteração cada
- Fase 6: 1 iteração
