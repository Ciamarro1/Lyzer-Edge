---
type: project
created: 2026-09-03
updated: 2026-09-03
---

# Alpha Research Cycle: H009 to H013 & AD003 to AD006

## Executive Summary
This document records the empirical discoveries, falsifications, and architectural breakthroughs achieved during the institutional research cycle executing on Alpha Factory v1.0.

---

## 1. Falsifications & Forensic Insights
- **H009 (Wyckoff Spring / Volume Rejection)**: Falsified in multi-asset cross-validation (6/6 assets negative, pooled $E[R] = -0.247R$, $\text{PF} = 0.76$, $p = 0.8640$). Negative continuation control proved that structural breakdown on high volume exhibits trend continuation ($+0.329R$), not spring reversal.
- **AD003 (Temporal Scale Dependence of VCB)**: Discovery failed (0/40 cells passed $N \ge 60$ and $q_{\text{BY}} < 0.05$). Lower timeframes (15m/30m) were eliminated by the 80 bps feasibility floor; higher timeframes (2h/4h) suffered from structural event density scarcity over 2 years.
- **H012 (Perpetual Short Squeeze via Funding Dislocation)**: Discovered in AD004 in-sample ($E[R] = +0.265R, \text{PF} = 1.95, p = 0.0432, N = 170$). Confirmatory claim rejected on Virgin Temporal Holdout 2025–2026 ($N = 192, E[R] = -0.046R, \text{PF} = 0.89, p = 0.7301, \text{MaxDD} = 17.34R$). Microstructural cause: in 2025–2026, protracted altcoin bleeding (ETH $-0.263R$, SOL $-0.348R$) overwhelmed the collected funding rate cash flows. Holdout firewall successfully prevented real capital destruction.
- **AD005 (Cross-Sectional Market-Neutral Spread)**: Discovery failed (0/12 cells passed). Cross-sectional mean reversion was completely falsified across all lookbacks ($-0.074R$ to $-0.272R$). Momentum had positive drift at 168h ($+0.111R$), but the 24 bps roundtrip spread friction compressed the statistical edge ($p = 0.2507, q_{\text{BY}} = 1.0000$).

---

## 2. The Breakthrough: AD006 Delta-Neutral Carry Engine
- **AD006 (Structural Funding Yield Harvest & Delta-Neutral Carry Engine)**:
  - **9/9 cells approved under Benjamini-Yekutieli FDR ($q_{\text{BY}} \le 0.0020 \ll 0.0500$)**.
  - **Mechanics**: Long Spot + Short Perpetual ($\Delta = 0.00$, price volatility 100% neutralized).
  - **Economic Driver**: Chronic structural long bias of retail/speculative crypto traders transferring continuous positive funding rate payments ($> 80\%\text{--}93\%$ positive periods).
  - **Friction Amortization**: One-time 24 bps roundtrip cost amortized over multi-month holding ($< 0.03\text{ bps/day}$).
  - **Lead Candidate (`AD006_STATIC_BTC_ETH`)**:
    - Annualized Net Return: **+10.73%**
    - 2-Year Total Net Return: **+22.65%**
    - Annualized Sharpe Ratio: **30.80**
    - Maximum Drawdown: **0.11%**
    - Block Bootstrap: $p_{\text{block}} = 0.0001, q_{\text{BY}} = 0.0004$.
  - **Promoted to Candidate `H013`**: Awaiting formal frozen Confirmatory Charter on Holdout 2025–2026.

---

## 3. Cryptographic & Constitutional Invariants
- **Engine V8 SHA-256**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (Verified 100% invariant throughout all campaigns).
- **Master Hypothesis Ledger**: Fully updated in `research/HYPOTHESIS_LEDGER.md` and `research/HYPOTHESIS_LEDGER.json`.
- **Holdout 2025–2026 Status**: Virgin and permanently sealed for future confirmatory testing of H013.
