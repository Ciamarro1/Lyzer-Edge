# ETHUSDT — Direct Replication Evaluation Report
**Audit Program**: `OFI-CONFIRMATION-SETUP-001`  
**Dataset**: Historical Untouched Replication Set (`2020-01-01` to `2022-12-31`)  
**Sample Size ($N$)**: 1094 non-overlapping daily observations  
**Role**: Direct Cross-Asset Replication (ETH L6/H24)  

---

## 1. Linear Correlation & Primary Permutation Test

| Metric | Observed Value | Pre-Registered Threshold | Status |
|---|:---:|:---:|:---:|
| **Pearson IC** | **-0.0266** | $\ge +0.020$ | ❌ FAIL |
| **Primary Block Permutation ($B=10$)** | **$p = 0.3566$** | $< 0.05$ | ❌ FAIL |
| **Newey-West HAC $t$-statistic** | **$t = -1.02$** | $> 1.96$ | ❌ FAIL |

### Diagnostic Sensitivity Grid for Block Length ($B$)
- **Block $B = 5$ days**: $p = 0.3776$
- **Block $B = 10$ days (Primary)**: **$p = 0.3566$**
- **Block $B = 20$ days**: $p = 0.4166$
- **Block $B = 30$ days**: $p = 0.3776$

---

## 2. Incremental Information Model (Model 0 vs Model 1)

$$\text{Model 0 (Price Momentum Only): } R_{t, t+24h} = \alpha_0 + \beta_{\text{price}} R_{t-6h, t} + \epsilon_t$$
$$\text{Model 1 (Price + OFI): } R_{t, t+24h} = \alpha_1 + \beta_{\text{price}} R_{t-6h, t} + \beta_{\text{OFI}} \text{CumOFI}_t(6h) + \eta_t$$

- **Model 0 $R^2$**: 0.959\%$
- **Model 1 $R^2$**: 0.984\%$
- **Incremental $\Delta R^2$**: 0.025\%$
- **$\beta_{\text{OFI}}$**: **0.0233** (SE: 0.0461, $t_{\text{HAC}} = 0.51$)
- **Status**: ❌ NO INCREMENTAL INFORMATION

---

## 3. Economic Execution & Cost Curve

- **Total Trades (|CumOFI| > 0.05)**: 217 (19.8% of sample)
- **Arithmetic Mean Net Return per Trade**: **-47.82 bps**
- **95% HAC Confidence Interval**: [-111.76 bps, 16.11 bps]
- **Median Net Return**: -52 bps
- **Hit Rate**: 41.9%
- **Profit Factor**: 0.76

### Cost Sensitivity Table
| Friction (bps round-trip) | Mean Net Return per Trade (bps) | Hit Rate (%) |
|:---:|:---:|:---:|
| 0 bps | -37.82 bps | 42.9% |
| 5 bps | -42.82 bps | 42.4% |
| 10 bps | -47.82 bps | 41.9% |
| 15 bps | -52.82 bps | 41.9% |
| 20 bps | -57.82 bps | 40.6% |
| 25 bps | -62.82 bps | 40.1% |
| 30 bps | -67.82 bps | 39.2% |
