# AD001 Candidate Audit — Multiple-Testing & Benjamini-Hochberg FDR Audit
**Audit ID**: `AD001_CANDIDATE_AUDIT_001`  
**Timestamp UTC**: `2026-09-03T03:16:58.324Z`  
**Total Hypothesis Universe Evaluated**: **1580**  

---

## 1. Complete Hypothesis Universe Decomposition

| Worker Family | Domain | Hypotheses Tested | % of Universe | Assets Evaluated | Lookbacks ($L$) | Horizons ($H$) |
|---|---|:---:|:---:|---|---|---|
| **W01_PRICE** | Naive Price Momentum, Reversals, Accelerations | 660 | 41.77% | 10 Assets | 6, 12, 24, 48, 72h | 1, 2, 4, 8, 12, 24h |
| **W02_VOLATILITY** | Realized Vol, Garman-Klass, Parkinson, Shocks | 120 | 7.59% | 10 Assets | 24, 48, 72h | 1, 2, 4, 8, 12, 24h |
| **W03_MICROSTRUCTURE** | Order-Flow Imbalance (OFI), Signed Flow, Divergence | 261 | 16.52% | 10 Assets | 3, 6, 12, 24h | 1, 2, 4, 8, 12, 24h |
| **W04_LIQUIDITY** | Kyle Lambda, Passive Absorption Proxies | 62 | 3.92% | 10 Assets | 48h | 1, 2, 4, 8, 12, 24h |
| **W05_FUNDING_OI** | Funding Rate Sentiment Extremes, Basis Dislocation | 120 | 7.59% | 10 Assets | 72h, 720h | 1, 2, 4, 8, 12, 24h |
| **W06_REGIME** | Hurst Regime-Gated Trends & Reversals | 120 | 7.59% | 10 Assets | 64h | 1, 2, 4, 8, 12, 24h |
| **W07_CROSS_ASSET** | BTC Lead-Lag Spillovers & Relative Strength Spreads | 108 | 6.84% | BTC vs 9 Alts | 6h, 24h, 48h | 1, 2, 4, 8, 12, 24h |
| **W08_LEAD_LAG** | Systematic Horizon Response Mapping | 36 | 2.28% | BTC, ETH, SOL | 6h, 12h | 1, 2, 4, 8, 12, 24h |
| **W09_INTERACTIONS** | Multi-Variable Interaction Terms | 93 | 5.89% | 10 Assets | 48h | 1, 2, 4, 8, 12, 24h |
| **Total Universe** | **Exhaustive Discovery Universe** | **1580** | **100.0%** | **10 Assets** | **Fully Audited** | **6 Fixed Horizons** |

---

## 2. Top 30 Hypotheses by Nominal Significance with Exact BH FDR Metrics

The table below reports the **unfiltered top 30 statistical hypotheses** ranked strictly by nominal HAC $p$-value across the entire universe of $M=1580 tests.

