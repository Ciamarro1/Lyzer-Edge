# BTCUSDT — Primary Confirmatory Evaluation Report
**Audit Program**: `OFI-CONFIRMATION-SETUP-001`  
**Dataset**: Historical Untouched Replication Set (`2020-01-01` to `2022-12-31`)  
**Sample Size ($N$)**: 1094 non-overlapping daily observations  
**Role**: Central Hypothesis Test (BTC L6/H24)  

---

## 1. Linear Correlation & Primary Permutation Test

| Metric | Observed Value | Pre-Registered Threshold | Status |
|---|:---:|:---:|:---:|
| **Pearson IC** | **+0.056** | $\ge +0.020$ | ✅ PASS |
| **Primary Block Permutation ($B=10$)** | **$p = 0.0599$** | $< 0.05$ | ❌ FAIL |
| **Newey-West HAC $t$-statistic** | **$t = 2.25$** | $> 1.96$ | ✅ PASS |

### Diagnostic Sensitivity Grid for Block Length ($B$)
- **Block $B = 5$ days**: $p = 0.0519$
- **Block $B = 10$ days (Primary)**: **$p = 0.0599$**
- **Block $B = 20$ days**: $p = 0.0649$
- **Block $B = 30$ days**: $p = 0.0619$

---

## 2. Incremental Information Model (Model 0 vs Model 1)

$$\text{Model 0 (Price Momentum Only): } R_{t, t+24h} = \alpha_0 + \beta_{\text{price}} R_{t-6h, t} + \epsilon_t$$
$$\text{Model 1 (Price + OFI): } R_{t, t+24h} = \alpha_1 + \beta_{\text{price}} R_{t-6h, t} + \beta_{\text{OFI}} \text{CumOFI}_t(6h) + \eta_t$$

- **Model 0 $R^2$**: 0.889\%$
- **Model 1 $R^2$**: 1.905\%$
- **Incremental $\Delta R^2$**: 1.016\%$
- **$\beta_{\text{OFI}}$**: **0.1134** (SE: 0.0373, $t_{\text{HAC}} = 3.04$)
- **Status**: ✅ INCREMENTAL INFORMATION CONFIRMED

---

## 3. Economic Execution & Cost Curve

- **Total Trades (|CumOFI| > 0.05)**: 202 (18.5% of sample)
- **Arithmetic Mean Net Return per Trade**: **+14.17 bps**
- **95% HAC Confidence Interval**: [-34.29 bps, 62.63 bps]
- **Median Net Return**: -33.95 bps
- **Hit Rate**: 45%
- **Profit Factor**: 1.13

### Cost Sensitivity Table
| Friction (bps round-trip) | Mean Net Return per Trade (bps) | Hit Rate (%) |
|:---:|:---:|:---:|
| 0 bps | +24.17 bps | 47% |
| 5 bps | +19.17 bps | 46.5% |
| 10 bps | +14.17 bps | 45% |
| 15 bps | +9.17 bps | 44.1% |
| 20 bps | +4.17 bps | 42.6% |
| 25 bps | -0.83 bps | 41.6% |
| 30 bps | -5.83 bps | 41.1% |
