# System Gap Report — L4 Adversarial Audit

**Mission**: L4 — Alpha Evolution Program  
**Date**: 2026-07-24  
**Auditor**: Lyzer Orchestrator (Red Team Mode)

---

## P0 — Critical (Blocks Alpha Validation)

| # | Gap | Component | Evidence | Fix Status |
|:---:|---|---|:---:|:---:|
| P0-1 | **No backtesting on historical data** | System-wide | VERIFIED | ✅ FIXED — `replayEngine.js` |
| P0-2 | **No statistical significance testing** | System-wide | VERIFIED | ✅ FIXED — `statisticalValidator.js` |
| P0-3 | **TRG = divergence⁴ suppressed signals** | residualization.js | VERIFIED | ✅ FIXED — configurable exponent |
| P0-4 | **No alpha contribution measurement** | System-wide | VERIFIED | ✅ FIXED — `alphaContribution.js` |
| P0-5 | **V1 duplicates SMC Engine** | v1_smc_ict.js ↔ smc/ | VERIFIED | ⏳ ADR needed |

## P1 — High (Affects Alpha Quality)

| # | Gap | Component | Evidence | Fix Status |
|:---:|---|---|:---:|:---:|
| P1-1 | **All confidence values arbitrary** | V1(30/40) V2(70/50/30) V3(35/65) V4(35/35/20/20) | VERIFIED | ⏳ Requires replay calibration |
| P1-2 | **No regime adaptation** | Pipeline | VERIFIED | ✅ FIXED — `regimeClassifier.js` |
| P1-3 | **V2 distance 0.002 not volatility-scaled** | v2_snd_snr.js | VERIFIED | ⏳ OPEN |
| P1-4 | **V4 hardcoded spread: 0.1** | v4_imce.js L103 | VERIFIED | ⏳ OPEN |
| P1-5 | **consensusLimit=0.1 unvalidated** | residualization.js | VERIFIED | ⏳ E1 experiment ready |
| P1-6 | **Signal combination priority-based, not ensemble** | streamEngine.js | VERIFIED | ⏳ OPEN |
| P1-7 | **SL/TP static ATR percentages** | streamEngine.js L648-685 | VERIFIED | ⏳ OPEN |

## P2 — Medium (Affects Robustness)

| # | Gap | Component | Evidence | Fix Status |
|:---:|---|---|:---:|:---:|
| P2-1 | **Position sizing uses fixed baseQty=0.001** | streamEngine.js | VERIFIED | ⏳ OPEN |
| P2-2 | **No cross-asset correlation** | 6 StreamEngines independent | VERIFIED | ⏳ OPEN |
| P2-3 | **Synthetic warmup uses Math.random()+sin** | streamEngine.js L122-146 | VERIFIED | ⏳ OPEN |
| P2-4 | **EV Research Engine unproven** | EVAlphaResearchEngineV3_3.js | VERIFIED | ⏳ OPEN |
| P2-5 | **Slippage model hardcoded 0.0001** | streamEngine.js | VERIFIED | ⏳ OPEN |

## P3 — Low (Technical Debt)

| # | Gap | Component | Evidence | Fix Status |
|:---:|---|---|:---:|:---:|
| P3-1 | **41 files in engine/ directory** — many potentially unused | lyzer-shared/src/engine/ | INFERRED | ⏳ Requires usage audit |
| P3-2 | **LiquidityGraph never receives addNode() calls** | causality/liquidityGraph.js | VERIFIED | ⏳ OPEN |
| P3-3 | **MarketStateEngine only uses 4 of 9 declared states** | causality/marketStateEngine.js | VERIFIED | ⏳ OPEN |
| P3-4 | **67 test dirs but no alpha quality tests** | tests/ | VERIFIED | ⏳ OPEN |
| P3-5 | **engine/regime.js exists but unused in pipeline** | engine/regime.js | INFERRED | ⏳ Requires validation |

---

## Bug Report

| # | Bug | Severity | File | Line |
|:---:|---|:---:|---|:---:|
| B1 | V1 `fvgMemory`/`obMemory` dead code | LOW | v1_smc_ict.js | 11-12 | ✅ FIXED |
| B2 | Court rejects any `rawState.confidence` field | MEDIUM | court.js | 41 |
| B3 | `streamEngine.js` checks `kernelResult.confidence < 50` — could trigger B2 | MEDIUM | streamEngine.js | ~595 |
| B4 | V4 passes `spread: 0.1` hardcoded to MetaAgentValidator | LOW | v4_imce.js | 103 |
| B5 | C-CLIST stress accumulation rate 0.002 asymmetric with release 0.1 | LOW | c-clist.js | 11-13 |
| B6 | ETT constructor default 0.8 but streamEngine passes 0.4 | LOW | executionTriggerLayer.js | 12 |

---

## Impossible Conditions Found

| Condition | Analysis |
|---|---|
| TRG ≥ 0.4 with old TRG⁴ | Required divergence ≥ 0.795. Given 4 providers with [-1,1] range, this is extremely rare. Fixed with TRG² (now requires divergence ≥ 0.632). |
| All 4 providers agree + EEF=true | Impossible by design — consensus destruction sets DVF=0 → TRG=0 → EEF=false |
| Court allows trade with confidence field | Impossible — line 41 vetoes any rawState with `confidence` property |

---

## Threshold Audit (All Hardcoded Values)

| Threshold | Value | File | Evidence |
|---|---|---|:---:|
| `consensusLimit` | 0.1 | residualization.js | UNPROVEN |
| `trgThreshold` | 0.4 | env / streamEngine.js | UNPROVEN |
| `trgExponent` | 2 (was 4) | residualization.js | UNPROVEN |
| `lhdsVetoLimit` | 0.8 | kernel.js | UNPROVEN |
| `ontologicalCollapseTrg` | 0.7 | kernel.js | UNPROVEN |
| `dvfFloor` | 0.1 | c-clist.js | UNPROVEN |
| `stressAccumulation` | 0.002 | c-clist.js | UNPROVEN |
| `lethalIllusionLimit` | 0.9 | c-clist.js | UNPROVEN |
| `stressRelease` | 0.1 | c-clist.js | UNPROVEN |
| `sclThreshold` | 3 | mol.js | UNPROVEN |
| V2 distance threshold | 0.002 | v2_snd_snr.js | UNPROVEN |
| V3 RSI oversold | 35 | v3_momentum_rsi.js | UNPROVEN |
| V3 RSI overbought | 65 | v3_momentum_rsi.js | UNPROVEN |
| V3 momentum threshold | 0.05 / 0.3 | v3_momentum_rsi.js | UNPROVEN |
| V4 signal threshold | ≥60 | v4_imce.js | UNPROVEN |
| SL range | 0.15%–0.4% | streamEngine.js | UNPROVEN |
| TP ratio | 1:2 R:R | streamEngine.js | UNPROVEN |
| Base quantity | 0.001 BTC | streamEngine.js | UNPROVEN |
| Max spread/ATR | 0.25 | metaAgentValidator.js | UNPROVEN |
| Max ATR spike | 3.0 | metaAgentValidator.js | UNPROVEN |
