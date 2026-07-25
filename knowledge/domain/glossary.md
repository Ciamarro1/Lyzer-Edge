---
proposito: "Glossário oficial dos termos técnicos e epistêmicos do Lyzer Edge"
data_criacao: "2026-07-22"
ultima_atualizacao: "2026-07-22"
origem_dados:
  - "AGENTS.md"
  - "PROJECT.md"
  - "packages/lyzer-shared/src/engine/kernel.js"
nivel_confianca: "Alto"
pendencias_conhecidas: "Nenhuma"
---

# Glossário do Domínio Lyzer Edge

| Termo | Significado Técnico |
|---|---|
| **TRG (Tail Risk Geometry)** | Métrica geométrica que afere a presença de risco de cauda e assimetria no mercado. Exige $\text{TRG} \ge 0.4$ para liberar gatilho de execução. |
| **DVF (Divergence Vector Field)** | Vetor de divergência entre a liquidez percebida pelos provedores e a liquidez real de mercado. |
| **LHDS (Local Divergence Heterogeneity)** | Taxa de divergência entre instâncias de realidade dupla (dados ao vivo vs simulação paralela). |
| **EEF (Execution Eligibility Flag)** | Flag booleana emitida pelo `TruthKernel` indicando elegibilidade inicial de ordem. |
| **C-CLIST (Continuous CLIST)** | Oráculo de estresse epistêmico que calcula o risco do "Campo de Ilusão de Estabilidade". |
| **MOL (Meta-Observation Layer)** | Camada de meta-observação responsável por gerenciar a fase de recuperação (`RECOVERY`) pós-colapso ontológico. |
| **SCL (Stable Cycle Count)** | Número de ticks consecutivos de estabilidade exigidos pelo MOL antes de autorizar a reabertura de negociações. |
| **ECA (Epistemic Constitutional Arbitration)** | Sistema de arbitragem constitucional soberana que julga a validade das ordens. |
