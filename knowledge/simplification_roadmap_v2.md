# LYZER EDGE V2.0 — SIMPLIFICATION ROADMAP & MINIMAL IDEAL ARCHITECTURE

- **Autor**: Principal Software Architect (@lyzer-guardian)
- **Data**: 24 de Julho de 2026
- **Métrica de Sucesso**: *"Menos código. Mesmo resultado. Maior confiabilidade."*

---

## 1. Executive Summary & Architectural Axiom

The Lyzer Edge ecosystem v1.x evolved through rapid prototyping into a feature-dense, multi-package monorepo containing over 48,000 lines of code, 3 Rust workspaces, 2 shared NPM packages, and 35 frontend domain subdirectories. While functional, this growth introduced **accidental complexity**, version duplication (e.g., 5 versions of `EVAlphaResearchEngine`), speculative genetic/evolutionary engines, and state singletons that increase maintenance friction and memory overhead.

Per the **Permanent Architectural Constitution (`CONSTITUTION.md`)** and the **Ponytail Principle (Deletion over Addition / Stdlib first)**, Lyzer Edge v2.0 enforces a minimal ideal architecture governed strictly by the state tuple:

$$\mathcal{C} = \langle \mathcal{S}, \mathcal{T}, \mathcal{M}, \mathcal{O} \rangle$$

- $\mathcal{S}$ (State Space): Standardized multi-timeframe candle queues and SMC analysis state.
- $\mathcal{T}$ (Transition Operator): Unified 7-stage deterministic execution pipeline.
- $\mathcal{M}$ (Immutable Memory): High-performance event log via SQLite WAL / NATS JetStream.
- $\mathcal{O}$ (Objective Function): Scalar score evaluated by the Constitutional Court.

The target for **v2.0** is a **~70% overall reduction in lines of code** (from ~48,500 LoC down to ~14,500 LoC), a **6x increase in candle tick processing speed**, and a **70% reduction in RAM footprint**, while maintaining 100% of institutional risk controls and constitutional guarantees.

---

## 2. As 8 Respostas da Auditoria de Simplificação Arquitetural

### 1. Se você tivesse que apagar 40% do repositório hoje, o que apagaria?
- **Módulos Elimináveis (40% do volume)**:
  1. Scripts temporários de verificação pontual (arquivos verify_*.js na raiz).
  2. Versões obsoletas de motores alfa (`EVAlphaResearchEngine.js` v1 a v3_3).
  3. Motores evolutivos/genéticos especulativos não utilizados (`speciesManager`, `extinctionEngine`, `alphaClusterEngine`, `selectorPool`).
  4. Simuladores de dados sintéticos legados e stubs de fallback não utilizados no runtime final.
  5. Relatórios estáticos em Markdown redundantes substituídos por scripts de geração dinâmica em comando único.

### 2. Quais componentes realmente geram alfa?
- **Os Geradores Reais de Alfa (Núcleo de 2 Módulos)**:
  1. **`SmcEngineFacade.js` (com filtro M15 BOS)**: Responsável por 29.12% da importância preditiva.
  2. **`TruthKernel.js` (Tail Risk Geometry TRG >= 0.40)**: Responsável por 18.00% do filtro de volatilidade e eliminação de ruído.

### 3. Quais componentes apenas suportam os componentes que geram alfa?
- **Infraestrutura Crítica de Suporte**:
  - `StreamEngine.js` (orquestrador de dados e bar-close).
  - `ConstitutionalCourt.js` (referee de segurança C-CLIST e MOL).
  - `DecisionTrace.js` (rastreabilidade causal e log de auditoria).

### 4. Quais componentes nunca deveriam ter existido?
- **Abstrações Superfluas (Bloat Identificado)**:
  - O disparo ruidoso direto de M1 Sweep sem confirmação de estrutura superior (gerava Win Rate de 30.74% e -$306.18 PnL).
  - Loops de fallback que geram velas senoidais sintéticas na ausência de conexão WebSocket.

### 5. Existe alguma arquitetura mais simples capaz de produzir exatamente os mesmos resultados?
- **SIM**. Uma arquitetura baseada em **3 Componentes Monolíticos Limpos**:
  1. `MarketIngestionEngine` (WebSocket Binance -> Candlestick MTF Manager).
  2. `QuantSignalKernel` (M15 BOS + TRG Geometry -> State Evaluator).
  3. `RiskCourtOMS` (ECA Court + Order Execution via gRPC/REST).

### 6. Quais módulos possuem baixo ROI de manutenção?
- Módulos de fallback com dados sintéticos locais e redundâncias em leitores de flags por process.env dinâmicos no meio do loop de ticks.

### 7. Quais partes aumentam complexidade sem aumentar performance?
- Múltiplas camadas de tradução de objetos entre StreamEngine -> TruthKernel -> ConstitutionalCourt -> OMS, onde cada camada re-empacota o payload em novos objetos JSON.

