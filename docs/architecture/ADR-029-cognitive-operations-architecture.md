# ADR-029: Cognitive Operations & System Telemetry Architecture

- **Status**: ACCEPTED
- **Date**: 2026-07-23
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

Com a conclusão da Fase 11 (Cognitive Market Organism Layer), o Lyzer Edge integrou 7 camadas de inteligência e governança adaptativa (Fases 5 a 11). O sistema calcula autonomamente múltiplos scores de saúde e risco:
- **CCS**: Causal Memory Completeness (Fase 5)
- **CES**: Causal Evidence Score (Fase 9)
- **EHS**: Evolution Health Score (Fase 7.4)
- **ARS**: Adaptive Risk Score (Fase 7.2)
- **CAS**: Cognitive Allocation Score (Fase 10)
- **MAS**: Market Adaptation Score (Fase 11)

Contudo, sem uma camada unificada de **Operações Cognitivas e Telemetria (Cognitive Operations)**, a interação entre esses 6 scores, os pipelines de execução e os gargalos de latência em tempo real permanece opaca para operadores institucionais.

### Problema

> "Adicionar mais camadas de inteligência sem visibilidade operacional transforma um sistema avançado em uma caixa-preta inobservável."

---

## Decision

Criar a camada **`src/cognitive-operations/`** contendo a **Fase 12 — Cognitive Operations Architecture**.

### Arquitetura da Telemetria Cognitiva

```
  ======================== COGNITIVE TELEMETRY STREAM ========================

       CCS            CES            EHS            ARS            CAS            MAS
   (Causal Mem)   (Evidence)     (Evolution)    (Adaptive Risk) (Allocation)   (Adaptation)
        │              │              │              │              │              │
        └──────────────┴──────────────┼──────────────┴──────────────┴──────────────┘
                                      │
                                      ▼
                        CognitiveTelemetryAggregator
                        (Unified System Health & Risk Pulse)
                                      │
                                      ▼
                           PipelineTracingEngine
                   (End-to-End Latency & Causal Tracing)
                                      │
                                      ▼
                        PerformanceProfilingMonitor
                   (RAM, CPU, Queue & Bottleneck Diagnostics)
```

### Módulos Principais

1. **`CognitiveTelemetryAggregator.js`**
   - Consolida em tempo real os 6 Scores Cognitivos (CCS, CES, EHS, ARS, CAS, MAS) em um pulso de saúde único do sistema (**Global Cognitive Health Index - GCHI**).

2. **`PipelineTracingEngine.js`**
   - Traca a jornada end-to-end de um tick desde a recepção de mercado, reconstrução causal, geração de hipóteses, validação empírica, aprovação constitucional, alocação de portfólio até a execução final.

3. **`PerformanceProfilingMonitor.js`**
   - Monitora latência por estágio de pipeline (ms), consumo de memória por heap SQLite/Node.js, frequência de GC e gargalos de processamento.

4. **`CognitiveOperationsFacade` (`index.js`)**
   - Interface unificada para exportação de métricas e status operacional para dashboards e APIs institucionais.

---

## Consequences

### Positivas
- Visibilidade total em tempo real sobre a saúde cognitiva, risco adaptativo e consumo de recursos.
- Capacidade de identificar gargalos de latência em qualquer sub-pipeline do sistema.
- Fundamentação sólida para escalar a infraestrutura (Fase 13 - Distributed Runtime).

### Negativas
- Leve sobrecarga de agregação de métricas (mitigado por amostragem por janela de tempo).
