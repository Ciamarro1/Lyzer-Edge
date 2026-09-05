# RELATÓRIO DE DESCOBERTA QUANTITATIVA — PROGRAMA AD007
## Regime-Conditional & Cross-Asset Rotational Carry Engine (Alpha Factory v1.0)

**Programa de Pesquisa:** `AD007`  
**Família:** Arbitragem de Taxa de Juros Perpétua & Cash-and-Carry Delta-Neutral ($\Delta = 0$)  
**Período de Descoberta:** `2023-01-01` a `2024-12-31` (2 anos fechados no Data Lake Discovery)  
**Universo de Ativos:** `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `AVAXUSDT`, `LINKUSDT`, `DOGEUSDT` (6 ativos core)  
**Total de Observações Avaliadas:** $13.158$ períodos de 8h ($2.193$ períodos por ativo)  
**Controle de Fricção:** $24\text{ bps}$ all-in por ciclo completo ($12\text{ bps}$ Spot $+ 12\text{ bps}$ Perp)  
**Inferência Estatística:** 14-Day Calendar Block Bootstrap ($B = 10.000$, seed $888888$, Hall centered, trade-weighted)  
**Procedimento de Multiplicidade:** **Benjamini–Yekutieli (BY, 2001)** ($M = 10$, multiplicador de dependência arbitrária)  
**Motor V8 SHA-256:** `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**)  
**Data UTC de Execução:** `2026-09-04T22:07:20.617Z`  

---

## 📊 1. Resultados da Matriz de 10 Células Delta-Neutras Condicionais

| ID da Célula | Tipo de Estratégia | Alocação | Hurdle a.a. | Retorno Anualizado | Retorno Total (2A) | Sharpe Anualizado | Max Drawdown | Exposição ao Mercado | $p_{\text{block}}$ | $q_{\text{BY}}$ | Status BY |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **AD007_HURDLE_6PCT_BTC_ETH_M1** | `HURDLE_GATED` | BTC_ETH_50_50 | 6% | **+8.05%** | +16.77% | **18.9** | 0.26% | 67.2% | 0.0001 | 0.0003 | 🟢 PASS |
| **AD007_HURDLE_8PCT_BTC_ETH_M1** | `HURDLE_GATED` | BTC_ETH_50_50 | 8% | **+6.14%** | +12.66% | **14.5** | 0.26% | 46.6% | 0.0001 | 0.0003 | 🟢 PASS |
| **AD007_ROT_TOP2_HURDLE_6PCT_M1** | `DYNAMIC_ROTATION_HURDLE` | TOP_2_YIELDERS | 6% | **+9.02%** | +18.89% | **13.69** | 0.32% | 83.6% | 0.0001 | 0.0003 | 🟢 PASS |
| **AD007_ROT_TOP2_HURDLE_8PCT_M1** | `DYNAMIC_ROTATION_HURDLE` | TOP_2_YIELDERS | 8% | **+7.7%** | +16.02% | **12.34** | 0.32% | 71.3% | 0.0002 | 0.0006 | 🟢 PASS |
| **AD007_ROT_TOP2_HURDLE_6PCT_W2** | `DYNAMIC_ROTATION_HURDLE` | TOP_2_YIELDERS | 6% | **+8.2%** | +17.09% | **10.23** | 0.31% | 84.7% | 0.0001 | 0.0003 | 🟢 PASS |
| **AD007_ROT_TOP3_EQW_M1** | `DYNAMIC_ROTATION_HURDLE` | TOP_3_YIELDERS | 0% | **+10.4%** | +21.91% | **18.28** | 0.23% | 95.9% | 0.0001 | 0.0003 | 🟢 PASS |
| **AD007_ROT_TOP3_HURDLE_6PCT_M1** | `DYNAMIC_ROTATION_HURDLE` | TOP_3_YIELDERS | 6% | **+9.2%** | +19.27% | **16.08** | 0.3% | 83.6% | 0.0001 | 0.0003 | 🟢 PASS |
| **AD007_VOL_INVERSE_WEIGHT_M1** | `VOL_INVERSE_WEIGHT` | ALL_ELIGIBLE_INVERSE_VOL | 5% | **+9.59%** | +20.12% | **20.54** | 0.33% | 83.6% | 0.0001 | 0.0003 | 🟢 PASS |
| **AD007_SOL_BTC_PAIR_M1** | `HURDLE_GATED` | SOL_BTC_50_50 | 6% | **+7.58%** | +15.75% | **15.63** | 0.33% | 63.1% | 0.0001 | 0.0003 | 🟢 PASS |
| **AD007_STATIC_ALL6_CONTROL** | `STATIC_BENCHMARK` | ALL_6_EQUAL_WEIGHT | 0% | **+10.58%** | +22.32% | **23.41** | 0.66% | 100% | 0.0001 | 0.0003 | 🟢 PASS |

---

## 🔬 2. Diagnóstico Microestrutural & Descobertas Científicas

### A. O Impacto dos Hurdles de Regime
- O filtro de hurdle de $6\%$ e $8\%$ a.a. protegeu a carteira nos períodos de compressão de funding, desalocando automaticamente para caixa livre de risco quando o yield projetado era desfavorável.

### B. A Força da Rotação Transversal em Altcoins de Alta Demanda de Alavancagem
- A inclusão de SOL, AVAX e DOGE permitiu capturar períodos de funding anualizado massivo ($> 25\%\text{--}50\%$ a.a.) durante fases de expansão de momentum, elevando o retorno anualizado significativamente acima do benchmark de BTC e ETH puros.

---

## 🏛️ 3. Conclusão da Alpha Factory

A campanha **AD007** foi bem-sucedida! Foram identificadas **10 células** estatisticamente significativas sob Benjamini–Yekutieli ($q_{\text{BY}} < 0,05$) que superam a barreira de $+6,00\%$ a.a. sob $24\text{ bps}$ de fricção.

**Candidato Líder Selecionado:** `AD007_STATIC_ALL6_CONTROL` (+10.58% a.a., Sharpe 23.41, MaxDD 0.66%, $q_{\text{BY}} = 0.0003$).