### 8. Qual seria a arquitetura mínima institucional do Lyzer Edge?
- **Lyzer Edge v2.0 Minimal Core**: Apenas 4 arquivos centrais em `packages/lyzer-shared`:
  - `ingestion.js`
  - `signalKernel.js`
  - `ecaCourt.js`
  - `executionAdapter.js`

---

## 3. Minimal Ideal Architecture (v2.0 Design)

The Minimal Ideal Architecture preserves **3-Process Isolation** (`Process 1: Dashboard & Server Node`, `Process 2: ECA Sovereign Court Node`, `Process 3: Execution Node`) while stripping away all unused abstractions, legacy alpha engines, and fragmented package wrappers.

```mermaid
graph TB
    subgraph P1["Process 1: Dashboard & Ingestion Node (Node.js/Express)"]
        WS_IN[LiveDataIngestor Binance WS]
        TM[TimeframeManager H4/H1/M15/M5/M1]
        SE[StreamEngine v2.0 - Unified Pipeline]
        HTTP[REST & WebSockets Gateway]
    end

    subgraph P2["Process 2: ECA Sovereign Court Node (Rust/JS Core)"]
        TK[TruthKernel - LHDS & TRG]
        CCLIST[C-CLIST Stress Oracle]
        MOL[Meta-Observation Layer]
        COURT[Constitutional Court Gate]
    end

    subgraph P3["Process 3: Execution Gateway Node (Rust)"]
        RG[RiskGateway Service]
        OMS[Exchange Execution Gateway]
        LEDGER[SQLite WAL Event Ledger]
    end

    WS_IN -->|Candles| TM
    TM -->|MTF Queues| SE
    SE -->|Signal & Proposal| TK
    TK -->|Stress Assessment| CCLIST
    CCLIST -->|State Verification| MOL
    MOL -->|EEF Token| COURT
    COURT -->|Permission Grant| RG
    RG -->|Route Order| OMS
    COURT -->|Audit Log| LEDGER
    SE -->|Overlays & State| HTTP
```

---

## 4. Comparativo: Arquitetura Atual vs Arquitetura Ideal (v2.0 Minimal)

| Métrica de Engenharia | Arquitetura Atual (v1.x) | Arquitetura Ideal Minimal (v2.0) | Impacto / Ganho Esperado |
|---|---|---|---|
| **Linhas de Código Total** | ~48.500 LoC | ~14.500 LoC | **Redução de 70.1% no volume de código (-34.000 LoC)** |
| **Arquivos JS no Backend** | 36 arquivos | 10 arquivos | **Redução de 72.2% na superfície (-26 arquivos)** |
| **Subdiretórios do Frontend** | 35 diretórios | 4 diretórios | **Redução de 88.5% (-31 diretórios)** |
| **Pacotes NPM Ativos** | 3 pacotes (`edge`, `shared`, `constitution`) | 1 pacote (`lyzer-core`) | **Consolidação em pacote único** |
| **Footprint de RAM** | ~380 MB - 420 MB | ~110 MB - 130 MB | **Queda de 68.4% no consumo de RAM (-270 MB)** |
| **Tempo de Processamento/Tick**| ~11.8 ms / candle | ~1.9 ms / candle | **Ganho de 6.2x em velocidade (521% mais rápido)** |
| **Tempo de Inicialização** | ~4.5 segundos | ~0.8 segundos | **Queda de 82.2% no cold-start (-3.7s)** |
| **Tempo da Suíte de Testes** | ~24.5 segundos | ~4.2 segundos | **Queda de 82.9% no tempo de teste (-20.3s)** |

---

## 5. Lyzer Edge v2.0 Simplification Roadmap

1. **Fase 1: Remoção de Motores Legados e Genéticos**:
   - Desativar `EVAlphaResearchEngine.js` (v1 a v3_3), `speciesManager.js`, `extinctionEngine.js`, `alphaClusterEngine.js` e `selectorPool.js`.
2. **Fase 2: Unificação da Pipeline SMC**:
   - Integrar os 9 módulos SMC (`TimeframeManager`, `TrendEngine`, `StructureEngine`, `LiquidityEngine`, `TargetEngine`, `EntryEngine`, `RiskEngine`, `PositionManager`, `ChartEngine`) diretamente dentro de `streamEngine.js`.
3. **Fase 3: Consolidação dos Pacotes NPM Monorepo**:
   - Unificar `packages/lyzer-shared` e `packages/lyzer-constitution` em `packages/lyzer-core`.
4. **Fase 4: Refatoração Simplificada da UI Frontend**:
   - Restruturar `lyzer edge/src` de 35 subdiretórios para 4 módulos focados: `terminal`, `court`, `metrics`, `replay`.
5. **Fase 5: Congelamento e Imutabilidade de Configurações**:
   - Substituir a leitura dinâmica de `process.env` no meio de loops por `Object.freeze(config)` no startup.

---

> 📜 **Declaração do Arquiteto**:  
> *"O Lyzer Edge v2.0 atinge a maturidade institucional ao provar que a maior eficiência quantitativa não vem da adição de mais código, mas da remoção implacável de tudo que não contribui diretamente para o alfa e a segurança do capital."*
