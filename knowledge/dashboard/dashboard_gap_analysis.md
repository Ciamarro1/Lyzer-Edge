# 🏛️ LYZER EDGE — INSTITUTIONAL DASHBOARD GAP ANALYSIS (v1 vs v2)

**Data de Emissão:** 2026-07-25  
**Autoridade:** Comitê Institucional de Arquitetura (CIO, CRO, Principal Product Architect, SRE)  
**Status de Governança:** FASE 0 — AUDITORIA CONCLUÍDA (AGUARDANDO APROVAÇÃO EXECUTIVA)  
**Lei Suprema:** Alpha Freeze Absoluto & Fiduciary Read-Only Observability  

---

## 📋 SUMÁRIO EXECUTIVO

O presente documento formaliza a auditoria institucional do dashboard existente no Lyzer Edge (`v1`), avaliando sua aderência à evolução arquitetural da plataforma, que transicionou de um motor quantitativo de geração de sinais e backtesting para um **Sistema Operacional Institucional de Observação, Validação, Governança e Sobrevivência (L10 a L15)**.

O diagnóstico confirma que o dashboard atual (`v1`) tornou-se **conceitualmente obsoleto e fiduciariamente perigoso**. Ele foi desenhado para responder à pergunta de um *trader de varejo ou quant experimental*:  
> ❌ *"Quanto o sistema ganhou? Qual o Win Rate? Como está a Equity Curve?"*

A nova realidade institucional do Lyzer Edge exige um **Command Center C-Level (v2)** projetado para responder às perguntas inegociáveis de um *Comitê de Risco e Auditoria Institucional*:  
> ✅ *"O sistema é confiável? Está enxergando corretamente a realidade do mercado físico sem ilusão sintética? A microestrutura está degradando? A integridade criptográfica dos motores está intacta? Quais riscos estruturais existem antes de qualquer centavo de capital ser exposto?"*

---

## 🚨 1. O QUE FICOU OBSOLETO (MÉTODOS E MÓDULOS LEGACY / PROIBIDOS)

A auditoria inspecionou os 24 componentes atuais em `lyzer edge/src/components/` e o roteador (`app.js`), identificando severas incompatibilidades com a doutrina L10–L15:

### 1.1 Foco Obsoleto em Métricas de PnL e Performance Especulativa
- **Componentes Reprovados:** `Dashboard.js`, `TradeForm.js`, `TradeLog.js`, `TradeDetail.js`, `Recommendations.js`, `StrategyLab.js`, `MonteCarloView.js`.
- **Motivo Fiduciário:** Apresentar como destaque primário métricas como *ROI, Win Rate, Profit Factor, Sharpe Isolado* e *Equity Curve* (como em `Dashboard.js` linhas 103-119) induz o comitê executivo ao viés de otimização de lucro (violação da Lei Suprema de Governança). O Lyzer Edge em L15 não está "operando para ganhar dinheiro", está **operando em modo Shadow para provar sobrevivência e imunidade a falhas físicas**.
- **Ação:** Rebaixar todas as métricas de retorno para módulos secundários/históricos de pesquisa quantitativa e eliminar formulários de envio manual de ordens (`TradeForm.js`).

### 1.2 Ausência de Segregação Epistemológica (Observed vs. Synthetic Reality)
- **Falha Crítica:** As telas atuais misturam resultados de backtest/replay (como em `robustnessReport` em `Dashboard.js`) com dados ao vivo, sem demarcação forense regimental de fonte (`[SOURCE: OBSERVED_REALITY]` vs `[SOURCE: SYNTHETIC_REALITY]`).
- **Ação:** Proibir a exibição não etiquetada de dados. O novo dashboard deve isolar fisicamente a realidade sintética da realidade observada na microestrutura da exchange.

### 1.3 Estética Visual de "Trading Terminal / Exchange de Varejo"
- **Falha de Design (Aderência à `@frontend-design`):** O visual atual com cards genéricos, gráficos de candlesticks estilo exchange e excesso de elementos interativos especulativos transparece um terminal de home broker, violando o princípio da gravidade institucional.
- **Ação:** Erradicar o visual de terminal de trading. Adotar a identidade **Institutional Dark Command Center** (alta densidade de informação, semáforos fiduciários, paleta de cor estrita sem tons roxos/violetas proibidos pelo *Purple Ban*, contraste severo e tipografia de centro de controle aeroespacial/militar).

---

