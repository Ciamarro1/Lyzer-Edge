# ADR-009: Cobertura de Integração Causal e Causal Completeness Score (CCS) (Fase 5.6)

- **Status**: Aprovado pelo Architecture Decision Board (Principal Systems Architect, Quant Infrastructure Auditor, Event Sourcing Specialist, SRE Lead)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🏛️ 1. Contexto & Diagnóstico de Cobertura

Nas Fases 5.3 a 5.5, o **Lyzer Edge** definiu a arquitetura da Memória Causal, o contrato de eventos (ADR-007), o runtime (ADR-008) e implementou o módulo `src/causal-memory/` em paralelo.

A **Fase 5.6** realiza a auditoria sistemática de integração entre os componentes ativos do pipeline e o runtime causal para responder a duas perguntas fundamentais de governança:

> 1. *"Cada estágio do pipeline está emitindo eventos suficientes para reconstruir 100% da realidade percebida pelo agente?"*  
> 2. *"Qual é o Causal Completeness Score (CCS) atual do sistema?"*

---

## 📊 2. Causal Coverage Matrix (Matriz de Cobertura Causal)

| Processo / Módulo | Evento Produzido | Status de Cobertura | Dados Presentes | Dados Faltantes / Gap |
|---|---|---|---|---|
| **StreamEngine Ingestor** | `MARKET_OBSERVATION_RECEIVED` | **COVERED** | Klines, Volume, OpenTime, Symbol | Nenhum |
| **CSRL / InvariantExtractor** | `REALITY_RECONSTRUCTED` | **PARTIAL** | LHDS Score, Regime Inferred | Matriz de Tensores Float32 completa, parâmetros ativos do ScaleNormalizer |
| **SmcEngineFacade** | `FEATURE_GENERATED` | **MISSING** | - | OrderBlocks ativos, Zonas de Liquidez, Estrutura CHoCH/BOS |
| **TruthKernel** | `REGIME_INFERRED` | **COVERED** | Authority Level, Regime, EEF Flag | Parâmetros ativos de tolerância (Veto Limit, TRG Threshold) |
| **ECA Court / C-CLIST** | `CONSTITUTIONAL_JUDGMENT` | **COVERED** | Judgment Type, Evidence, Violated Constraint | Versão das regras da Corte, Histórico de transição MOL (SCL/DOI) |
| **RiskGateway Rust** | `RISK_ASSESSED` | **PARTIAL** | Intent ID, Authorized Flag | Limite diário de capital utilizado, razão de alavancagem |
| **ExchangeExecution** | `EXECUTION_RESULT` | **COVERED** | Order ID, Status, Fill Price, Executed Volume | Latência de broker/exchange IPC |
| **Feedback / PnL Loop** | `LEARNING_FEEDBACK` | **MISSING** | - | Tracking de PnL pós-fill e Slippage real |

---

## 🔬 3. Auditoria de Capacidade do Rewind Engine

Auditoria das 6 dimensões de reconstrução temporal histórica no estado atual do sistema:

| Dimensão de Reconstrução | Nível de Capacidade | Descrição |
|---|---|---|
| **A) Preço de Mercado** | **FULL** | Histórico $1m$ 100% auditável e reconstruível. |
| **B) Features & Invariantes** | **PARTIAL** | LHDS Score preservado, mas tensores brutos do CSRL necessitam de persistência. |
| **C) Classificação de Regime** | **FULL** | Transição de Regimes A..E 100% rastreável por UUIDv7. |
| **D) Decisões do Sistema** | **FULL** | Intenções e autorizações auditáveis. |
| **E) Motivo Constitucional** | **FULL** | Acórdão e evidências da Corte ECA gravados no payload. |
| **F) Consequências & PnL** | **PARTIAL** | Requer inclusão do evento `LEARNING_FEEDBACK` pós-fechamento de posição. |

---

## 📈 4. A Métrica Institucional: Causal Completeness Score (CCS)

Formalizamos no **ADR-009** a métrica institucional de integridade de memória:

$$\text{CCS} = \frac{\text{Eventos \& Contextos Epistemológicos Cobertos}}{\text{Total de Eventos \& Contextos Necessários para Reconstrução Total}} \times 100\%$$

### Apuração do CCS Atual do Lyzer Edge:

$$\text{CCS}_{\text{Atual}} = \frac{10 \text{ Mapeados}}{12 \text{ Necessários}} = \mathbf{83.3\%}$$

---

## 🛣️ 5. Plano de Elevação Incremental do CCS (Fase 5.6.1)

Para elevar o **CCS de 83.3% para 100%**, o plano de captura adicionará 3 novos pontos de contexto:
1. **Emissão de `FEATURE_GENERATED`**: Instrumentação do `SmcEngineFacade`.
2. **Persistência de Tensores CSRL em `REALITY_RECONSTRUCTED`**: Captura dos vetores do `ScaleNormalizer`.
3. **Emissão de `LEARNING_FEEDBACK`**: Captura do PnL e slippage real pós-fechamento de trade.
