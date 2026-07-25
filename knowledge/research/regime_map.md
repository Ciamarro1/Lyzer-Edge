# Lyzer Edge Regime Intelligence Map

## 1. Current Regime Awareness (Audit)
Based on the current implementation in `marketStateEngine.js` and `v4_imce.js`, Lyzer Edge currently defines 9 theoretical regimes but only actively classifies 4:
- **EXPANSION**: Detected when candle body size > 1.5 * ATR(14). High confidence (0.90), yields high execution score in IMCE.
- **STOP_HUNT**: Detected when range size > 2.0 * ATR(14) and body size < 30% of range. Yields high execution score.
- **ACCUMULATION**: Detected when range size < 0.5 * ATR(14). 
- **RANGE** (Default): Used as the fallback state if no other conditions are met.

The V4 IMCE provider incorporates the `MarketStateEngine` directly into its "IS NOW THE BEST MOMENT TO EXECUTE?" logic (Q3). Expanding market states (Expansion or Stop Hunt) award 20 points out of 100 towards the trade conviction score, whereas other states only award 10 points. However, true trend awareness (directional regimes) and prolonged volatility tracking are currently missing.

## 2. Regime Taxonomy
A complete market regime taxonomy based on volatility and directionality:

1. **Trending Bullish**: Strong upward directional movement. High positive ADX-like scores.
2. **Trending Bearish**: Strong downward directional movement. High negative ADX-like scores.
3. **Ranging (Wide)**: High volatility but low directional conviction. Price oscillates widely.
4. **Ranging (Narrow)**: Normal to low volatility, price bouncing between tightly defined levels.
5. **Expansion (Breakout)**: Sudden spike in volatility (ATR) combined with strong directional displacement.
6. **Compression (Squeeze)**: Period of abnormally low volatility, often preceding an expansion.
7. **News Shock / Black Swan**: Extreme volatility (ATR spikes > 3x-5x), frequent stop hunts, disjointed price action.

## 3. Pipeline Performance Analysis per Regime
- **Trending (Bullish/Bearish)**: Current pipeline uses `MTF Sweeps` and `MSS` (Market Structure Shifts). It may perform moderately well in trends but could get chopped out by counter-trend sweeps if it blindly trades reversals. Needs a trend filter.
- **Ranging (Wide/Narrow)**: Current pipeline excels here because Sweep + MSS logic thrives in mean-reverting environments where liquidity pools are raided at range boundaries.
- **Expansion (Breakout)**: Pipeline performs well (V4 gives 20 pts execution score).
- **Compression**: May generate false signals due to small overlapping candles creating micro-sweeps.
- **News Shock**: Extreme risk. MetaAgentValidator checks for some risk parameters, but extreme slippage could bypass standard ATR targets.

## 4. Regime × Strategy × Expected Performance Matrix

| Regime | Primary Strategy | Expected Performance | Confidence |
| :--- | :--- | :--- | :--- |
| Trending Bullish | Trend Following / Pullbacks | Moderate (Needs filter) | Medium |
| Trending Bearish | Trend Following / Pullbacks | Moderate (Needs filter) | Medium |
| Ranging Wide | Sweep & Revert | High | High |
| Ranging Narrow | Mean Reversion | High | High |
| Expansion | Breakout / Momentum | High | High |
| Compression | Wait for Breakout | Low (Prone to chop) | Medium |
| News Shock | Stay Flat / Wide Stops | Very Low | Low |
