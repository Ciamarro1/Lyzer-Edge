# 🏛️ INSTITUTIONAL SIGNAL FACTORY AUDIT

**Date**: 2026-08-29
**Status**: COMPLETE
**Scope**: Transition from Human Priors to Institutional Signal Factory

## 1. Existing Providers (Human Priors)
- **V1_SMC_ICT**: Liquidity Reconstruction Engine based on FVG, OB, and Sweeps.
- **V2_SND_SNR**: Supply/Demand and Support/Resistance logic.
- **V3_MOMENTUM_RSI**: Standard Momentum and RSI derivations.
- **V4_IMCE**: Imbalance Mitigation Context Engine.
- **V5_WYCKOFF_VOLUME_PROFILE**: Wyckoff logic (Spring/Upthrust) + Volume Profile (POC).
- **V6_MARKET_PROFILE**: TPO (Time Price Opportunity) and Value Area logic.
- **V7_TAPE_READING**: Reconstructs synthetic order flow from candles.
- **V8_OPENMOBIUS**: Zero-allocation structural engine. Extracts structural state (BOS, CHoCH, Liquidity Sweeps, FVGs) without direct signals.

## 2. Extracted Features (Implicit & Explicit)
- `distance_to_poc` (V5, V6)
- `volume_zscore` (V5)
- `fvg_gap_size` (V1, V4, V8)
- `ob_density` (V1, V8)
- `penetration_depth_of_structural_level` (V1, V5, V8)
- `swing_high_low_distance` (V8)
- `time_at_price` (V6)
- `synthetic_delta` (V7)
- `momentum_velocity` (V3)

## 3. Dependencies
- **Data**: Exclusively reliant on OHLCV candles (`mtfCandles`: fast, intermediate, slow).
- **Infrastructure**: Tight coupling with `TruthKernel`, `ResidualizationLayer`, `ECA Court` (all part of the current monolithic signal pipeline).
- **Compute**: Runs synchronously on the Edge node (`StreamEngine`).

## 4. Economic Mechanisms (Human Interpretations)
- *SMC/ICT (V1/V4/V8)*: "Institutions drive price to areas of liquidity (stop losses) before reversing."
- *Wyckoff (V5)*: "Smart money accumulates below support (Spring) and distributes above resistance (Upthrust)."
- *Market Profile (V6)*: "Price discovers fair value; moves away from value are directional consensus."
- *Tape Reading (V7)*: "Aggressor volume dictates short-term imbalances."

## 5. Reusable Components (Data-Driven Candidates)
- V8's `findSwings`, `find_fvgs`, `find_displacements`, `find_sweeps` are highly reusable as atomic mathematical features (Level 2).
- V5's Volume Z-Score and POC calculation are solid statistical derivations.
- V7's synthetic delta approximation (if valid on granular data).

## 6. Components with Leakage / Curve-Fitting Risk
- Any logic defining "trend" using static lookbacks (`lookback = 60`) without dynamic regime adjustment.
- Any provider that bakes in the signal horizon (e.g., assuming a signal is valid for exactly 5 candles) without empirical forward-return mapping.
- V8's `bias = "BULLISH"` is an interpretative label that might oversimplify complex structural states, masking granular predictive power.

## 7. Untested Phenomena
- What happens if a sweep occurs but volume is *lower* than average?
- Conditional forward return distributions (1h, 4h, 24h) for pure volatility compressions.
- Cross-asset lead/lag structural breaks (e.g., BTC sweeps before ETH).
- Regime-conditioned FVG fills (do FVGs fill faster in ranging regimes?).

## 8. Missing Feature Families
- **Microstructure**: Real Order Book imbalance, Trade Aggressor Ratio (currently approximated).
- **Cross-Asset**: Funding rates, BTC/ETH ratio, stablecoin dominance, global liquidity proxies.
- **Regime Classification**: Explicit HMM or GARCH-based volatility and trend state classifiers.

## 9. Historically Rejected Hypotheses
- *(Based on architectural evolution)*: Previous attempts at raw price crossover strategies and static parameter RSI have shown no edge after friction. V8 was born to replace the fragility of V1-V4, acknowledging that raw SMC concepts lacked structural state tracking.
- The `TRG_THRESHOLD` and `LHDS_VETO_LIMIT` exist because raw signals from V1-V7 consistently failed out-of-sample, meaning the raw hypotheses were effectively rejected unless heavily filtered.

## 10. Consumed Degrees of Freedom
- Extensive optimization on the `lookback` parameters across V1-V7.
- Tuning of `TRG_THRESHOLD` and `RESIDUAL_CONSENSUS_LIMIT` in the ECA Court to filter out bad provider signals.
- Continued iteration on the exact same OHLCV datasets across all providers.

## 11. Available Datasets
- OHLCV at various timeframes (Fast, Intermediate, Slow).
- Access to some historical ledgers and backtest outputs (`binance_ledger.json`).

## 12. Required Additional Data
- Real tick-level Trade & Quote (TAQ) data for genuine Microstructure research.
- Funding rates and open interest (OI) for crypto derivatives.
- Clean out-of-sample (OOS) holdout sets completely isolated from previous V1-V8 development (The "Track A Shadow Lockbox").

## 13. Top 10 High Information Gain Experiments
1. **The "Naked Sweep" Test**: Isolate `penetration_depth` of a swing level. Measure forward returns (1h, 4h, 12h) completely ignoring trend, volume, or "Wyckoff" rules. *(Questions: Does structure alone predict returns?)*
2. **Volume Anomaly Causality**: Compare forward volatility of `volume_zscore > 3` vs `volume_zscore < 0.5`. Does anomalous volume predict direction, or just volatility expansion?
3. **FVG Magnetism Control**: Measure the probability of price returning to an FVG within N periods vs a randomly selected historical price gap of the same size.
4. **Time-at-Price Mean Reversion**: Does price revert to the V6 POC with higher probability than it reverts to a simple SMA(60)?
5. **Structural Break Decoupling**: When a BOS (Break of Structure) occurs, does the immediate `synthetic_delta` dictate continuation probability?
6. **Volatility Regime Conditioning**: Run Experiment #1 (Naked Sweep) explicitly partitioned into High Volatility vs Low Volatility regimes.
7. **Negative Control - Random Structure**: Inject randomly generated "swing highs" and measure if the standard SMC logic produces similar statistical significance (proving the edge was just beta/drift).
8. **Execution Friction Adversarial**: Run V8 state transitions through a 10bps and 20bps friction model. Does the structural edge survive maker/taker fees?
9. **Time-of-Day Structural Fragility**: Do structural breaks occurring during Asia session have a different failure rate than US session?
10. **The "Anti-Consensus" Test**: When V1, V2, and V5 all align in one direction, is the forward return higher, or is it a contrarian indicator due to retail crowding?
