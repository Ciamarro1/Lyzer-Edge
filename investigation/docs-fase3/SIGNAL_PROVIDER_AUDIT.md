# Signal Provider Deep Audit

## 1. Provider-by-Provider Analysis

| Provider | File | Strategy | Input TF | Output | Active Default? | Bugs | Quality |
|----------|------|----------|----------|--------|:---------------:|:----:|:-------:|
| **V1** | `v1_smc_ict.js` | SMC/ICT: FVG + Liquidity Sweeps | intermediate (15m alias) → fast (1m) fallback | `{signal, confidence, narrative, source}` | **Disabled** (`v1` in DISABLED_PROVIDERS) | See §1.1 | Low |
| **V2** | `v2_snd_snr.js` | SnD: Support/Resistance via local min/max | slow (1h alias) → intermediate → fast | `{signal, confidence, narrative, source}` | **Active** | See §1.2 | Low |
| **V3** | `v3_momentum_rsi.js` | Momentum RSI + ROC | fast (1m alias) | `{signal, confidence, narrative, source}` | **Disabled** (`v3` in DISABLED_PROVIDERS) | See §1.3 | Medium |
| **V4** | `v4_imce.js` | IMCE: 3 causal questions + meta-agent audit | fast (1m alias) → intermediate | `{signal, confidence, narrative, explanationText, tradeDna, causalAnswers, targets}` | **Active** | See §1.4 | Medium |

### 1.1 V1 — LiquidityReconstructionEngine (SMC/ICT)

**What it claims:** Fair Value Gaps, Order Blocks, Liquidity Sweeps.

**What it actually implements:**
- **FVG (Fair Value Gap):** Checks if `prev3.high < prev1.low` (bullish gap) or `prev3.low > prev1.high` (bearish gap) **AND** `prev2.close` direction matches. Uses exactly 4 candles.
- **Liquidity Sweep:** Checks if `current.low < prev1.low && current.close > prev1.low` (bullish) or `current.high > prev1.high && current.close < prev1.high` (bearish).
- **Order Blocks:** **NOT IMPLEMENTED.** Constructor has only a comment placeholder (`alpha_audit_report.md G8`).
- **Break of Structure / Change of Character:** **NOT IMPLEMENTED.**

**Bugs & Issues:**

1. **FVG non-standard constraint:** The `prev2.close > prev2.open` (bullish) / `< prev2.open` (bearish) condition is not part of standard FVG detection. A FVG is purely a gap between candles 3 and 1 — the middle candle's direction is irrelevant. This adds a false negative filter.
2. **Narrative overwrite (silent conflict):** FVG and Sweep use `if`/`else if` for FVG but then independent `if` blocks for Sweep (lines 38, 44, 52, 58). The last narrative to fire overwrites the previous one. If FVG says `short` + Sweep says `long`, the narrative shows only the Sweep, and confidence accumulates additively to 70 with contradictory direction.
3. **Confidence accumulation:** FVG adds 30, Sweep adds 40. Both can fire in one tick, producing `confidence=70` even if directions conflict. The "normalize" at line 65 clips to [0,100] but does not detect contradiction.
4. **No OB, BOS, CHoCH:** Despite the SMC/ICT label, none of these core ICT concepts are implemented.
5. **Window too narrow:** Only 4 candles used. Real SMC analysis requires multi-swing structure spanning 10-50+ candles.
6. **Memory-less constructor:** FVG/OB memory tracking is explicitly deferred (line 12 comment). No state crosses between `reconstruct()` calls.

### 1.2 V2 — StructuralBoundaryEngine (SnD)

**What it claims:** Support/Resistance, Supply/Demand Zones, Breakouts.

**What it actually implements:**
- Scans the last 10 candles (excluding current) to find `localMax` (highest high) and `localMin` (lowest low).
- Checks if `current.close` is within 0.2% of either boundary.
- If near resistance and price above → breakout (long, 70). If below → rejection (short, 50).
- If near support and price below → breakdown (short, 70). If above → bounce (long, 50).
- If not near any boundary → "trending to supply/demand" based on close direction (30 confidence).

**Bugs & Issues:**

1. **No real Supply/Demand zones:** True SnD identifies zones where price previously consolidated with high volume, not a simple rolling min/max. This is just a rolling 10-period support/resistance detector, not supply/demand.
2. **Narrative/signal confusion (lines 74-82):**
   - `current.close > prev1.close` → narrative: `'TRENDING_TO_SUPPLY'` → **signal: `'long'`**. This is conceptually wrong: if price is moving up towards supply (resistance), the narrative suggests bearish pressure, but the signal says long. Narrative is bearish, signal is bullish.
   - `current.close < prev1.close` → narrative: `'TRENDING_TO_DEMAND'` → **signal: `'short'`**. Same inversion: trending to demand (support) → short signal.
