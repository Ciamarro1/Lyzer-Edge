---
proposito: "Mapeamento detalhado do pipeline de decisão quantitativa de 7 camadas"
data_criacao: "2026-07-22"
ultima_atualizacao: "2026-07-22"
origem_dados:
  - "AGENTS.md"
  - "lyzer edge/backend/streamEngine.js"
  - "packages/lyzer-constitution/src/eca/court.js"
nivel_confianca: "Alto"
pendencias_conhecidas: "Nenhuma"
---

# Pipeline de Decisão Quantitativa (7 Camadas)

Para que uma ordem chegue ao mercado, ela deve obrigatoriamente satisfazer todas as 7 camadas de governança em ordem estrita:

```mermaid
graph TD
    C1[1. Signal Providers - V1/V2/V3] --> C2[2. ResidualizationLayer - Consensus Destruction]
    C2 --> C3[3. ExecutionTriggerLayer - TRG >= Threshold]
    C3 --> C4[4. TruthKernel - LHDS Veto & Ontological Check]
    C4 --> C5[5. C-CLIST - Stress Oracle]
    C5 --> C6[6. MOL - Meta-Observation SCL Recovery]
    C6 --> C7[7. Constitutional Court - Final ECA Authorization]
    C7 -->|Permission Token Granted| EXEC[Market Execution]
    C7 -->|Permission Token Denied| VETO[Audit Log & Rejection]
```

## Resumo das Camadas

1. **Providers (V1/V2/V3)**: Geram propostas de sinal a partir de SMC, SnD e Momentum/RSI.
2. **ResidualizationLayer**: Destrói consensos acidentais entre os provedores para evitar o efeito manada.
3. **ExecutionTriggerLayer**: Exige que a Tail Risk Geometry ($\text{TRG}$) atinja o limiar mínimo (padrão 0.4).
4. **TruthKernel**: Interrompe o fluxo se a divergência de realidade dupla ($\text{LHDS}$) ultrapassar o limite (padrão 0.8) ou se houver colapso ontológico.
5. **C-CLIST**: Acumula estresse de iludibilidade quando a divergência de vetor de liquidez ($\text{DVF}$) estabiliza em níveis rasos, vetando ordens se o acúmulo atingir o `lethalIllusionLimit` (0.9).
6. **MOL (Meta-Observation Layer)**: Exige $N$ ticks consecutivos de estabilidade ($\text{SCL}$) para permitir a transição fora do estado de recuperação (`RECOVERY`).
7. **Constitutional Court**: Gate soberano. Verifica o axioma "The Court shall never learn", valida EEF e emite o `PermissionToken` com o resultado final.