## 🛡️ 2. O QUE DEVE PERMANECER (FUNDAMENTOS E CONTRATOS PRESERVADOS)

Nem todo o ecossistema frontal deve ser descartado. A auditoria identificou módulos que possuem alto valor arquitetural e que serão **refatorados e elevados** como núcleos do Command Center v2:

| Componente / Conceito | Motivo para Preservação | Evolução no Command Center v2 |
| :--- | :--- | :--- |
| **`DecisionStream.js` & `DecisionAnalytics.js`** | Representam a transparência cognitiva da corte ECA (*Epistemic Constitutional Authority*) e do TruthKernel. | Transformar em núcleo do **Alpha Integrity Monitor** e do **Human Oversight Panel**, exibindo hashes criptográficos de veto em tempo real. |
| **`PolicyEditor.js`** | Permite auditoria das regras constitucionais e limites de relaxamento (*TRG_THRESHOLD*, *LHDS_VETO_LIMIT*). | Integrar ao painel de Governança em modo **estritamente read-only / observacional**, exibindo tentativas bloqueadas de mutação. |
| **`SystemHealthView.js`** | Base inicial para observabilidade de recursos de sistema. | Evoluir diretamente para o **Operational Survival Center**, conectando-se ao telemetria do *Shadow War Endurance Engine* (Heap growth, Reconnects, Uptime SHA-256). |
| **`RiskAnalysisView.js`** | Contém a modelagem de cauda e limites de risco do fundo. | Absorver no **Black Swan Defense Panel**, transformando estatísticas estáticas em status contínuo de aprovação sob estresse extremo (`PASSED / FAILED`). |
| **Infraestrutura SPA (`router.js` & `eventBus.js`)** | Roteamento baseado em hash ultraleve e barramento de eventos assíncrono desacoplado. | Mantidos como alicerce de transporte do novo roteador de 8 telas institucionais. |

---

## 🏗️ 3. O QUE FALTA (AS 8 TELAS INSTITUCIONAIS OBRIGATÓRIAS DO V2)

Para alinhar a interface visual ao estado arquitetural **L15 (Live Shadow Deployment & Reality Observation Certification)**, o Command Center v2 deverá implementar 8 visões especializadas, alimentadas por contratos de métricas estritamente observacionais:

```
+---------------------------------------------------------------------------------------------------+
|                           🏛️ LYZER EDGE INSTITUTIONAL COMMAND CENTER v2                            |
+---------------------------------------------------------------------------------------------------+
| 1. EXECUTIVE OVERVIEW     | Lifecycle: L15 | Gov: GREEN | Alpha: FROZEN | Capital: DISCONNECTED   |
+---------------------------+-----------------------------------------------------------------------+
| 2. REALITY OBSERVATORY    | Reality Gap Score (0-100) | Execution Quality | Slippage | Clock NTP  |
+---------------------------+-----------------------------------------------------------------------+
| 3. ALPHA INTEGRITY        | Hashes SHA-256 (TruthKernel, SMC, Regime) | Veto Counter | Immutable  |
+---------------------------+-----------------------------------------------------------------------+
| 4. LIVE SHADOW EXECUTION  | Orders: Observed vs Simulated | Spread Rejections | Liquidity Impact    |
+---------------------------+-----------------------------------------------------------------------+
| 5. OPERATIONAL SURVIVAL   | Shadow War Engine | Heap Growth (MB) | Uptime % | Ledger Hash Seal   |
+---------------------------+-----------------------------------------------------------------------+
| 6. BLACK SWAN DEFENSE     | Exchange Outage | Spread Explosion | Timestamp Drift | PASSED/FAILED   |
+---------------------------+-----------------------------------------------------------------------+
| 7. DATA LINEAGE FORENSICS | Lineage Chain | Source Tagging | Hash Transformation | Audit Trail      |
+---------------------------+-----------------------------------------------------------------------+
| 8. HUMAN OVERSIGHT PANEL  | CIO: "Posso confiar?" | CRO: "Risco?" | Auditor: "Consigo provar?"       |
+---------------------------------------------------------------------------------------------------+
```

