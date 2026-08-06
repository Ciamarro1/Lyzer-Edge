# 📋 LYZER EDGE — DOCUMENTATION GAP ANALYSIS

**Analyst:** Documentarian (opencode) · **Date:** 2026-08-06 · **Context:** Post-investigation gap assessment
**Reference:** `INVESTIGACAO_PROFUNDA_2026-08-06.md` (13 achados críticos)

---

## 1. ESTADO DA DOCUMENTAÇÃO — O QUE EXISTE vs. O QUE NÃO EXISTE

### 1.1 O QUE ESTÁ DOCUMENTADO

| Área | Documento | Estado | Observação |
|------|-----------|--------|------------|
| Visão geral | `README.md` | ✅ Existe | 250 linhas, arquitetura 3-processos, onboarding, matriz de funcionalidades |
| Changelog | `CHANGELOG.md` | ⚠️ Existe mas mínimo | 1 entrada `[Unreleased]`, formato Keep a Changelog adotado mas não mantido |
| Guia do agente | `AGENTS.md` | ✅ Existe | 85 linhas, comandos, env vars, convenções, arquitetura |
| Carta constitucional | `CONSTITUTION.md` | ✅ Existe | 75 linhas, 9 abstrações base, checklist de engenharia |
| Auditoria técnica | `docs/audit/` (17 arquivos) | ✅ Existe | executive_summary, api_inventory, security_review, onboarding_guide, etc. |
| Relatórios R2-R5 | `docs/audits/` (4 arquivos) | ✅ Existe | R2 (empirical), R3 (runtime), R4 (chaos), R5 (hardening) |
| ADRs | `docs/architecture/` (42 ADRs) | ✅ Existe | ADR-005 a ADR-042 + specs adicionais |
| Roadmap | `docs/roadmap/capability-era-roadmap.md` | ✅ Existe | 104 linhas, Capability Era, 3 trilhas |
| Onboarding | `docs/audit/onboarding_guide.md` | ⚠️ Existe mas mínimo | 18 linhas, apenas pontos de entrada |
| API spec (conhecimento) | `knowledge/api.md` | ⚠️ Existe mas desatualizado | Referencia `/api/state` e `/health` que não existem no server.js |
| API LACW | `lyzer edge/docs/workspace/api.md` | ⚠️ Existe mas referencia endpoints inexistentes | `/ws/lacw/events` e `/api/v1/lacw/snapshots` não existem |
| Env template | `lyzer edge/.env.template` | ✅ Existe | 47 chaves documentadas (mas com secret hardcoded) |
| Env example | `lyzer edge/.env.example` | ❌ Errado | Contém vars SMTP irrelevantes (3 linhas) |

### 1.2 O QUE NÃO EXISTE (GAPS CRÍTICOS)

| Gap | Severidade | Impacto |
|-----|-----------|---------|
| `CONTRIBUTING.md` | 🔴 Alta | Novos contribuidores não têm guia de contribuição padronizado |
| `CODE_OF_CONDUCT.md` | 🔴 Alta | Projeto sem código de conduta, risco de comportamento tóxico em PRs |
| Relatório `R1` em `docs/audits/` | 🔴 Alta | A cadeia de evidências R1→R5 está incompleta; R1 (bomba LIVE_TRADING_ENABLED) não tem relatório formal |
| `docs/workspace/` directory | 🔴 Alta | `lyzer edge/docs/workspace/api.md` existe mas referencia endpoints que não existem no código |
| `.env.example` correto | 🔴 Alta | Arquivo existente contém vars SMTP falsas, não as chaves reais do Lyzer Edge |
| CHANGELOG mantido | 🟡 Média | Formato Keep a Changelog existe mas só tem 1 entrada; não reflete as mudanças reais |
| Documentação de arquitetura sincronizada | 🟡 Média | 42 ADRs + docs de audit referem versões antigas do pipeline e estado idealizado |
| Documentação de onboarding para devs | 🟡 Média | README onboarding é superficial; docs/audit/onboarding_guide.md tem 18 linhas |
| Documentação do gap M4 | 🟡 Média | README e docs dizem M1.4/M4 PLANNED mas nunca implementado; ninguém documenta essa lacuna |
| Documentação do gap SMC dual-engine | 🟡 Média | README diz SMC ✅ mas legacy + new rodam em paralelo; não documentado |
| Documentação do gap Rust/NATS | 🟡 Média | README diz RiskGateway ✅ mas é skeleton e não está no Dockerfile |

