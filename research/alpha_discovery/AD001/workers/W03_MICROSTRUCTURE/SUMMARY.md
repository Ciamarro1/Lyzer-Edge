# W03_MICROSTRUCTURE — Microstructure & Order-Flow Worker Summary
**Worker**: `W03_MICROSTRUCTURE`  
**Timestamp UTC**: `2026-09-03T02:41:36.170Z`  
**Total Hypotheses Tested**: 261  
**Candidates Discovered**: 6  
**Rejected Hypotheses**: 255  
**Execution Duration**: 5018ms  

---

## Top Discovered Microstructure Candidates

| Hypothesis ID | Mechanism | Asset | Lookback | Horizon | Pearson IC | HAC $t$-stat ($p$-val) | Net Expectancy (10 bps) | Classification |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `W03_CUM_OFI_BTCUSDT_L6_H24` | Aggressive Order Flow Imbalance Momentum | BTCUSDT | 6h | 24h | **0.0415** | $t=2.46$ ($p=0.014$) | **25.37 bps** | **DISCOVERY_CANDIDATE** |
| `W03_CUM_OFI_DOGEUSDT_L6_H24` | Aggressive Order Flow Imbalance Momentum | DOGEUSDT | 6h | 24h | **0.0382** | $t=2.27$ ($p=0.023$) | **43.2 bps** | **DISCOVERY_CANDIDATE** |
| `W03_CUM_OFI_ETHUSDT_L3_H12` | Aggressive Order Flow Imbalance Momentum | ETHUSDT | 3h | 12h | **0.0318** | $t=2.52$ ($p=0.012$) | **9.86 bps** | **DISCOVERY_CANDIDATE** |
| `W03_CUM_OFI_SOLUSDT_L12_H8` | Aggressive Order Flow Imbalance Momentum | SOLUSDT | 12h | 8h | **0.0278** | $t=2.02$ ($p=0.043$) | **20.02 bps** | **WEAK_CANDIDATE** |
| `W03_CUM_OFI_SOLUSDT_L24_H4` | Aggressive Order Flow Imbalance Momentum | SOLUSDT | 24h | 4h | **0.0249** | $t=2.12$ ($p=0.034$) | **15.17 bps** | **WEAK_CANDIDATE** |
| `W03_FLOW_DIVERGENCE_DOGEUSDT_H2` | Aggressor Trapping Flow-Price Divergence | DOGEUSDT | 1h | 2h | **0.0155** | $t=2.42$ ($p=0.015$) | **24.98 bps** | **WEAK_CANDIDATE** |