### Detalhamento das Telas Faltantes:
1. **EXECUTIVE OVERVIEW:** Painel de entrada sumariando os 4 pilares intocáveis: Versão do Sistema, Status de Governança (`GREEN`), Invariância do Alpha (`FROZEN / IMMUTABLE`) e Isolamento Financeiro (`CAPITAL: NOT CONNECTED`).
2. **REALITY OBSERVATORY:** Visualização do *Reality Gap Score (0-100)* com semáforo fiduciário (`GREEN`, `YELLOW`, `ORANGE`, `RED`). Decomposição física: Qualidade de Execução, Degradabilidade de Liquidez, Impacto de Latência, Divergência de Slippage e Integridade do Relógio NTP.
3. **ALPHA INTEGRITY MONITOR:** Exibição forense da imutabilidade dos motores. Apresenta os hashes SHA-256 em tempo real de `TruthKernel`, `V4 IMCE`, `SMC Engine` e `Regime Engine`, contabilizando tentativas ilegais de alteração bloqueadas por Veto.
4. **LIVE SHADOW EXECUTION CENTER:** Monitoramento de ordens hipotéticas no barramento físico de microestrutura: Total Observadas, Simulated Filled, Rejeições por Spread/Liquidez e Paradas por Relógio.
5. **OPERATIONAL SURVIVAL CENTER:** Interface direta com o *Shadow War Endurance Engine* (L15 Fase 4). Monitora Uptime (%, reconexões, falhas de heartbeat), saúde de memória (Heap Growth) e integridade dos ledgers forenses (`endurance_events.jsonl`).
6. **BLACK SWAN DEFENSE PANEL:** Painel de certificação contínua contra 6 cenários de colapso físico: Exchange Outage, Evaporação de Liquidez, Corrupção de Timestamp, Explosão de Spread, Corrupção de Dados e Falha de Rede (`PASSED / FAILED`).
7. **DATA LINEAGE FORENSICS:** Módulo de rastreabilidade causal respondendo *"De onde veio este número?"*. Exibe cadeia cronológica, origem (`[SOURCE: OBSERVED_REALITY]`), transformações intermediárias e assinatura SHA-256 do responsável.
8. **HUMAN OVERSIGHT PANEL:** Simulador de perguntas regimentais das 4 autoridades fiduciárias:
   - **CIO:** *"Posso confiar na execução de longo prazo?"*
   - **CRO:** *"Qual a exposição ao risco estrutural e de cauda?"*
   - **Auditor:** *"Consigo provar matematicamente a imutabilidade do Alpha?"*
   - **Regulador:** *"Existe controle e bloqueio automático contra drift?"*

---

## ⚖️ 4. REGRA SUPREMA E CONTRATO DE INVARIÂNCIA (VETO ARQUITETURAL)

O Command Center v2 opera sob a **Lei Suprema do Read-Only Fiduciário**.

### Restrições Absolutas de Engenharia:
1. **Zero Mutação:** O dashboard NÃO possui permissão, rota, endpoint ou invocação de RPC para alterar pesos quantitativos, parâmetros do TruthKernel, limites de alocação ou acionar envio de ordens reais.
2. **Intercepção de Hardware/Software:** Qualquer tentativa de injeção de payload, clique de mutação ou chamada de escrita a partir do frontend disparará o alarme institucional:
   ```text
   🚨 [DASHBOARD_CONTROL_VETO] TENTATIVA DE MUTAÇÃO VIA INTERFACE OBSERVACIONAL BLOQUEADA.
   ```
3. **Isolamento em 3 Processos:** O nó do Dashboard (*Dashboard Node*) permanece isolado em memória e rede do nó de Execução (*Execution Node*) e do nó da Corte Constitucional (*ECA Court Node*).

---

## 🛑 5. PROTOCOLO DE EXECUÇÃO DISCIPLINADA — PARADA REGIMENTAL

Em conformidade estrita com o regimento de execução em etapas da missão (Execução Disciplinada):

- ✅ **FASE 0 — AUDITORIA INSTITUCIONAL DO DASHBOARD ATUAL:** **CONCLUÍDA**.
- 🛑 **STATUS ATUAL:** **PARADO REGIMENTALMENTE**. Nenhuma linha de código fonte, estilo CSS, estrutura HTML ou contrato JSON será produzida sem a aprovação executiva formal desta auditoria.

### Próximas Etapas (Bloqueadas):
- ⛔ **FASE 1:** Arquitetura do Novo Dashboard (`dashboard_architecture.md` & `dashboard_metric_contracts.json`).
- ⛔ **FASE 2:** Implementação e Refatoração Frontal/Backend (`knowledge/dashboard/`, `components/`, etc.).
- ⛔ **FASE 3:** Certificação, Suíte de Testes e Sincronização Remota.
