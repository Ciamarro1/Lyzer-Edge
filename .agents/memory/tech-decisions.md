---
type: project
created: 2026-06-11
updated: 2026-09-01
---

# Technical Decisions

## Lyzer Labs Architectural Canon
- **Epistemology:** Reality > Models > Consensus > Governance > History.
- **First Law of Thermodynamics (Survival):** Survival > Governance. If the Kernel faces OOM/asphyxiation, it drops the governance socket (FAIL_OPEN/FAIL_DEGRADED).
- **Constitutional Entropy Governance (The Degradation Triad):** No constraint can be removed purely by Negative Utility. Degradation requires: 1) Epistemic Entropy (Cost > Benefit), 2) Counterfactual Protection (Shadow Simulation), and 3) Human Sentinel Review. This prevents "Evolutionary Amnesia" and "Constraint Assassination".
- **Oracle Calibration vs Rot:** "Oracle Rot" is distinguished from "Calibration Drift". An oracle isn't killed just for disagreeing with old Shadow Hypotheses if its P-Value is high (indicating the model evolved while the Constitution stagnated).
- **Rare Event Protection Layer:** Prevents "Rare Event Blindness" (Utility Mirage) by assigning an Infinite Multiplier to constraints with the `[SYSTEMIC_COLLAPSE]` flag, rendering them immune to Entropic Decay.
- **Anti-Darwinism Subsidy:** Prevents "Audit Darwinism" (where only cheap regex audits survive) by constitutionally subsidizing deep causal audits so they aren't killed for high IOPS/CPU cost.

## Quantitative Research & Production Governance
- **Two-Track Isolation Mandate:** Production (`REC_COMP_INSTITUTIONAL_v1` on Railway) is strictly frozen and read-only. Research batches operate 100% offline in simulation. No research batch may alter production code without an explicit multi-stage governance ceremonial gate.
- **Episode-Level Statistical Validation:** Persistent state hypotheses cannot treat hourly bars as IID observations. The primary statistical unit is the discrete, non-overlapping market episode ($N_{\text{episodes}}$) evaluated via Block-Bootstrap.
- **Fail-Closed Threshold Mandate:** If an OOS Block-Bootstrap 95% Confidence Interval lower bound touches $\le 0.00\%$, the batch is immediately archived as fail-closed. Post-hoc parameter tuning ($D \ge 36\text{h}, 48\text{h}$) or auxiliary indicators are strictly prohibited.
- **Batch 034–038 Scientific Trajectory:**
  - B034 (Absorption Reversal): Falsified (generates continuation, not reversal).
  - B035 (M5 Taker Flow): Falsified (microstructure noise post-friction).
  - B036 (Funding Imbalance Triad): Falsified as symmetric strategy; identified H+168 interaction.
  - B037 (Regime State Persistence): +0.82% net OOS, but Block-Bootstrap $CI [-0.52\%, +2.34\%]$ triggered fail-closed. Preserved as scientific prior.
  - B038 (Prospective Replication): Pre-registered ex-ante for post-2026-08 real-time stream data ($N \ge 20$).
- **Alpha Factory & AD003–AD006 Trajectory (2026-09):**
  - **Alpha Factory v1.0:** Production of modular research engine with sub-3s reproduction, fail-closed firewall guard, 14d block bootstrap, and BY FDR.
  - **H009 (Wyckoff Spring):** Falsified in 6/6 core assets; continuation control outperformed spring (+0.329R).
  - **AD003 (Temporal Scale Dependence):** Falsified (0/40 passed; friction floor in 15m/30m and density scarcity in 2h/4h).
  - **H012 (Funding Short Squeeze):** Discovered in AD004 in-sample (+0.265R, PF=1.95), but failed confirmatory validation in Virgin Holdout 2025–2026 (-0.046R, p=0.7301) due to protracted altcoin bleeding.
  - **AD005 (Cross-Sectional Spread):** Falsified (0/12 passed; reversion deeply negative, momentum compressed by 24 bps friction).
  - **AD006 (Delta-Neutral Carry Engine):** Breakthrough success! 9/9 cells approved under BY FDR (q_BY <= 0.0020). Static BTC/ETH carry achieved +10.73% annualized net yield, Sharpe 30.80, MaxDD 0.11%. Lead candidate promoted as H013 for confirmatory charter.