---

## 2. MATRIZ DE GAPS DE DOCUMENTAÇÃO

### 2.1 Gaps por Categoria

| # | Gap | Arquivo/Local | Severidade | Impacto | Evidência |
|---|-----|---------------|-----------|---------|-----------|
| G1 | **`lyzer edge/docs/workspace/api.md` referencia endpoints inexistentes** | `lyzer edge/docs/workspace/api.md` (linhas 4-5) | 🔴 Crítico | Desenvolvedores implementam ou consomem endpoints que não existem; desperdício de esforço | `/ws/lacw/events` e `/api/v1/lacw/snapshots` não aparecem em `server.js` nem em `docs/audit/api_inventory.md` |
| G2 | **`knowledge/api.md` desatualizado** | `knowledge/api.md` (linhas 10-12) | 🔴 Crítico | Consumidores da API esperam `/api/state` e `/health` que não existem | `server.js` não tem `/api/state` nem `/health`; o inventory real está em `docs/audit/api_inventory.md` |
| G3 | **Relatório R1 ausente em `docs/audits/`** | `docs/audits/` (diretorio) | 🔴 Crítico | A cadeia de evidências R1→R5 está quebrada; não há relatório formal para o achado mais crítico (LIVE_TRADING_ENABLED=true default no Dockerfile) | `docs/audits/` contém apenas R2, R3, R4, R5 |
| G4 | **`CONTRIBUTING.md` ausente** | Raiz do repo | 🟡 Alta | Novos contribuidores não têm guia padronizado; README tem uma seção "Como Contribuir" mas não é um arquivo dedicado | `Test-Path` retorna False para `CONTRIBUTING.md` |
| G5 | **`CODE_OF_CONDUCT.md` ausente** | Raiz do repo | 🟡 Alta | Projeto sem código de conduta; risco de comportamento tóxico em PRs e issues | `Test-Path` retorna False |
| G6 | **`.env.example` com conteúdo errado** | `lyzer edge/.env.example` | 🔴 Crítico | Novos devs copiam um arquivo de exemplo com vars SMTP irrelevantes em vez das chaves reais do Lyzer Edge | Contém `SMTP_USER`, `SMTP_PASS`, `NOTIFICATION_EMAIL` — nada relacionado ao Lyzer Edge |
| G7 | **`README.md` com discrepâncias de estado** | `README.md` | 🔴 Crítico | README afirma funcionalidades como ✅ que são na verdade falhas/gaps (RiskGateway, SMC, M4) | Matriz de funcionalidades do README diz "Rust IPC ✅ Implementado" mas investigation mostra RiskGateway = skeleton não-buildado |
| G8 | **`docs/roadmap/` superestima maturidade** | `docs/roadmap/capability-era-roadmap.md` | 🟡 Média | Roadmap afirma "LYZER EDGE v1.0 ARCHITECTURAL FREEZE" e "100% ready" mas investigation mostra CONDITIONAL PASS apenas para testnet | Roadmap referencia "cadeia R1→R5 completa" mas R1 report está ausente e os achados da investigation contradizem a readiness claim |
| G9 | **ADRs desatualizados em relação ao código** | `docs/architecture/` (42 ADRs) | 🟡 Média | ADRs referem-se a conceitos como "9 abstrações base", "Cognitive Kernel", "Autonomous Research" que não correspondem à implementação real do pipeline de 7 camadas | ADR-042 referencia M1.4 e "Provider Reality Boundary" que não existem no código atual; ADRs conceituais não refletem o pipeline StreamEngine real |
| G10 | **`docs/audit/onboarding_guide.md` insuficiente** | `docs/audit/onboarding_guide.md` | 🟡 Média | Apenas 18 linhas; não cobre setup, troubleshooting, ou arquitetura | Arquivo tem apenas 3 seções: pontos de entrada, regras fundamentais, e traceabilidade |
| G11 | **CHANGELOG.md não mantido** | `CHANGELOG.md` (raiz) | 🟡 Média | Só tem 1 entrada `[Unreleased]`; não reflete as mudanças desde a última versão documentada | CHANGELOG.md tem 30 linhas; a investigação documenta 13 achados críticos e múltiplas correções que não estão no changelog |
| G12 | **Sem documentação de configuração completa** | `.env.template` | 🟡 Média | Embora `.env.template` exista e tenha 47 chaves, ele contém `COURT_SECRET_KEY=lyzer_hf_space_default_key` (secret hardcoded — investigation R2) | `.env.template` linha 47 tem a chave pública default |
| G13 | **README onboarding contradiz Dockerfile** | `README.md` vs `Dockerfile` | 🔴 Crítico | README onboarding diz `LIVE_TRADING_ENABLED=false` e `ARL_MODE=SIMULATION`; Dockerfile tem `LIVE_TRADING_ENABLED=true` e `ARL_MODE=TESTNET` | README.md linha 130-132 vs Dockerfile linha 65-66 |
| G14 | **Sem documentação do gap M4 (Entry/Risk/PositionManager)** | README.md + docs | 🟡 Média | README e docs dizem M1.4/M4 PLANNED mas nunca implementado; a lacuna não é documentada como tal | Investigation R7: "M4 Entry/Risk/PositionManager: NUNCA implementados" |
| G15 | **Sem documentação do gap SMC dual-engine** | README.md | 🟡 Média | README diz "SMC Modular ✅ Implementado" mas legacy (V1/V3) e new (v2) rodam em paralelo; não documentado como problema | Investigation: "V2+V4 são os únicos providers ativos (V1/V3 disabled por default)" |
| G16 | **Sem documentação do gap Rust/NATS** | README.md + docs | 🟡 Média | README diz "Rust IPC ✅ Implementado" mas RiskGateway é skeleton e não está buildado no Dockerfile | Investigation R5: "RiskGateway Rust = skeleton approve-all, SEQUER buildado no Dockerfile" |

