# W01_PRICE — Price Dynamics Discovery Worker Summary
**Worker**: `W01_PRICE`  
**Timestamp UTC**: `2026-09-03T02:41:41.910Z`  
**Total Hypotheses Tested**: 660  
**Candidates Discovered**: 5  
**Rejected Hypotheses**: 655  
**Execution Duration**: 10769ms  

---

## Top Discovered Price Candidates

| Hypothesis ID | Mechanism | Asset | Lookback | Horizon | Pearson IC | HAC $t$-stat ($p$-val) | Net Expectancy (10 bps) | Classification |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `W01_MOM_XRPUSDT_L12_H12` | Time-Series Momentum | XRPUSDT | 12h | 12h | **0.0422** | $t=2.87$ ($p=0.004$) | **6.1 bps** | **DISCOVERY_CANDIDATE** |
| `W01_REV_LINKUSDT_L6_H8` | Short-Term Mean Reversion | LINKUSDT | 6h | 8h | **0.0392** | $t=2.66$ ($p=0.008$) | **0.63 bps** | **DISCOVERY_CANDIDATE** |
| `W01_ACC_SUIUSDT_H8` | Return Acceleration (Second Derivative of Log Price) | SUIUSDT | 24h | 8h | **0.0328** | $t=2.59$ ($p=0.010$) | **3.05 bps** | **DISCOVERY_CANDIDATE** |
| `W01_MOM_XRPUSDT_L12_H24` | Time-Series Momentum | XRPUSDT | 12h | 24h | **0.0325** | $t=1.99$ ($p=0.047$) | **11.48 bps** | **DISCOVERY_CANDIDATE** |
| `W01_MOM_AVAXUSDT_L12_H8` | Time-Series Momentum | AVAXUSDT | 12h | 8h | **0.0014** | $t=2.53$ ($p=0.011$) | **0.17 bps** | **WEAK_CANDIDATE** |
