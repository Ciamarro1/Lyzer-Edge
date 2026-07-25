# 🏛️ LYZER EDGE — COMMAND CENTER v2 ROUTER INTEGRATION AUDIT

**Data de Emissão:** 2026-07-25  
**Autoridade:** Principal Software Architect, Institutional Systems Designer, Lyzer Guardian  
**Objeto:** Auditoria Forense da Rota e Plano Técnico de Integração (Fase 3 Etapa 4)  
**Status:** AUDITORIA CONCLUÍDA — AGUARDANDO APROVAÇÃO EXECUTIVA PARA MUTAR ROTEADOR  

---

## 1. ESTADO ATUAL DA APLICAÇÃO LEGADA

A inspeção forense da camada de navegação e visualização existente revelou a atual topologia em execução:

### 1.1 Roteador (`src/router.js` - 222 LoC)
- **Mecanismo:** Roteador SPA baseado em hash (`location.hash`), gerenciando instâncias de views através dos métodos `mount(el)` e `unmount()`.
- **Suporte a Guard:** Aceita uma função async `guard(to, from)` na inicialização, porém atualmente essa facilidade **não é utilizada em nenhum ponto do sistema** para impor proteções operacionais ou institucionais.
- **Vulnerabilidade Arquitetural:** Qualquer componente carregado tem acesso irrestrito ao DOM global e aos módulos do sistema, sem sandboxing ou inspeção de contrato de estado.

### 1.2 Controlador da Aplicação (`src/app.js` - 292 LoC)
- **Topologia de Interface:** Renderiza um layout monolítico (`<aside class="sidebar">` com 24 itens + `<main class="main-content">` com `#app-view`).
- **Mapeamento de Rotas (`ROUTES`):** Define a rota raiz `#/` apontando diretamente para `new Dashboard()`.
- **Acoplamento de Conexões:** O construtor e método `mount()` iniciam conexões ativas diretas com `wsClient.connect()` e `liveTradeSync.start()`, sem segregar o modo read-only de observação do modo de execução ativa.

### 1.3 Dashboard Legado (`src/components/Dashboard.js` - 429 LoC)
- **Mistura de Preocupações (Separation of Concerns Failure):** O componente importa e executa funções de mutação direta de banco de dados (`wipeAllTrades`), serviços de injeção de dados sintéticos (`DataSeederService`, `BinanceSeederService`) e cálculos quantitativos manuais (`calcEdgeScore`, `calcEquityCurve`).
- **Violação de Invariantes Institucionais:** Responde com métricas de varejo ("trading performance at a glance") sem segregação forense entre realidade observada e sintética, violando as Leis Supremas L14/L15.

---

## 2. PONTOS DE INTEGRAÇÃO E CONFLITOS ARQUITETURAIS

### 2.1 Ponto de Injeção Primário (`#/` e `#/command-center`)
- O novo `CommandCenterShell` deve ser montado na rota raiz `#/` e como alias em `#/command-center`.
- **Conflito Identificado:** O layout externo legado de `app.js` (`sidebar` de 24 itens de varejo) conflita esteticamente e epistemologicamente com o design institucional do `CommandCenterShell` (que já possui seu próprio header, navegação por 8 módulos fiduciários e footer read-only).
- **Resolução Arquitetural:** Ao montar na rota `#/`, o `CommandCenterShell` assumirá o controle do viewport `#app-view`. A navegação interna entre os 8 módulos observacionais (`ExecutiveOverview`, `RealityObservatory`, etc.) será regida pelo `CommandCenterRouter` interno, sem poluir o histórico de hash do browser com sub-rotas desnecessárias, ou será sincronizada de forma isolada.

### 2.2 Preservação do Legado (`#/legacy`)
- O `Dashboard.js` original **não será deletado nem modificado**.
- Será realocado para a rota `#/legacy`, permitindo auditoria comparativa entre a visão antiga (varejo/performance) e a visão institucional (observabilidade/sobrevivência).

---

## 3. MATRIZ DE RISCOS (R-01 A R-05) E MITIGAÇÕES

| ID | Risco Identificado | Gravidade | Probabilidade | Mitigação Institucional (Fase 3 Etapa 4) |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | **Quebra da aplicação existente** ao alterar o mapeamento do router no `src/app.js` | ALTA | MÉDIA | Preservação integral das 23 rotas restantes no `src/app.js`. O `CommandCenterShell` é autocontido e não altera serviços compartilhados. |
| **R-02** | **Perda do fallback** se o Command Center v2 falhar ao inicializar | ALTA | BAIXA | Criação do `CommandCenterRouteGuard` com fail-closed para estado seguro (`RED SAFE STATE`) e manutenção da rota `#/legacy` plenamente funcional. |
| **R-03** | **Acoplamento direto da UI** com motores quantitativos ou L15 | CRÍTICA | ALTA | Imposição estrita do `dashboardRuntimeAdapter.js` como **única ponte permitida**. Testes automatizados proibirão imports diretos de `engine/` ou `microstructure/` nas views. |
| **R-04** | **Mistura de Realidade Observada e Sintética** na renderização de dados | CRÍTICA | MÉDIA | Validação obrigatória através dos semáforos de `EvidenceBadge` (`OBSERVED_REALITY` vs `SYNTHETIC_REALITY`) expostos pelo snapshot congelado do Adapter. |
| **R-05** | **Rotas antigas permitindo operações proibidas** (mutação, escrita de alpha) | CRÍTICA | ALTA | Interceptação por middleware (`dashboardSecurityGuard.js`) disparando `DASHBOARD_CONTROL_VETO` para qualquer tentativa de escrita ou mutação na interface. |