### 2.2 Gaps por Severidade

| Severidade | Count | Gaps |
|-----------|-------|------|
| 🔴 Crítico | 7 | G1, G2, G3, G6, G7, G13, (G4/G5 por impacto em onboarding) |
| 🟡 Alta | 4 | G4, G5, G8, G14 |
| 🟡 Média | 5 | G8, G9, G10, G11, G12, G15, G16 |

---

## 3. ANÁLISE DETALHADA DOS PRINCIPAIS GAPS

### 3.1 G1: `lyzer edge/docs/workspace/api.md` — Endpoints Inexistentes

**Arquivo:** `lyzer edge/docs/workspace/api.md`
**Conteúdo atual:**
```
- WebSocket Streaming (`/ws/lacw/events`): Streams live topic-filtered JSON events to the UI.
- REST Endpoints (`/api/v1/lacw/snapshots`): Fetches historical telemetry snapshots and layout configurations.
```

**Realidade:** Nem `/ws/lacw/events` nem `/api/v1/lacw/snapshots` existem em `server.js`. Os endpoints reais são:
- `GET /api/status`, `GET /api/candles/:symbol`, `POST /api/trades/close`, `POST /api/trades/delete`, `POST /api/trades/wipe`, `POST /api/reset-engine`, `POST /api/test-order`, `GET /api/testnet-dashboard`, `GET /api/experiments/*`, `GET /api/archeologist/*`, `GET /api/mind/mri`
- WebSocket broadcast no porto 7860 (sem path `/ws/lacw/events`)

**Impacto:** Qualquer desenvolvedor que leia este documento tentará implementar ou consumir endpoints que não existem, gerando trabalho desperdiçado e confusão.

### 3.2 G2: `knowledge/api.md` — API Spec Desatualizada

**Arquivo:** `knowledge/api.md`
**Conteúdo atual** referencia `/api/state` e `/health` que não existem no `server.js`.

**Realidade:** O `server.js` não tem nem `/api/state` nem `/health`. O inventário real está em `docs/audit/api_inventory.md`.

### 3.3 G3: Relatório R1 Ausente

**O que existe:** `docs/audits/R2-empirical-validation-report.md`, `R3-runtime-reality-audit.md`, `R4-chaos-engineering-report.md`, `R5-production-hardening-report.md`
**O que falta:** `R1-live-capability-validation-report.md` (ou similar)

**Impacto:** A cadeia de evidências R1→R5 mencionada no roadmap está incompleta. R1 é o achado mais crítico (LIVE_TRADING_ENABLED=true default no Dockerfile) e não tem um relatório formal de auditoria.

### 3.4 G6: `.env.example` com Conteúdo Errado

