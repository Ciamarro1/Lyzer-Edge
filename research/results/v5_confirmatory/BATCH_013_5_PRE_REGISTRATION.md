# 🏛️ LYZER EDGE — BATCH 013.5 PRE-CONFIRMATION AUDIT

## 1. EPISODE METADATA
* **Batch ID:** 013.5 (Pre-Confirmation Robustness Audit)
* **Hypothesis ID:** H009 (Wyckoff Springs)
* **Status:** EXPLORATORY / INTERNAL VALIDATION
* **Dataset:** 32,016 1h candles (BTCUSDT) - `CONFIRMATION DATA UNAVAILABLE` (Using Discovery Dataset for Robustness check only).

## 2. EPISTEMIC CORRECTION & OBJECTIVE
The parameters `Volume Z-Score = 2.5` and `Horizon = 24h` were selected *post-hoc* after viewing the Batch 013 Discovery surface. Therefore, executing statistical tests on the same dataset does **not** constitute an Out-Of-Sample Confirmation. 
The objective of this batch is **INTERNAL VALIDATION**: attempting to falsify the hypothesis causally and mechanically before procuring OOS data. 

*Language correction applied: We seek to demonstrate "mechanistic/associative evidence consistent with the causal hypothesis," not "proven causality".*

## 3. AUDIT PROTOCOLS (THE KILL GATES)

### Gate 1: Local Stability (Robust Region vs Narrow Peak)
* **Test:** Execute a 3x3 matrix around the frozen candidate: Z = [2.25, 2.50, 2.75], Horizon = [18h, 24h, 30h].
* **Rejection:** If the performance collapses outside exactly Z=2.5/24h, it is a narrow overfitted peak.

### Gate 2: Causal Control Component Isolation
* **Test:** Compare Net Mean and PF for:
  - `REAL_SPRING`: Breakout + Reversal + High Vol (Z >= 2.5).
  - `PRICE_ONLY`: Breakout + Reversal + Low Vol (Z <= 1.0).
  - `VOL_ONLY`: High Vol (Z >= 2.5) without structural breakout.
  - `CONTINUATION`: Breakout + No Reversal + Low Vol.
* **Rejection:** If `PRICE_ONLY` matches `REAL_SPRING`, then volume adds no incremental information (causality failure).

### Gate 3: True Placebo Permutation (10,000 iterations)
* **Test:** Select $N=70$ random candles 10,000 times. Compute Net Return at T+24. 
* **Report:** Distribution (Mean, Median, p5, p95, p99) and Empirical P-Value.
* **Rejection:** $p \ge 0.05$.

### Gate 4: WFA Consistency Matrix
* **Test:** 10 fixed sequential windows.
* **Report:** N, Mean Net, WR, PF, MaxDD per window.
* **Rejection:** $> 4$ negative windows out of 10.

### Gate 5: Capital Constraint (Overlap Audit)
* **Test:** Force strict `ONE_POSITION` capital allocation. If a signal occurs while a position is held, discard it.
* **Report:** Overlap discarded percentage, Capital Return.
* **Rejection:** If PF or Win Rate crashes when overlap is removed.

### Gate 6: Friction Ladder
* **Test:** Apply 0, 5, 10, 15, 20, 30, 50 bps slippage per leg.
* **Rejection:** Strategy dies at $< 10$ bps.

## 4. EXECUTIVE VERDICT PROTOCOL
If H009 survives all Kill Gates, it remains **PROMISING** and earns the right to await an unpolluted Out-Of-Sample dataset for a true Batch 014 Confirmation. If it fails, it will be classified as **ARCHIVED**.
