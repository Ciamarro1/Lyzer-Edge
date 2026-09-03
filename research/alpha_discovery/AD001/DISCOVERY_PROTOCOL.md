# Alpha Discovery 001 — Research Protocol & Operational Specification
**Campaign**: `ALPHA_DISCOVERY_001`  
**Governance Authority**: Alpha Discovery Research Orchestrator / Institutional Quant Standards  
**Target Universe**: Major Cryptocurrencies (BTC, ETH, SOL, BNB, DOGE, ADA, AVAX, LINK, SUI, XRP)  
**Primary Timeframe**: 1-hour ($1h$) continuous trading bars (2023-01-01 to 2026-08-31)  
**Timestamp UTC**: `2026-09-03T02:38:00.000Z`  
**Classification Authority**: Exploratory Discovery Only (Zero Confirmed Alpha Claims)  

---

## 1. Executive Charter & Purpose
This document establishes the scientific, methodological, and computational rules for campaign `ALPHA_DISCOVERY_001`.

The objective of this campaign is to conduct a systematic, parallelized, multi-worker exploration of observable economic phenomena across price, volatility, microstructure order-flow, liquidity absorption, funding, cross-asset spillover, and regime interactions, to discover incremental predictive information on future returns without p-hacking, selection bias, or data snooping.

### Absolute Governance Constraints
1. **Separation of Discovery and Confirmation**: This campaign is strictly exploratory. Candidates that pass all discovery filters are classified at most as `PROMOTION_CANDIDATE` for subsequent independent pre-registration and blind OOS testing. No candidate is ever declared as "confirmed alpha".
2. **Zero Modification to V8**: The engine file `packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js` remains frozen (`fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`).
3. **Zero Silent Prompt / Hypothesis Patching**: Every tested hypothesis is pre-declared, logged, and included in the multiple-testing accounting registry. Negative results are never hidden.
4. **Worker Isolation**: Each hypothesis family operates inside its dedicated directory (`workers/Wxx/`) with deterministic seeds and immutable inputs.

---

## 2. Dataset Universe
Validated by `DATASET_CATALOG.md` and `DATASET_MANIFEST.json`:
- **Core 1h Universe (10 Assets)**: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, DOGEUSDT, ADAUSDT, AVAXUSDT, LINKUSDT, SUIUSDT, XRPUSDT.
- **Continuous Horizon**: 32,136 hourly bars per asset (44 continuous months: 2023-01-01 to 2026-08-31).
- **Available Fields**: Open, High, Low, Close, Volume, Trades, Taker Buy Volume, Taker Buy Quote Volume, Funding Rates, Mark Prices.
- **Causality Rule**: At timestamp $t$, feature calculation $f_t = g(X_{\le t})$ consumes strictly historical data up to candle $t-1$. Zero future information is accessible.

---

## 3. The 10 Specialized Worker Hypotheses Families

### W01 — Price Dynamics
- **Mechanisms**: Momentum, Mean Reversion, Acceleration, Residualized Distance from Rolling Equilibrium.
- **Formulations**:
  - $Mom(L) = \ln(C_t / C_{t-L})$, $L \in \{6, 12, 24, 48, 72\}$.
  - Return Acceleration: $\Delta Mom = Mom(12) - Mom(24)$.
  - Distance from EMA-48 / rolling equilibrium normalized by ATR.

### W02 — Volatility Dynamics
- **Mechanisms**: Realized Volatility, Parkinson High-Low Vol, Garman-Klass Micro-Variance, Volatility Expansion/Contraction Ratio.
- **Formulations**:
  - Garman-Klass Volatility: $\sigma_{GK} = \sqrt{\frac{1}{L}\sum [0.5\ln(H/L)^2 - (2\ln 2 - 1)\ln(C/O)^2]}$.
  - Vol Expansion Ratio: $VER = \frac{\sigma_{GK, 6}}{\sigma_{GK, 48}}$.
  - Vol Shock: $z_{\sigma} = \frac{\sigma_{GK} - \mu_{\sigma}}{\sigma_{\sigma}}$.

### W03 — Microstructure & Order Flow Imbalance
- **Mechanisms**: Taker Aggressor Imbalance, Signed Volume Flow, Trade Intensity, Flow Exhaustion.
- **Formulations**:
  - Order-Flow Imbalance: $OFI_t = \frac{\text{TakerBuyVol}_t - \text{TakerSellVol}_t}{\text{TotalVol}_t} \in [-1, +1]$.
  - Cumulative OFI Z-Score: $z_{OFI} = \frac{\sum_{k=0}^{L-1} OFI_{t-k} - \mu}{\sigma}$.
  - Flow-Return Divergence: $\text{sign}(OFI_t) \ne \text{sign}(\Delta \ln C_t)$.