**Arquivo:** `lyzer edge/.env.example`
**Conteúdo atual:**
```
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_de_aplicativo_do_gmail
NOTIFICATION_EMAIL=email_destino@gmail.com
```

**Realidade:** O Lyzer Edge não usa SMTP. As variáveis reais são `BINANCE_API_KEY`, `BINANCE_API_SECRET`, `ARL_MODE`, `LIVE_TRADING_ENABLED`, `TRG_THRESHOLD`, etc. (todas em `.env.template`).

### 3.5 G7: README.md com Discrepâncias de Estado

**Matriz de funcionalidades do README.md** afirma:

| Funcionalidade | Estado README | Realidade (Investigação) |
|---|---|---|
| Rust IPC Gateway de Risco | ✅ Implementado | ❌ Skeleton approve-all, não buildado no Dockerfile |
| SMC Modular | ✅ Implementado | ⚠️ Legacy + new rodando em paralelo; V1/V3 disabled |
| M1.4/M4 Entry/Risk/PositionManager | ✅ Implementado (no roadmap) | ❌ NUNCA implementado |
| Edge validado | Implícito ✅ | ❌ Backtest real: Sharpe -2.16, WR 26.67%, 22/22 ablações UNPROVEN |

### 3.6 G13: README Onboarding Contradiz Dockerfile

| Parâmetro | README.md onboarding (linha 129-132) | Dockerfile (linha 65-66) |
|---|---|---|
| `ARL_MODE` | `SIMULATION` | `TESTNET` |
| `LIVE_TRADING_ENABLED` | `false` | `true` |

**Risco:** Um novo dev que segue o README para configurar `.env` e depois usa o Dockerfile terá `LIVE_TRADING_ENABLED=true` com `ARL_MODE=TESTNET` — a bomba descrita no investigation R1.

---

## 4. PLANO DE DOCUMENTAÇÃO MÍNIMA

### 4.1 Priorização (MoSCoW)

#### MUST HAVE (Imediato — ≤ 1 dia)

| # | Ação | Arquivo | Descrição |
|---|------|---------|-----------|
| D1 | Corrigir `lyzer edge/docs/workspace/api.md` | `lyzer edge/docs/workspace/api.md` | Substituir endpoints inexistentes pelos reais do `server.js` e `docs/audit/api_inventory.md` |
| D2 | Corrigir `knowledge/api.md` | `knowledge/api.md` | Substituir `/api/state` e `/health` pelos endpoints reais; remover referências a endpoints que não existem |
| D3 | Criar `R1-live-capability-validation-report.md` | `docs/audits/R1-live-capability-validation-report.md` | Relatório formal para o achado R1 (LIVE_TRADING_ENABLED=true default no Dockerfile) |
| D4 | Corrigir `.env.example` | `lyzer edge/.env.example` | Substituir conteúdo SMTP pelas variáveis reais do Lyzer Edge (copiar de `.env.template` sem os secrets) |
| D5 | Corrigir README.md onboarding | `README.md` | Alinhar `LIVE_TRADING_ENABLED` e `ARL_MODE` com o Dockerfile real |

#### SHOULD HAVE (Curto prazo — ≤ 7 dias)

| # | Ação | Arquivo | Descrição |
|---|------|---------|-----------|
| D6 | Criar `CONTRIBUTING.md` | Raiz do repo | Guia de contribuição com: branch strategy, PR process, test requirements, code style |
| D7 | Criar `CODE_OF_CONDUCT.md` | Raiz do repo | Código de conduta baseado em Contributor Covenant |
| D8 | Criar `docs/architecture/ARCHITECTURE.md` | `docs/architecture/` | Documento de arquitetura atualizado que reflita o pipeline real de 7 camadas vs o estado real do código |
| D9 | Atualizar CHANGELOG.md | `CHANGELOG.md` | Adicionar entradas para todas as correções do investigation (R1-R13) no formato Keep a Changelog |
| D10 | Atualizar README.md Matriz de Funcionalidades | `README.md` | Corrigir status de Rust IPC, SMC, M4 para refletir a realidade (skeleton, dual-engine, não-implementado) |

#### COULD HAVE (Médio prazo — ≤ 30 dias)

