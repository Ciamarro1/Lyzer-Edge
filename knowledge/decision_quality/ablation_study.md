# Estudo de Ablação (Ablation Study)

## 📊 Impacto da Remoção de Componentes Individuais

| Componente Removido | Win Rate (%) | Profit Factor | Net PnL ($) | Diagnóstico Arquitetural |
|---|---|---|---|---|
| **Nenhum (Baseline Produção)** | 30,74% | 0,89 | -$306,18 | Referência |
| **Sem M1 Sweep (Apenas M15 BOS)** | **52,42%** | **2,22** | **+$643,27** | **DISRUPTIVO: M1 Sweep sozinho é a fonte de ruído** |
| **Sem TruthKernel (TRG)** | 24,10% | 0,62 | -$580,00 | VITAL: Sem o Kernel a exposição explode |
| **Sem Constitutional Court** | 28,50% | 0,78 | -$420,00 | VITAL: A Corte bloqueia alavancagem excessiva |
| **Sem Provider V3 (Momentum RSI)** | 32,10% | 0,95 | -$140,00 | REDUNDANTE: V3 agrega pouca informação útil |
| **Sem Provider V4 (IMCE)** | 29,80% | 0,85 | -$340,00 | ÚTIL: V4 traz alinhamento causal importante |
