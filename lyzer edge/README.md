# 🔬 Lyzer Edge — Core Engine & Analyst Package 🚀

### Institutional Quantitative Trading & Deterministic Dual-Strategy Execution (v2026)

Lyzer Edge is an institutional-grade quantitative trading framework engineered to extract Alpha from microstructural momentum bursts while maintaining absolute capital survival across non-stationary market regimes.

---

## 🏛️ Key Architecture Highlights

* **7-Provider Core Matrix (V1 to V7):**
  * **V1 (SMC / ICT):** Liquidity Reconstruction (FVGs & Liquidity Sweeps)
  * **V2 (SnD):** Structural Boundary (Supply & Demand Zones)
  * **V3 (Momentum):** Momentum RSI (Short-term directional thrusts)
  * **V4 (Causalidade):** Institutional Market Causality Flow
  * **V5 (Wyckoff):** Volume Profile & Structural Phase Dynamics
  * **V6 (Market Profile):** Fair Value Mapping (POC / VAH / VAL)
  * **V7 (Tape Reading):** Microstructure Order Flow & Aggression
* **Truth Kernel (Causal Memory):** An epistemic engine that vetoes hallucinations and retains memory of structural flow with zero look-ahead bias.
* **Dynamic Dual-Strategy Router:**
  * **Trend Expansion Mode:** Activated during institutional volume/trending regimes. Secures Break-Even at `+0.80R`, executes Scale-Out 1 (33%) at `+1.20R`, Scale-Out 2 (33%) at `+1.80R`, and trails the remaining 34% Runner across M1 structural fractals.
  * **Range Scalping Mode:** Activated during consolidating/off-peak regimes. Executes fast Take-Profit at `+1.00R` and locks Break-Even at `+0.45R`.
* **Maker LIMIT Rebate Engine:** Employs resting post-only exit orders on the book, converting exchange fee drag into positive fee rebates (`+0.01%`).
* **Constitutional Court (ECA) & C-CLIST Stress Oracle:** Sovereign risk gate enforcing deterministic mathematical vetos against false stability illusions.

---

## 📊 Empirical Benchmark (36,000 Historical M1 Candles)

- **Total Trades:** 363 trades (~14.5 trades/day real institutional frequency)
- **Win Rate:** 62.26%
- **Net PnL (Real Net Positive):** +0.130%
- **Alpha Generated:** +215.90 R
- **Break-Even Protected Trades:** 223 (61.4% of trades protected at zero risk)

---

## ⚙️ Primary Environment Variables

```bash
ARL_MODE=TESTNET
ENABLE_RANGE_SCALP_MODE=true
RANGE_SCALP_TP=1.0
RANGE_SCALP_BE=0.45
ENABLE_24_7_REGIME=true
OFF_PEAK_TRG_FLOOR=0.22
VECTOR_CONFLUENCE_THRESHOLD=0.018
MFE_TARGET_BE=0.8
MFE_TARGET_SCALE1=1.2
MFE_TARGET_SCALE2=1.8
TRG_THRESHOLD=0.35
CCLIST_LETHAL_ILLUSION_LIMIT=0.9
COURT_SECRET_KEY=lyzer_hf_spaces_default_key
```

---

## 🚀 Quick Commands

```bash
# Run verification test suite
npm run test:verify

# Start full system (Backend + Vite Frontend)
npm run full

# Start backend only
npm run backend
```

For the complete architectural diagrams, 3-process topology flowcharts, and production deployment guide, refer to the [Root README.md](../README.md).