| # | Ação | Arquivo | Descrição |
|---|------|---------|-----------|
| D11 | Criar `docs/onboarding/` dedicado | `docs/onboarding/` | Guia de onboarding completo para novos desenvolvedores (setup, troubleshooting, arquitetura, pipeline) |
| D12 | Sincronizar ADRs com código | `docs/architecture/` | Revisar os 42 ADRs e atualizar os que referenciam versões antigas do pipeline ou conceitos não implementados |
| D13 | Documentar gap M4 | README.md + novo doc | Documentar explicitamente que M4 Entry/Risk/PositionManager nunca foi implementado e por quê |
| D14 | Documentar gap SMC dual-engine | README.md + novo doc | Documentar o problema do legacy + new SMC running em paralelo |
| D15 | Documentar gap Rust/NATS | README.md + novo doc | Documentar que RiskGateway é skeleton e não está buildado no Dockerfile |

#### WON'T HAVE (Neste ciclo)

| # | Ação | Motivo |
|---|------|--------|
| D16 | Criar `docs/workspace/` directory dedicado | O diretório `lyzer edge/docs/workspace/` já existe com `api.md`; focar em corrigir o conteúdo existente |
| D17 | Traduzir toda a documentação para inglês | Projeto é bilíngue (PT/EN); manter como está por enquanto |

### 4.2 Plano de Execução Detalhado

#### Fase 1: Correções Críticas (Dia 1)

```
D1: docs/workspace/api.md → Substituir por inventário real de endpoints
D2: knowledge/api.md → Substituir por spec atualizada
D3: docs/audits/R1-*.md → Criar relatório R1 formal
D4: .env.example → Corrigir com vars reais (sem secrets)
D5: README.md → Alinhar onboarding com Dockerfile
```

#### Fase 2: Arquivos Ausentes (Dias 2-3)

```
D6: CONTRIBUTING.md → Criar com estrutura padrão
D7: CODE_OF_CONDUCT.md → Criar baseado em Contributor Covenant 2.1
D9: CHANGELOG.md → Adicionar entradas para R1-R13 findings
```

#### Fase 3: Sincronização (Dias 4-7)

```
D8: docs/architecture/ARCHITECTURE.md → Criar documento de arquitetura sincronizado
D10: README.md → Corrigir matriz de funcionalidades
D11: docs/onboarding/ → Criar guia de onboarding completo
```

#### Fase 4: Documentação de Gaps (Dias 8-30)

```
D12: Sincronizar ADRs com código real
D13: Documentar gap M4
D14: Documentar gap SMC dual-engine
D15: Documentar gap Rust/NATS
```

---

## 5. RESUMO EXECUTIVO

### 5.1 Contagem de Gaps

| Categoria | Total | Crítico | Alto | Média |
|-----------|-------|---------|------|-------|
| Arquivos ausentes | 4 | 2 | 2 | 0 |
| Arquivos com conteúdo errado/desatualizado | 6 | 4 | 1 | 1 |
| Discrepâncias docs vs código | 6 | 2 | 2 | 2 |
| **Total** | **16** | **8** | **5** | **3** |

### 5.2 Top 5 Gaps por Risco

1. **G1/G2** — API docs referenciam endpoints inexistentes → risco de implementação errada
2. **G3** — R1 report ausente → cadeia de evidências incompleta
3. **G6** — `.env.example` com conteúdo SMTP errado → novo dev configura errado
4. **G7** — README afirma funcionalidades ✅ que são gaps → falsa confiança
5. **G13** — README onboarding contradiz Dockerfile → bomba de deploy para novos devs

### 5.3 Métrica de Saúde da Documentação

| Métrica | Valor | Meta | Status |
|---------|-------|------|--------|
| Arquivos de doc existentes | ~85+ | — | ✅ |
| Arquivos de doc desatualizados | 6 | 0 | 🔴 |
| Arquivos de doc ausentes (essenciais) | 4 | 0 | 🔴 |
| Discrepâncias docs vs código | 6 | 0 | 🔴 |
| ADRs sincronizados com código | ~10/42 | 42/42 | 🔴 |
| CHANGELOG ativo | 1 entrada | Múltiplas | 🟡 |
| Onboarding completo | 18 linhas | >500 linhas | 🔴 |

---

*Gerado por: Documentarian (opencode) · 2026-08-06*
*Referência: INVESTIGACAO_PROFUNDA_2026-08-06.md · 13 achados críticos*
*Projeto: Lyzer Edge — github.com/Ciamarro1/Lyzer-Edge*