3. **Hardcoded 0.2% threshold (line 50, 61):** `distanceToRes < 0.002` and `distanceToSup < 0.002`. This is not adaptive to volatility. For BTC at $60k this is $120 — OK. For a $10 asset this is $0.02 — too tight. Should be based on ATR.
4. **No zone width:** True supply/demand zones have a range (support zone, not support line). V2 uses a single price point.
5. **Local max/min from only 10 candles:** Too short a window for meaningful S/R levels. Higher timeframe structure ignored.
6. **Memory not used:** `this.zones = []` in constructor (line 12) is initialized but never written to. A write-only dead field.

### 1.3 V3 — MomentumRsiEngine

**What it claims:** Relative Strength Index (RSI) and Rate of Change (ROC).

**What it implements:**
- 14-period RSI with Wilder's smoothing (textbook implementation)
- 5-period Rate of Change (momentum = `(close - close[-5]) / close[-5] * 100`)
- 4 conditions: oversold+bullish momentum, overbought+bearish momentum, strong bullish breakout, strong bearish breakout

**Bugs & Issues:**

1. **RSI initial SMA uses wrong window (line 23):** `for (let i = 1; i <= this.rsiPeriod; i++)` computes the initial average gain/loss from indices 1 through 14 (the FIRST 14 candles in the array, not the MOST RECENT 14). The correct RSI implementation should compute the initial SMA on the most recent `rsiPeriod` candles, i.e., `for (let i = candles.length - rsiPeriod; i < candles.length; i++)`. This means the V3 RSI is systematically biased by the earliest data in the array and never recovers — the Wilder's smoothing after index 14 only partially mitigates this over time.
2. **Recomputes from scratch every call:** `calculateRSI` iterates through ALL candles from index 1 to `candles.length`. For a 500-candle array, this is 500 iterations per tick. Inefficient but functionally correct except for bug #1.
3. **Momentum denominator is `prevMom.close` (line 59):** If `prevMom.close` is zero or near-zero, the ROC produces infinity/NaN. No guard against this.
4. **Strength breakout conditions (lines 81, 86):** The `momentum > 0.3` check means the ROC must be > 0.3% (for the current value), which is a tiny threshold. This could trigger on noise. The associated confidence formula is `40 + momentum * 15` — if momentum is 0.3, confidence = 44.5 (barely above neutral).
5. **Only uses `fast` (1m) candles:** No multi-timeframe context.

### 1.4 V4 — InstitutionalMarketCausalityEngine (IMCE)

**What it claims:** Three causal questions (what happened, where price wants to go, best moment to execute). ICT/SMC as probabilistic features.

**What it implements:**
- **MarketStateEngine:** Classifies 14 candles into 9 states (ACCUMULATION, EXPANSION, STOP_HUNT, etc.) using ATR and body/range ratios.
- **Liquidity sweep + MSS detection:** Same sweep logic as V1 `isBullishSweep`/`isBearishSweep`. MSS = `prev2.close < prev2.open && current.close > prev1.high` (bullish) or vice versa.
- **LiquidityGraph:** In-memory graph of liquidity nodes with distance/decay probability.
- **MetaAgentValidator:** Red-team filter checking drawdown, spread ratio, volatility spike, session rollover.
- **Trade DNA object:** Rich metadata about the detected setup.

**Bugs & Issues:**

1. **LiquidityGraph is always empty (critical):** `this.liquidityGraph = new LiquidityGraph()` at construction. In `reconstruct()`, `this.liquidityGraph.updateGraph(current.close, atr)` is called, but `addNode()` is **never called** — not in construction, not in `reconstruct()`, not anywhere in V4. The graph's internal `nodes` Map is perpetually empty, so `activeNodes` is always `[]`. The "active nodes" variable is computed but never used downstream (it's assigned on line 80 but its only consumer would be... nothing in the current code). The liquidity projection (Q2) completely bypasses the graph and uses a simple `current.close ± ATR * 2.0` formula (lines 82-84).
2. **MetaAgentValidator hardcoded params (line 103):**
   ```js
   { atr, spread: 0.1, dailyDrawdownPct: 0.005 }
   ```
   `spread` is hardcoded to 0.1 (10 bps) and `dailyDrawdownPct` to 0.005 (0.5%). These must come from real exchange/portfolio data, not constants. The validator's checks (drawdown > 3%, spread/atr > 0.25) will always pass because:
   - 0.5% drawdown < 3% threshold → never vetoed for drawdown
   - Spread 0.1 / ATR (e.g., 100 at $60k) = 0.001 < 0.25 → never vetoed for spread
   - The only realistic veto is the session rollover check (21:00-22:00 UTC) since that depends on actual time.