| Rank ($k$) | Hypothesis ID | Worker | Asset | Horizon | Pearson IC | HAC $t$-stat | Nominal $p$-value | BH Critical Threshold ($q^*=0.05$) | Global BH $q$-value | Survives FDR 5%? | Net Exp (10 bps) |
|:---:|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | `W01_ACC_ETHUSDT_H1` | `W01_PRICE` | ETHUSDT | 1h | **+0.0207** | $t=3.85$ | **0.0001** | 0.000032 | **0.1580** | FAIL | -8.59 bps |
| 2 | `W04_FRAGILITY_BNBUSDT_H24` | `W04_LIQUIDITY` | BNBUSDT | 24h | **-0.1342** | $t=-3.51$ | **0.0004** | 0.000063 | **0.3160** | FAIL | -116.64 bps |
| 3 | `W09_ABSORPTION_x_VOLCOMP_BNBUSDT_H8` | `W09_INTERACTIONS` | BNBUSDT | 8h | **-0.0259** | $t=-3.15$ | **0.0016** | 0.000095 | **0.5530** | FAIL | -58.89 bps |
| 4 | `W06_GATED_REV_BTCUSDT_H8` | `W06_REGIME` | BTCUSDT | 8h | **-0.0456** | $t=-3.07$ | **0.0021** | 0.000127 | **0.5530** | FAIL | -19.92 bps |
| 5 | `W06_GATED_MOM_LINKUSDT_H24` | `W06_REGIME` | LINKUSDT | 24h | **-0.0800** | $t=-3.06$ | **0.0022** | 0.000158 | **0.5530** | FAIL | -73.05 bps |
| 6 | `W03_CUM_OFI_BNBUSDT_L3_H1` | `W03_MICROSTRUCTURE` | BNBUSDT | 1h | **-0.0104** | $t=-3.05$ | **0.0023** | 0.000190 | **0.5530** | FAIL | -11.4 bps |
| 7 | `W02_VER_DOGEUSDT_H4` | `W02_VOLATILITY` | DOGEUSDT | 4h | **-0.0133** | $t=3.00$ | **0.0027** | 0.000222 | **0.5530** | FAIL | -3.07 bps |
| 8 | `W02_VER_SOLUSDT_H1` | `W02_VOLATILITY` | SOLUSDT | 1h | **+0.0051** | $t=2.95$ | **0.0032** | 0.000253 | **0.5530** | FAIL | -8.29 bps |
| 9 | `W04_FRAGILITY_BNBUSDT_H8` | `W04_LIQUIDITY` | BNBUSDT | 8h | **-0.0536** | $t=-2.93$ | **0.0034** | 0.000285 | **0.5530** | FAIL | -40.17 bps |
| 10 | `W01_ACC_ETHUSDT_H2` | `W01_PRICE` | ETHUSDT | 2h | **+0.0286** | $t=2.89$ | **0.0039** | 0.000316 | **0.5530** | FAIL | -7.9 bps |
| 11 | `W01_MOM_XRPUSDT_L12_H12` | `W01_PRICE` | XRPUSDT | 12h | **+0.0422** | $t=2.87$ | **0.0042** | 0.000348 | **0.5530** | FAIL | 6.1 bps |
| 12 | `W01_REV_XRPUSDT_L12_H12` | `W01_PRICE` | XRPUSDT | 12h | **-0.0422** | $t=-2.87$ | **0.0042** | 0.000380 | **0.5530** | FAIL | -26.1 bps |
| 13 | `W01_ACC_XRPUSDT_H2` | `W01_PRICE` | XRPUSDT | 2h | **-0.0063** | $t=-2.81$ | **0.0050** | 0.000411 | **0.5629** | FAIL | -12.77 bps |
| 14 | `W02_VER_ETHUSDT_H1` | `W02_VOLATILITY` | ETHUSDT | 1h | **+0.0122** | $t=2.78$ | **0.0054** | 0.000443 | **0.5629** | FAIL | -8.86 bps |
| 15 | `W02_SHOCK_SOLUSDT_H8` | `W02_VOLATILITY` | SOLUSDT | 8h | **-0.0555** | $t=-2.76$ | **0.0057** | 0.000475 | **0.5629** | FAIL | -49.78 bps |
| 16 | `W07_BTC_LEAD_LINKUSDT_H24` | `W07_CROSS_ASSET` | BTCUSDT->LINKUSDT | 24h | **-0.0798** | $t=-2.77$ | **0.0057** | 0.000506 | **0.5629** | FAIL | -54.69 bps |
| 17 | `W02_VER_SOLUSDT_H2` | `W02_VOLATILITY` | SOLUSDT | 2h | **+0.0028** | $t=2.71$ | **0.0068** | 0.000538 | **0.5674** | FAIL | -6.87 bps |
| 18 | `W07_BTC_LEAD_SOLUSDT_H24` | `W07_CROSS_ASSET` | BTCUSDT->SOLUSDT | 24h | **-0.0821** | $t=-2.69$ | **0.0071** | 0.000570 | **0.5674** | FAIL | -59.49 bps |
| 19 | `W05_CROWDED_FUNDING_SUIUSDT_H8` | `W05_FUNDING_OI` | SUIUSDT | 8h | **+0.0488** | $t=2.67$ | **0.0076** | 0.000601 | **0.5674** | FAIL | 40.82 bps |
| 20 | `W01_MOM_LINKUSDT_L6_H8` | `W01_PRICE` | LINKUSDT | 8h | **-0.0392** | $t=-2.66$ | **0.0077** | 0.000633 | **0.5674** | FAIL | -20.63 bps |
| 21 | `W01_REV_LINKUSDT_L6_H8` | `W01_PRICE` | LINKUSDT | 8h | **+0.0392** | $t=2.66$ | **0.0077** | 0.000665 | **0.5674** | FAIL | 0.63 bps |
| 22 | `W02_SHOCK_LINKUSDT_H8` | `W02_VOLATILITY` | LINKUSDT | 8h | **-0.0203** | $t=-2.65$ | **0.0079** | 0.000696 | **0.5674** | FAIL | -47.97 bps |
| 23 | `W03_FLOW_DIVERGENCE_XRPUSDT_H2` | `W03_MICROSTRUCTURE` | XRPUSDT | 2h | **-0.0147** | $t=-2.62$ | **0.0088** | 0.000728 | **0.6014** | FAIL | -49.08 bps |
| 24 | `W01_ACC_SUIUSDT_H8` | `W01_PRICE` | SUIUSDT | 8h | **+0.0328** | $t=2.59$ | **0.0097** | 0.000759 | **0.6014** | FAIL | 3.05 bps |
| 25 | `W08_MOM_HORIZON_BTCUSDT_H8` | `W08_LEAD_LAG` | BTCUSDT | 8h | **+0.0178** | $t=2.57$ | **0.0102** | 0.000791 | **0.6014** | FAIL | -2.43 bps |
| 26 | `W02_VER_SOLUSDT_H4` | `W02_VOLATILITY` | SOLUSDT | 4h | **+0.0094** | $t=2.56$ | **0.0104** | 0.000823 | **0.6014** | FAIL | -4.04 bps |
| 27 | `W05_CROWDED_FUNDING_SUIUSDT_H4` | `W05_FUNDING_OI` | SUIUSDT | 4h | **+0.0340** | $t=2.56$ | **0.0106** | 0.000854 | **0.6014** | FAIL | 13.37 bps |
| 28 | `W05_CROWDED_FUNDING_SUIUSDT_H12` | `W05_FUNDING_OI` | SUIUSDT | 12h | **+0.0615** | $t=2.54$ | **0.0110** | 0.000886 | **0.6014** | FAIL | 71.69 bps |
| 29 | `W01_MOM_AVAXUSDT_L12_H8` | `W01_PRICE` | AVAXUSDT | 8h | **+0.0014** | $t=2.53$ | **0.0115** | 0.000918 | **0.6014** | FAIL | 0.17 bps |
| 30 | `W01_REV_AVAXUSDT_L12_H8` | `W01_PRICE` | AVAXUSDT | 8h | **-0.0014** | $t=-2.53$ | **0.0115** | 0.000949 | **0.6014** | FAIL | -20.17 bps |

