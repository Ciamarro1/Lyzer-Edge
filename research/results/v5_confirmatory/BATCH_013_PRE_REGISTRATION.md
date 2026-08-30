# 🏛️ LYZER EDGE — BATCH 013 PRE-REGISTRATION

## 1. EPISODE METADATA
* **Batch ID:** 013
* **Hypothesis ID:** H009
* **Family:** G (Failed Breakouts / Exhaustion)
* **Status:** EXPLORATORY (Discovery Phase)
* **Dataset:** 32,016 1h candles (BTCUSDT)

## 2. SCIENTIFIC HYPOTHESIS
**H009 — Wyckoff Spring / Volume Rejection**

* **Economic Rationale:** When price breaks a significant structural extreme (e.g., a 60-bar low), momentum-following algorithms and retail stop-losses trigger massive sell flow. If this aggressive flow is completely absorbed by institutional limit orders, the breakout fails. The resulting "Spring" (piercing support but closing back inside) traps late shorts, generating an asymmetric mean-reversion move toward the opposite edge of the value area.
* **What would falsify it:** If the Spring event has no predictive edge over a random candle (Placebo Null), or if the volume component adds no information compared to a simple price rejection, or if the "Springs" are frequently just minor pauses before trend continuation.

## 3. STATISTICAL UNIT & PHENOMENON DEFINITION
* **Statistical Unit:** The **Reversal Episode** (not single candles). A Wyckoff Spring is an isolated discrete event.
* **Event Definition:** 
  - `recentLow`: Min low of previous 60 bars.
  - `springPierce`: Current low < `recentLow` by at least 1.0 ATR.
  - `springReversal`: Current close > `recentLow`.
  - `highVolume`: Volume Z-Score > 2.5 relative to the 60-bar rolling mean.
  - `nearPoc`: Closes within 0.05% of the Point of Control.

## 4. DISCOVERY LEAN MATRICES (H009 A-F)

We will execute 6 targeted checks before proposing a massive grid.

### H009-A: Signal vs Negative Control
* **Test:** Compare the Expectancy of the real Spring Event vs a Negative Control.
* **Negative Control:** "Breakout Continuation" -> Price pierces the `recentLow` by > 1 ATR and *closes below it* on *low volume*. If the Spring edge is real, it must vastly outperform the continuation control.

### H009-B: Dose-Response of Rejection
* **Test:** Does increasing the `volumeZScore` from 1.0 to 3.0 increase the Mean Return (expectancy)?

### H009-C: Component Ablation
* **Test:** Isolate the variables. What is the performance of:
  1. Full Spring (Volume + Reversal + POC)
  2. Naked Reversal (No Volume requirement)
  3. Volume Only (High Volume, but closed below `recentLow` — failed spring)

### H009-D: Null / Placebo Permutation
* **Test:** Compare the Spring Mean Return at $T+24$ against $N=1000$ randomly selected candles (Temporal Randomization).
* **Null:** The Spring event has the exact same return distribution as the unconditional market drift.

### H009-E: Friction Tolerance (Adversarial)
* **Test:** Apply 0, 5, 15, and 30 bps slippage per leg to the Spring signals.

### H009-F: Horizon Sweep
* **Test:** Evaluate Mean Return and Win Rate at $T+12, T+24, T+48, T+72$. (Is it a short-term snapback or a full regime reversal?).

## 5. REJECTION CRITERIA
If the Spring Event fails to beat the Placebo Null (p > 0.05) or if the Negative Control performs similarly, the hypothesis is **DEAD**. It will not proceed to Confirmation.

## 6. MULTIPLE TESTING
This is a Discovery Batch. Results will be exploratory. FWER will be computed for the exploratory grid (Bonferroni across the horizon and dose-response combinations) to ensure we don't hallucinate an edge, but the ultimate statistical proof will wait for a frozen Confirmation Phase if a candidate survives.