3. **FVG logic duplicated from V1 (line 114):** `fvg: (prev3.high < prev1.low) || (prev3.low > prev1.high)`. This is a copy of V1's FVG check but WITHOUT the `prev2.close` direction filter. Inconsistent with V1's version. If V1 is fixed later, V4's copy will diverge.
4. **Final score threshold (line 129):** `finalScore >= 60 ? signal : 'flat'`. Minimum for a sweep + MSS + expansion = 35(sweep) + 35(MSS alignment) + 20(target) + 20(execution) = 110, always above 60. So any sweep with MSS alignment always passes. The threshold only blocks cases where only a sweep fires without MSS (35+20+10 = 65, still above 60) or only MSS alignment without sweep (70 if MSS+target+execution). Practically never blocks.
5. **`session: 'london_ny'` hardcoded** in tradeDna (line 118). `news: false` hardcoded (line 122). These are not based on actual market conditions.
6. **Uses `fast` (1m) candles:** Same as V3. No intrinsic multi-timeframe analysis despite claiming IMCE.

## 2. Signal Contract Analysis

### Common Interface:
```js
{ signal: 'long' | 'short' | 'flat', confidence: 0-100 }
```

### Per-Provider Extensions:

| Field | V1 | V2 | V3 | V4 |
|-------|:--:|:--:|:--:|:--:|
| `source` | ✓ | ✓ | ✓ | ✗ |
| `narrative` | ✓ | ✓ | ✓ | ✓ |
| `explanationText` | ✗ | ✗ | ✗ | ✓ |
| `tradeDna` | ✗ | ✗ | ✗ | ✓ |
| `causalAnswers` | ✗ | ✗ | ✗ | ✓ |
| `targets` | ✗ | ✗ | ✗ | ✓ |

### Signal value normalization:
- `extractDivergence` in `residualization.js:22` maps `'long'`/`'go'` → `+1`, `'short'`/`'no-go'` → `-1`, everything else → `0`.
- This means V4's `'flat'` works, and EvSignalEngine's `'go'`/`'no-go'` are compatible.

### Assessment:
The base contract (`signal` + `confidence`) is **consistent** across all 4 providers. V4 extends with optional fields consumed downstream (streamEngine.js lines 563-592). The TruthKernel only reads `signal` and `confidence` from each provider, so the extra fields are strictly for telemetry/trade metadata. **No contract violations found.**

## 3. Combined Signal Logic

### Layer 1: Provider Evaluation (streamEngine.js:487-490)
All 4 engines run every tick regardless of disabled status. Disabled providers have their signals zeroed out at line 529-532.

### Layer 2: Residualization (TruthKernel → ResidualizationLayer)
The 4 signals are vectorized as `direction (±1, 0) × confidence/100` and pairwise divergence is computed. If `maxDivergence < consensusLimit` and `|sumTension| > 1.0`, consensus is destroyed (DVF=0). TRG = DVF^exponent × liquidityVacuum.

### Layer 3: Execution Trigger (ExecutionTriggerLayer)
EEF = true only if TRG ≥ threshold (default 0.4) AND consensus NOT destroyed.

### Layer 4: Fallback combinedSignal (streamEngine.js:563-572)
For telemetry payload direction, a priority cascade is used:
```
V4 → V1 → V2 → V3  (first non-flat wins)
```
This `baseSignal.signal` is used ONLY for the telemetry payload (`baseSignal`) and for trade direction when EEF is true (line 714). It is NOT fed into the TruthKernel — the kernel only sees raw provider vectors.

**Critical design issue:** The direction for trade execution (line 714: `direction = (baseSignal.signal === 'go' || baseSignal.signal === 'long') ? 'LONG' : 'SHORT'`) is determined by a provider priority cascade, while the authorization to trade (EEF) comes from the TruthKernel which evaluates divergence geometry. This means:
- If V4 says `long` (confidence 70) and V2 says `short` (confidence 70), TRG may be high (strong divergence → execution authorized).
- But direction will be V4's `long` (priority). The system trades `long` with high confidence based on the divergence being large — but the divergence IS large because V2 disagrees. The system exploits the disagreement to act on one provider's signal.

### Layer 5: Constitutional Court
Final gate: C-CLIST stress oracle + MOL recovery state. If C-CLIST reaches `lethalIllusionLimit` or MOL needs recovery, execution is blocked regardless of EEF.

## 4. Quality Assessment

