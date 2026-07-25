# 🏛️ LYZER EDGE COMMAND CENTER v2 — MIGRATION & INSTITUTIONAL UI INTEGRATION PLAN (ETAPA 1)

**Data de Emissão:** 2026-07-25  
**Autoridade:** Principal Frontend Architect, Institutional Systems Designer, Reliability Engineer  
**Status:** PLANO DE AUDITORIA E MIGRAÇÃO APROVADO EM ETAPA 1 (PRONTO PARA APRECIAÇÃO EXECUTIVA)  
**Lei Suprema:** Alpha Freeze Absoluto, Zero-Trust Read-Only & Purple Ban / Institutional Dark Design  

---

## 🧭 1. AUDITORIA FORENSE DA UI ATUAL

A análise profunda dos arquivos de roteamento (`src/router.js`, `src/app.js`), da tela inicial de apresentação (`src/Dashboard.js`) e da suíte de 24 componentes legados revelou severas incompatibilidades conceituais entre a camada de apresentação atual e a evolução do Lyzer Edge para o estágio de **Institutional Cognitive Observation System (Estágio L15)**.

### 1.1 Rotas Antigas e Incompatíveis (`src/app.js` & `src/router.js`)
O roteador SPA baseado em hash (`Router`) atualmente expõe 20 rotas em `app.js`. Muitas dessas rotas foram concebidas na fase de laboratório de varejo (*retail trading terminal*):
- **`#/` (Dashboard Legado):** Apresenta uma mistura de PnL de testes de estresse com gráficos decorativos de equity curve, falhando em isolar a realidade observada da realidade sintética.
- **`#/trades/new` (`TradeForm.js`) & `#/trades` (`TradeLog.js` / `TradeDetail.js`):** Formulários de entrada manual de ordens e edição de trades. Em um fundo quantitativo institucional regido por IA autônoma e leis fiduciárias, **operadores humanos não digitam ordens em telas da web**. Essas rotas representam um risco de contaminação e mutação manual.
- **`#/live-trading` (`LiveTradingView.js`) & `ExecutionTerminal.js`:** Interfaces de estilo "broker/exchange" centradas em execução manual ou interativa, desprovidas de verificação SHA-256 de proveniência de dados e sem proteção de veto de mutação (`dashboardSecurityGuard`).

### 1.2 Componentes Mortos, Legados e Estética de Varejo
- **`src/components/Dashboard.js` (429 linhas):** Contém dependências diretas a `lightweight-charts` e `apexcharts` para desenhar candles e curvas de patrimônio coloridas. Celebra lucros de curto prazo ("Win Rate", "ROI") sem comprovação forense de lineage ou análise de cauda (*TRG / LHDS*).
- **Estética Incompatível:** Uso de cards genéricos estilo SaaS, cores não padronizadas por severidade militar/aeroespacial e ausência de sinalização contínua de imutabilidade do Alpha Core.

### 1.3 Dependências e Elementos que Devem Desaparecer na Visão v2
1. **Candlesticks decorativos de Home Broker:** Removidos em favor de telemetria de microestrutura e *Reality Gap*.
2. **Botões de Ação de Trading (Buy/Sell/Close/Edit):** Vetados e substituídos por visualização observacional de ordens hipotéticas (*Shadow Execution*).
3. **Métricas sem Rastreabilidade Causal:** Qualquer número não carimbado com `OBSERVED_REALITY` ou `SYNTHETIC_REALITY` e sem hash SHA-256 será banido da tela principal.

---

## 🗺️ 2. ESTRATÉGIA DE INTEGRAÇÃO EM ETAPAS (SEM QUEBRA DO LEGADO)

Para obedecer à regra de **nunca apagar imediatamente o legado, garantir fallback seguro e rollback simples**, a migração seguirá uma estratégia de **coexistência envelopada**:

```
[ Usuário / C-Level ]
         │
         ▼ (Rota Padrão: #/)
┌────────────────────────────────────────────────────────┐
│ 🏛️ CommandCenterShell.js (Nova UI Institucional v2)    │
│  ├── Navigation Bar (8 Módulos Fiduciários)            │
│  ├── ExecutiveOverview.js (Status 5 segundos)          │
│  ├── RealityObservatory / AlphaIntegrity / Shadow...   │
│  └── Serviço de Dados Read-Only (dashboardDataProvider)│
└────────────────────────────────────────────────────────┘
         │
         ├── [ Botão de Rollback/Audit: "Visualizar Legado v1" ]
         ▼ (Rota de Fallback: #/legacy-dashboard)
┌────────────────────────────────────────────────────────┐
│ 📦 Dashboard.js (Legado Envelopado em Modo Read-Only)  │
└────────────────────────────────────────────────────────┘
```

### 2.1 Mapeamento de Rotas do Command Center v2
O novo `CommandCenterShell.js` assumirá a rota raiz (`#/`) e atuará como o orquestrador visual dos 8 componentes criados na Fase 2:
1. `#/` ou `#/overview` ➔ **Executive Overview**
2. `#/reality` ➔ **Reality Observatory**
3. `#/alpha-integrity` ➔ **Alpha Integrity Monitor**
4. `#/shadow-execution` ➔ **Shadow Execution Center**
5. `#/endurance` ➔ **Operational Survival Center**
6. `#/black-swan` ➔ **Black Swan Defense Panel**
7. `#/forensics` ➔ **Data Lineage Forensics**
8. `#/oversight` ➔ **Human Oversight Panel (CIO, CRO, Auditor, Regulador)**
9. `#/legacy` ➔ **Fallback Legado (`Dashboard.js`)**

---

## 🛡️ 3. PLANO DE CONSTRUÇÃO DAS ETAPAS 2 A 7

| Etapa | Módulos a Criar / Alterar | Objetivo Regimental | Status |
| :---: | :--- | :--- | :---: |
| **ETAPA 1** | Auditoria e Plano (`command_center_v2_migration_plan.md`) | Diagnóstico forense de rotas e componentes incompatíveis. | 🟢 **CONCLUÍDO (PARADA)** |
| **ETAPA 2** | `CommandCenterShell.js`, `CommandCenterRouter.js`, `CommandCenterNavigation.js` | Criar o shell institucional, status bar superior e navegação entre os 8 módulos fiduciários. | 🔒 BLOQUEADO |
| **ETAPA 3** | `src/app.js` & `src/router.js` | Integrar o `CommandCenterShell` na rota `# /`, movendo o legado para fallback seguro sem quebrar a aplicação. | 🔒 BLOQUEADO |
| **ETAPA 4** | `styles/tokens.js`, `theme.js`, `layout.js` | Codificar o Design System **Institutional Dark / Aerospace** (sem roxo/neon, alta densidade, monoespaçado). | 🔒 BLOQUEADO |
| **ETAPA 5** | `dashboardRuntimeAdapter.js` | Conectar o runtime real do Lyzer Edge ao `dashboardDataProvider`, impondo **DASHBOARD_CONTROL_VETO** a qualquer escrita. | 🔒 BLOQUEADO |
| **ETAPA 6** | Suíte `test_command_center_integration.js` | Executar 7 testes obrigatórios (boot vazio, realidade física, realidade sintética, contaminação, veto, hash corrompido, fail-closed). | 🔒 BLOQUEADO |
| **ETAPA 7** | 4 relatórios fiduciários finais em `knowledge/dashboard/` | Documentar integração, revisão de segurança read-only, jornada do usuário C-Level e validação final. | 🔒 BLOQUEADO |

---

## 🛑 4. PARADA DISCIPLINADA (REGRA DE GOVERNANÇA)

Conforme a Regra de Execução 2 (**"Após cada grande etapa: testar, documentar, parar"**) e Regra 3 (**"Nunca iniciar a próxima fase automaticamente"**), a **ETAPA 1 (Auditoria e Plano de Migração)** está oficialmente concluída e registrada.

O agente aguarda agora autorização expressa do Comitê Executivo para iniciar a **ETAPA 2 — Criar Shell Institucional (`CommandCenterShell.js`)**.