---

## 4. ESTRATÉGIA DE MIGRAÇÃO: A FRONTEIRA INSTITUCIONAL PROTEGIDA

Para evitar que `router.js` seja apenas "um fio ligando telas", estabelecemos uma **fronteira de bootstrap institucional em camadas**:

```
[Browser Navigation: #/ ou #/command-center]
                       │
                       ▼
         ┌───────────────────────────┐
         │  CommandCenterRouteGuard  │  ← Intercepta rota, audita RuntimeAdapter,
         └─────────────┬─────────────┘    bloqueia modo write, valida contrato.
                       │ (Se falhar: RED SAFE STATE / Observation Halt)
                       ▼
         ┌───────────────────────────┐
         │  CommandCenterBootstrap   │  ← Declara estado inicial fiduciário:
         └─────────────┬─────────────┘    { system: L15, alpha: FROZEN, mode: READ_ONLY }
                       │
                       ▼
         ┌───────────────────────────┐
         │    CommandCenterShell     │  ← Renderiza chassi institucional e
         └─────────────┬─────────────┘    inicia módulos observacionais.
                       │
                       ▼
         ┌───────────────────────────┐
         │     ExecutiveOverview     │  ← Módulo padrão carregado (read-only).
         └───────────────────────────┘
```

### 4.1 Contrato do `CommandCenterRouteGuard.js`
1. Verifica se `runtimeAdapter` está disponível e responsivo.
2. Invoca `runtimeAdapter.getSnapshot()` para validar se o objeto retornado é estritamente congelado (`Object.isFrozen`).
3. Confirma que o sistema está em modo observacional (`OBSERVATION_ONLY`).
4. Se qualquer verificação falhar, **aborta a montagem** e renderiza um painel de paralisação de observação (`RED SAFE STATE — OBSERVATION HALT`), impedindo que uma UI corrompida apresente dados enganosos.

### 4.2 Contrato do `CommandCenterBootstrap.js`
1. Gera e certifica o manifesto de inicialização institucional:
   ```javascript
   {
     system: { version: "L15", mode: "OBSERVATION_ONLY", security: "ACTIVE" },
     alpha: { state: "FROZEN" },
     capital: { status: "DISCONNECTED" },
     runtime: { adapter: "AVAILABLE" }
   }
   ```
2. Não executa cálculos nem consome dados de exchange; apenas carimba a sessão de observação.

---

## 5. PLANO DE EXECUÇÃO DA ETAPA 4 (PÓS-APROVAÇÃO)

Uma vez aprovada esta auditoria pela autoridade executiva, a execução seguirá estritamente esta ordem:

1. **Implementar `CommandCenterRouteGuard.js`** em `src/components/commandCenter/`.
2. **Implementar `CommandCenterBootstrap.js`** em `src/components/commandCenter/`.
3. **Modificar `src/router.js`** para expor suporte ou wrapper compatível com a cadeia de guard/bootstrap sem alterar as rotas legadas.
4. **Modificar `src/app.js`**:
   - Alterar a rota `#/` para a cadeia `CommandCenterRouteGuard → CommandCenterBootstrap → CommandCenterShell`.
   - Adicionar a rota `#/command-center` com o mesmo comportamento.
   - Adicionar a rota `#/legacy` apontando para a classe `Dashboard` original.
   - Adicionar indicador visual ou link na barra lateral legada para "🏛️ Command Center v2" e "📜 Legacy Dashboard".
5. **Criar e executar suíte de certificação `test_command_center_integration.js`** cobrindo os 6 testes obrigatórios.
6. **Sincronizar git/HF e emitir relatório final**.

---

## 6. CONCLUSÃO DA AUDITORIA & REGRA DE PARADA

Conforme a **REGRA SUPREMA** da missão:
- A auditoria foi concluída e documentada.
- Os arquivos centrais (`src/router.js`, `src/app.js`, `Dashboard.js`) **não foram alterados**.
- O sistema encontra-se em **PARADA REGIMENTAL**, aguardando autorização executiva formal para proceder à implementação dos componentes de rota e mutação do `app.js`.