| Provider | Quantitative Soundness | Concept Implementation | Verdict |
|----------|----------------------|----------------------|---------|
| **V1** | Low. RSI-like scoring (additive, no normalization, no probabilistic framework). FVG logic has non-standard constraints. No OB/BOS/CHoCH. | SMC/ICT is genuinely complex to implement. This is a 1-hour prototype, not a production SMC engine. | Prototype-grade. Needs complete rewrite for real SMC. |
| **V2** | Low. Rolling min/max is not SnD. Narrative/signal inversion in trending states. No zone width or volume confirmation. | Supply & Demand requires volume profile or at minimum multi-candle consolidation detection. This is basic S/R. | Semantically incorrect (claims SnD, delivers basic S/R). Needs fundamental redesign. |
| **V3** | Medium. RSI with Wilder's smoothing is textbook. ROC is correct. **Bug in initial SMA window** distorts RSI values. | Momentum + RSI is a well-known strategy. The threshold values (35/65) are standard. | Functional but has the SMA window bug. Use EvSignalEngine's RSI instead (which uses simple SMA, no Wilder's). |
| **V4** | Medium. ATR, market state, sweep detection are reasonable. **LiquidityGraph is dead code** (never populated). MetaAgentValidator has hardcoded params making it nearly inert. | Three causal questions framework is architecturally sound. Execution is incomplete/placeholder in several areas. | Architecturally the most sophisticated but has significant implementation gaps. Best positioned for iteration. |

## 5. Disabled Provider Analysis

### Configuration
- Default: `DISABLED_PROVIDERS = 'v1,v3'` (streamEngine.js:48)
- Configurable per StreamEngine instance via `config.disabledProviders` (line 57)
- Individual override via env var

### Effect on Pipeline
When a provider is disabled, its signal is replaced with `{ signal: 'flat', confidence: 0 }` at streamEngine.js:529-532. This means:
- **Divergence calculation:** The provider contributes zero to the vector array. With V1 and V3 disabled, only V2 and V4 have non-zero vectors.
- **Minimum vectors for divergence:** `residualization.js:31` requires `vectors.length < 2` to return zero divergence. With V2+V4 active, 2 vectors exist → divergence is computed.
- **Combined signal priority:** V4 → V1(flat) → V2 → V3(flat). So only V4 and V2 compete for direction.

### Practical Effect
- **V1 disabled:** SMC/ICT layer completely excluded from both divergence calculation AND combined signal direction. Given V1's quality issues (no OB, narrow window), this is probably correct.
- **V3 disabled:** Momentum RSI excluded. Also reasonable given the RSI SMA bug.
- **Active providers:** V2 (SnD/SR) + V4 (IMCE) + the SMC Facade (LiquidityEngine + StructureEngine, imported separately at lines 20-22 and instantiated at lines 78-80) + CSRL subsystem + EvSignalEngine.
- **Fallback scenario:** If DISABLED_PROVIDERS were set to `'v1,v2,v3,v4'`, `vectors.length` would be 0 → divergence = 0 → TRG = 0 → EEF = false → **no trades**. The pipeline would still run (CSRL, SMC facade, EvSignalEngine) but produce no execution.

### Additional Running Engines
Even with V1 and V3 disabled, these signal-generating subsystems are **always active**:
1. **EvSignalEngine** (`signalEngine.evaluate()` in streamEngine.js) — produces `{signal: 'go'|'no-go'|'caution', confidence, Z_t}`. Used via the older `evaluate()` method but its output is NOT directly injected into the provider array or the baseSignal. It appears to be legacy — instantiated at line 34 but its output only flows through `this.signalEngine` which is set but never called with `.evaluate()` in the main processCandle path. Wait — let me check... It's imported but I need to verify if it's called. Looking at line 59: `this.signalEngine = signalEngine;` and then there's no invocation of `this.signalEngine.evaluate()` in `processCandle`. The EvSignalEngine appears to be vestigial in the main streamEngine flow.
2. **SMC Facade** (`SmcEngineFacade`) — evaluates structure + liquidity and contributes to overlays.
3. **CSRL subsystem** — scale normalizer, tensor graph, invariant extractor, divergence detector. These feed `sds` into the TruthKernel.

## Summary of Critical Issues

1. **V4 LiquidityGraph is dead code** — never populated, always returns empty array. The "liquidity target" (Q2) is a simple ATR projection, not graph-based.
2. **V4 MetaAgentValidator receives hardcoded values** — drawdown, spread, etc. are not real.
3. **V3 RSI initial SMA uses wrong window** — biased by earliest data.
4. **V2 narrative/signal inversion** — "TRENDING_TO_SUPPLY" → long signal is semantically confused.
5. **V1 lacks OB, BOS, CHoCH** — despite claiming SMC/ICT.
6. **Trade direction vs. divergence disconnect** — direction comes from priority cascade, authorization from TRG. System can execute V4's signal based on V2's disagreement, which is architecturally inconsistent with the anti-consensus philosophy.
7. **EvSignalEngine instantiated but may not be called** in the main processCandle path — should be verified.
