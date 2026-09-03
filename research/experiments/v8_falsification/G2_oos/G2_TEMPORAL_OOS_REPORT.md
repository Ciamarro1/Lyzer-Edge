# Gate G2 — Temporal Out-Of-Sample Validation Report
**Document ID**: `G2_TEMPORAL_OOS_REPORT_v2_1`  
**Campaign**: `LYZER_EDGE_V8_FREEZE_FALSIFICATION_OOS`  
**Engine Under Audit**: `InstitutionalQuantSignalEngine` (V8, SHA-256: `fc19e807...`)  
**Gate Decision**: **FAIL**  
**Timestamp UTC**: `2026-09-03T02:00:19.504Z`  

---

## 1. Executive Summary
Gate G2 evaluates the frozen V8 engine across a strict temporal Chinese Wall separating 24 calendar months of In-Sample reference history (17,544 bars, 2023–2024 including leap year) from ~20 calendar months of blind Out-Of-Sample forward history (14,492 bars, 2025–2026), with a 100-bar embargo buffer.

- **In-Sample Period**: 17,544 bars (2023-01-01T00:00Z to 2024-12-31T23:00Z).
- **Chinese Wall Embargo**: 100 bars (2025-01-01T00:00Z to 2025-01-05T03:00Z). Zero feature/trade overlap.
- **Out-Of-Sample Period**: 14,492 bars (2025-01-05T04:00Z to 2026-08-31T23:00Z).
- **Inference Model**: Newey-West HAC covariance estimation ($L=5$ lags) robust to residual temporal dependence.
- **Friction Model**: Strictly fixed exogenous 10 bps round-trip friction applied to all trades.
- **IC Retention Definition**: Requires $IC_{\text{IS}} > 0 \;\land\; IC_{\text{OOS}} > 0 \;\land\; \frac{IC_{\text{OOS}}}{IC_{\text{IS}}} \ge 0.30$.

---

## 2. In-Sample vs Out-Of-Sample Performance Matrix

| Performance Metric | In-Sample (24 Months, 17,544 Bars) | Out-Of-Sample (~20 Months, 14,492 Bars) | Gate Acceptance Threshold | OOS Evaluation |
|---|:---:|:---:|:---:|:---:|
| **Observation Bars** | 17480 | 14428 | $\ge 10,000$ bars | **ADEQUATE** |
| **Non-Overlapping Trades** | 56 | 25 | $\ge 30$ trades | **ADEQUATE** |
| **Market Exposure** | 3.35% | 2.29% | Institutional Low Exposure | **PRESERVED** |
| **Net Hit Rate (after 10 bps)** | 37.50% | 52.00% | $\ge 50.0\%$ | **PASS** |
| **Gross Mean Return** | -0.131% | 0.397% | $> 0$ | **PASS** |
| **Net Mean Return (after 10 bps)** | -0.231% | 0.297% | $> 0$ (Profitable net) | **PASS** |
| **Net Expectancy** | -23.08 bps | 29.7 bps | $> 0$ bps | **PASS** |
| **Profit Factor** | 0.65 | 1.47 | $> 1.00$ | **PASS** |
| **Information Coefficient (IC)** | -0.1175 (HAC $p=0.181$) | 0.1976 (HAC $p=0.317$) | $> 0, p_{\text{HAC}} < 0.05$ | **FAIL** |
| **IC 95% Confidence Interval** | [-0.369, 0.150] | [-0.214, 0.550] | Excludes negative | **MODERATE** |
| **Continuous Strategy Sharpe** | -0.66 | 0.05 | $> 0$ | **PASS** |
| **Continuous Max Drawdown** | 44.47% | 25.49% | $< 35.0\%$ | **PASS** |
| **IC Retention Ratio (OOS / IS)** | 100% (Baseline) | NOT EVALUABLE | $\ge 30.0\%$ (requiring IS > 0) | **FAIL** |

---

## 3. Methodological Audit & Scientific Verdict
V8 failed to satisfy one or more mandatory out-of-sample criteria. Edge not detected on unseen temporal regimes.

**Gate G2 Verdict**: **FAIL**.
