# 🏛️ LYZER EDGE — BATCH 012: RESEARCH OPPORTUNITY MAP

## PASS 1 — REPOSITORY AUDIT

### Available Signal Providers (Engines)
* **V1:** `v1_smc_ict.js` — Liquidity Reconstruction, FVG, Order Blocks, Liquidity Sweeps, Spatial Memory Index.
* **V2:** `v2_snd_snr.js` — Support/Resistance boundaries, Supply/Demand Zones, Breakouts.
* **V3:** `v3_momentum_rsi.js` — Classic Momentum and Oscillators.
* **V4:** `v4_imce.js` — Implied Microstructure and Causal Engine.
* **V5:** `v5_wyckoff_volume_profile.js` — Volume Z-Score, Point of Control (POC) proximity, Pierces (Springs/Upthrusts).
* **V6:** `v6_market_profile.js` — Value Area and TPO bounding.
* **V7:** `v7_tape_reading.js` — Intrabar cumulative delta, Effort vs Result divergence.

## PASS 2 — RESEARCH HISTORY AUDIT (DEGREES OF FREEDOM)

* **Saturated Family:** V8 (Displacement / Trend Continuation / FVG Filtering / Pyramiding). The V8 family consumed 133 hypotheses spanning Batches 005 to 011. The core premise—that large directional candles indicate independent, tradable momentum—has been conclusively exhausted.
* **Dead Ends:**
  * Auction Failure Reversions to POC (Batch 003).
  * Naive SMC Break of Structure (Batch 004).
  * Limit Order Pullbacks (Batch 004).
  * Bearish Displacement Continuations (Batch 005).

The historical ledger indicates that trend-following and momentum continuation have been our primary focus, leaving mean-reversion, exhaustion, and microstructure dynamics entirely untouched.

---

## PASS 3 — OPPORTUNITY MAP

| Proposed Family | Indicator Base | Economic Rationale | Independence from V8 | Implementation Status |
|---|---|---|---|---|
| **A. Wyckoff Springs / Upthrusts (Failed Breakouts)** | V5 (Volume Profile) | Breakouts accompanied by extreme volume that immediately reverse into the Value Area indicate trapped retail liquidity and institutional absorption. | HIGH. Focuses on exhaustion rather than continuation. | Ready (`requirePierce`, `pocProximity`, `volumeZScore`). |
| **B. Effort vs Result Divergence (Microstructure)** | V7 (Tape Reading) | High volume delta (Effort) that fails to move price (Result) indicates heavy passive limit order absorption, predicting a reversal. | HIGH. Intrabar volume dynamics vs interbar price math. | Ready (`calculateDelta`, `Effort vs Result logs`). |
| **C. Liquidity Sweeps (Mean Reversion)** | V1 (SMC/ICT) | Price action piercing an established structural swing but closing back inside the range triggers stop-losses to fuel a reversal. | HIGH. Focuses on range-bound dynamics instead of trend ignition. | Ready (`SpatialMemoryIndex`). |
| **D. Structural Breakout Pullbacks** | V2 (SnD / SnR) | Price breaking a rigid SR boundary and retesting it confirms the boundary has flipped polarity. | LOW. (Already attempted in early batches, suffered severe adverse selection). | Ready. |

---

## PASS 4 & 5 — TOP 3 RESEARCH CANDIDATES FOR CYCLE 2

Based on the audit, we officially pivot away from Trend Continuation and explore **Exhaustion, Absorption, and Mean Reversion**. 

### 1. HYPOTHESIS H009 (Family G — Failed Breakouts)
**Wyckoff Spring / Trap Reversion**
* **Why it should exist:** When price breaks out of a Value Area, retail traders chase the breakout. If institutions absorb this liquidity (high volume) and force price back into the Value Area, the retail stops become fuel for a move to the opposite edge of the profile.
* **What would falsify it:** If price returns to the Value Area and just chops sideways, or if the "failed breakout" resumes the original breakout direction immediately.
* **Statistical Unit:** The Reversal Episode.
* **Primary Test:** Return to the POC (Point of Control) / Opposite edge of the Value Area within $N$ bars.

### 2. HYPOTHESIS H010 (Family J — Market Microstructure)
**Effort vs Result Divergence (Delta Absorption)**
* **Why it should exist:** If a candle has massive negative Delta (aggressive market selling) but closes bullish or a doji, the selling was completely absorbed by passive limit buyers. This hidden absorption precedes upward momentum.
* **What would falsify it:** If Delta divergence has zero predictive power over the next $N$ bars' return direction.
* **Statistical Unit:** The Divergence Event.
* **Primary Test:** OLS Regression of (Delta / True Range) vs Forward Return(T+1 to T+12).

### 3. HYPOTHESIS H011 (Family C — Liquidity / Exhaustion)
**Structural Liquidity Sweeps**
* **Why it should exist:** Markets seek liquidity. Moving below a previous significant Swing Low triggers sell-stops. If the candle closes back above the Swing Low, the liquidity was harvested without intent to continue the markdown.
* **What would falsify it:** If "Sweeps" frequently result in continuation (i.e., they weren't sweeps, they were true breakdowns).
* **Statistical Unit:** The Sweep Event.
* **Primary Test:** WFA of Mean Reversion Profit Factor (Long entry on close of the sweep candle, Exit at opposing swing high).

---
**NEXT DIRECTIVE:** We await executive authorization to transition to the Discovery Phase of these 3 new families, establishing the parameters and rigorous pre-registration for **BATCH 013**.