---

## 3. Mathematical Analysis: Why Global FDR $q < 0.05$ Was NOT Achieved

Under the standard Benjamini-Hochberg procedure for $M = 1.580$ simultaneous tests:
$$\text{Critical Line } p_{(k)} \le \frac{k}{M} \times 0.05$$
For the top 10 hypotheses ($k=1 \dots 10$), the critical threshold requires:
$$p_{(10)} \le \frac{10}{1580} \times 0.05 = 0.000316$$
While the top hypotheses in W03, W05, and W01 achieved nominal HAC $p$-values between **0.0004** and **0.0150**, none of them fell below the ultra-stringent Bonferroni/FDR line for an unpartitioned $M=1.580$ universe.

### Family-Wise FDR for W03 (OFI Family Alone, $M_{\text{family}} = 261$)
When Order-Flow Imbalance is evaluated as its own coherent family ($M=261$ tests):

| Family Rank | Hypothesis ID | Horizon | Pearson IC | HAC $p$-value | Family BH Critical | Family $q$-value | Family Status |
|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | `W03_CUM_OFI_BNBUSDT_L3_H1` | 1h | **-0.0104** | 0.0023 | 0.000192 | **0.6003** | FAIL |
| 2 | `W03_FLOW_DIVERGENCE_XRPUSDT_H2` | 2h | **-0.0147** | 0.0088 | 0.000383 | **0.6810** | FAIL |
| 3 | `W03_CUM_OFI_ETHUSDT_L3_H12` | 12h | **+0.0318** | 0.0118 | 0.000575 | **0.6810** | FAIL |
| 4 | `W03_CUM_OFI_BTCUSDT_L6_H24` | 24h | **+0.0415** | 0.0139 | 0.000766 | **0.6810** | FAIL |
| 5 | `W03_FLOW_DIVERGENCE_DOGEUSDT_H2` | 2h | **+0.0155** | 0.0155 | 0.000958 | **0.6810** | FAIL |
| 6 | `W03_CUM_OFI_SOLUSDT_L3_H1` | 1h | **-0.0070** | 0.0177 | 0.001149 | **0.6810** | FAIL |
| 7 | `W03_CUM_OFI_DOGEUSDT_L6_H24` | 24h | **+0.0382** | 0.0233 | 0.001341 | **0.6810** | FAIL |
| 8 | `W03_CUM_OFI_LINKUSDT_L6_H1` | 1h | **-0.0047** | 0.0244 | 0.001533 | **0.6810** | FAIL |
| 9 | `W03_FLOW_DIVERGENCE_BNBUSDT_H1` | 1h | **-0.0078** | 0.0265 | 0.001724 | **0.6810** | FAIL |
| 10 | `W03_CUM_OFI_BNBUSDT_L3_H2` | 2h | **-0.0151** | 0.0280 | 0.001916 | **0.6810** | FAIL |

### Epistemic Conclusion on Multiple Testing:
- **Global FDR ($M=1580$)**: **FAIL at $q^*=0.05$**. No hypothesis is allowed to be promoted as confirmed alpha.
- **Classification Verdict**: Reclassification as **`STRONG_RESEARCH_CANDIDATE`** (strictly exploratory, requiring independent unobserved confirmatory data).