### W04 — Liquidity & Passive Absorption
- **Mechanisms**: Volume-to-Price Displacement (Kyle's $\lambda$), Absorption Detection (High aggressive flow with low price displacement).
- **Formulations**:
  - Displacement Inefficiency: $DI_t = \frac{|\Delta \ln C_t|}{\text{Volume}_t / \text{AvgVolume}_{48}}$.
  - Passive Absorption Proxy: High $|OFI_t| > 1.5\sigma$ with low $|\Delta \ln C_t| < 0.5\sigma_{\text{price}}$, indicating aggressive liquidity absorbed by iceberg limit orders.

### W05 — Funding Rates & Basis Dynamics
- **Mechanisms**: Perpetual Funding Extremes, Funding Velocity, Basis Spread.
- **Formulations**:
  - Funding Rate Z-score: $z_{\text{funding}} = \frac{FR_t - \text{Mean}(FR, 90d)}{\text{Std}(FR, 90d)}$.
  - Basis Spread: $\text{Basis}_t = \frac{\text{MarkPrice}_t - \text{Close}_t}{\text{Close}_t}$.

### W06 — Market Regime Conditioning
- **Mechanisms**: Hurst Exponent Variance Ratio ($H < 0.45$ Mean Reverting, $0.45 \le H \le 0.55$ Random Noise, $H > 0.55$ Trending), Volatility Quintiles.

### W07 — Cross-Asset Spillovers & Dispersion
- **Mechanisms**: BTC-led momentum transmission to ETH and SOL, Cross-Asset Relative Strength, Lead-Lag Divergence.

### W08 — Temporal Lead/Lag Horizon Mapping
- **Fixed Horizons**: $H \in \{1h, 2h, 4h, 8h, 12h, 24h\}$.
- Entire response curves $IC(H)$ are mapped to establish the exact physical life-cycle of candidate signals.

### W09 — Conditional Economic Interactions
- **Mechanisms**: Absorption conditioned on Volatility Contraction, OFI conditioned on Hurst Regime, Funding Extremes conditioned on Trend Exhaustion.

### W10 — Robustness Controls & Null Tests
- **Controls**: Temporal Shuffle, Sign Permutation, Block Shuffle (blocks of 10 bars), Paired Random Direction baseline.

---

## 4. Multi-Cost Sensitivity Grid
Every signal candidate is evaluated across four exogenous round-trip cost tiers:
$$\text{Friction} \in \{0\text{ bps}, 5\text{ bps}, 10\text{ bps}, 20\text{ bps}\}$$
Candidates that degrade to negative net expectancy at 10 bps are flagged or rejected.

---

## 5. Multiple Testing Control (Benjamini-Hochberg FDR)
Every individual hypothesis test $(i = 1 \dots M)$ is cataloged with its nominal $p$-value:
1. Sort $p_{(1)} \le p_{(2)} \le \dots \le p_{(M)}$.
2. Compute Benjamini-Hochberg critical threshold: $p_{(k)} \le \frac{k}{M} \times q^*$, with false discovery rate $q^* = 0.05$.
3. Assign adjusted $q$-values across all candidate discoveries.

---

## 6. Formal Criteria for Candidate Classification

| Category | Mandatory Conditions |
|---|---|
| `PROMOTION_CANDIDATE` | 1. Plausible economic mechanism (causal, zero lookahead).<br>2. $|IC| \ge 0.03$ with Newey-West HAC $p < 0.01$ and FDR $q < 0.05$.<br>3. Net Expectancy $> 0$ at 10 bps round-trip friction.<br>4. Multi-asset stability (holds across at least 3 distinct assets).<br>5. Regime robustness (does not invert in opposing regimes).<br>6. Survives null/placebo controls ($p_{\text{null}} < 0.01$). |
| `DISCOVERY_CANDIDATE` | $|IC| \ge 0.02$ with $p_{\text{HAC}} < 0.05$, Net Expectancy $> 0$ at 5 bps friction, but limited cross-asset breadth. |
| `WEAK_CANDIDATE` | Statistically detectable correlation ($p < 0.05$), but eliminated by 5 bps friction. |
| `REJECTED` | $p_{\text{HAC}} \ge 0.05$, economic drag, or failed null control. |
| `INCONCLUSIVE` | Insufficient event count ($N < 30$) or contradictory horizon behavior. |

---

## 7. Compute Architecture & Scheduler
- **Worker Concurrency**: 6 parallel worker streams mapped to physical compute capacity.
- **Isolation**: Each worker writes exclusively to `research/alpha_discovery/AD001/workers/<worker_id>/`.
- **Checkpointing**: Every worker persists JSON raw data and Markdown summaries per batch.
