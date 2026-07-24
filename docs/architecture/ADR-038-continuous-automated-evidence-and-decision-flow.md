# ADR-038: Continuous Automated Evidence & Decision Flow Architecture

- **Status**: ACCEPTED (INSTITUTIONAL EVIDENCE & RUNTIME PIPELINE)
- **Date**: 2026-07-24
- **Author**: Guardião da Arquitetura, Chief Scientist & Systems Auditor (`@[lyzer-guardian]`)

---

## 1. Contexto e Motivação

A auditoria independente do ecossistema **Lyzer Edge** confirmou a maturidade da arquitetura de 3 processos isolados, o desacoplamento por `StreamEngine` e o rigor da Corte Constitucional. Contudo, destacou uma oportunidade crítica de evolução:

> **"Afirmações categóricas como '164 testes passando', '0 vulnerabilidades' ou '0 race conditions' não devem ser estáticas. Elas devem ser comprovadas continuamente por automação e CI/CD."**

Este ADR estabelece a **Pipeline de Evidência Contínua**, o **Diagrama de Fluxo End-to-End em Runtime** e a **Árvore de Decisão Determinística (Decision Tree)**.

---

## 2. Diagrama de Fluxo End-to-End em Runtime

```mermaid
flowchart TD
    A[Exchange WebSocket / Binance Live] -->|1m..1d Candles| B[LiveDataIngestor]
    B -->|Timeframe Buffers| C[ScaleNormalizer & CSRL]
    C -->|Aligned Tensors| D[Signal Providers V1/V2/V3]
    D -->|Raw Trade Signal| E[ResidualizationLayer]
    E -->|Decoupled Consensus Signal| F[ExecutionTriggerLayer]
    F -->|TRG >= 0.4 Proposal| G[TruthKernel]
    G -->|LHDS & Ontological Status| H[C-CLIST Stress Oracle]
    H -->|Stability Field Status| I[Meta-Observation Layer MOL]
    I -->|EEF & SCL Verification| J[Constitutional Court]
    J -->|Permission Granted Token| K[RiskGateway gRPC]
    K -->|Order Intent Event| L[NATS JetStream Spine]
    L -->|Validated Order| M[Exchange Execution OMS]
    M -->|Filled Execution| N[Market Execution]

    J -.->|Permission Vetoed| O[Immutable Event Ledger Audit]
```

---

## 3. Árvore de Decisão Determinística (Decision Tree)

```mermaid
flowchart TD
    Start[Sinal Gerado pelos Signal Providers] --> Q1{Residualization OK?\nConsenso Destruído}
    Q1 -- Não --> V1[VETO: CONSENSUS_COLLUSION]
    Q1 -- Sim --> Q2{TRG >= 0.4?\nTail Risk Geometry}
    Q2 -- Não --> V2[VETO: TRG_BELOW_THRESHOLD]
    Q2 -- Sim --> Q3{LHDS <= Veto Limit?\nTruthKernel Check}
    Q3 -- Não --> V3[VETO: ONTOLOGICAL_COLLAPSE]
    Q3 -- Sim --> Q4{C-CLIST Stress OK?\nLethal Illusion < 0.9}
    Q4 -- Não --> V4[VETO: LETHAL_STABILITY_ILLUSION]
    Q4 -- Sim --> Q5{MOL Recovery Stable?\nSCL Ticks Approved}
    Q5 -- Não --> V5[VETO: MOL_UNSTABLE_STATE]
    Q5 -- Sim --> Q6{Court Approved?\nNo Arrogance / Confidence}
    Q6 -- Não --> V6[VETO: COURT_CONSTITUTIONAL_VETO]
    Q6 -- Sim --> Q7{Risk Engine OK?\nDaily Capital & RRR}
    Q7 -- Não --> V7[VETO: CAPITAL_EXCEEDED]
    Q7 -- Sim --> EXEC[EXECUTE ORDER AT OMS]
```

---

## 4. Pipeline de Evidência Contínua (Continuous Automated Evidence)

Para eliminar dependência de documentação estática, todas as métricas de integridade passam a ser comprovadas por infraestrutura automatizada:

```
GitHub Actions Workflow
 ├── 1. Security Scan (npm audit --audit-level=high & cargo audit)
 ├── 2. Code Quality & Lint (eslint . --max-warnings=0)
 ├── 3. Unit & Integration Tests (vitest run --coverage)
 ├── 4. Boundary & E2E Certification (npx tsx scripts/boundary-certification-suite.ts)
 └── 5. Dynamic Badge Generator (Test Status, Coverage %, Vulnerability Count)
```

---

## 5. Matriz de Maturidade Institucional (Roadmap v3.0 / Fase 5)

Para atingir a nota 10/10 e suporte a ambientes institucionais HFT, as seguintes capacidades estão em implementação:

1. **Observabilidade Nativa**: Exportador OpenTelemetry e `/metrics` Prometheus para dashboards Grafana.
2. **Replay Determinístico**: Leitura do Event Sourcing imutável para reprodução bit-a-bit de qualquer trade histórico.
3. **Chaos Engineering & Fault Injection**: Injeção automatizada de latência de rede, desconexões e lag no SQLite.
4. **Property-Based Testing**: Teste estocástico de invariantes de borda com geração aleatória de vetores de candles.

---

## 📜 Veredito Constitucional

> **"A evidência real não é um texto escrito em documento; é uma verificação automatizada que roda continuamente no pipeline CI/CD."**
