# Regime Alpha Map — Market Condition Matrix

**Mission**: L4 — Autonomous Alpha Evolution Program  
**Date**: 2026-07-25  
**Engine**: `RegimeClassifier` (Statistical ATR / ADX / BBW Classifier)

---

## 1. Market Regime Taxonomy & Alpha Attribution Matrix

| Market Regime | Performance Expectancy | Winning Components | Losing / Risk Components | Recommended Action |
|---|:---:|---|---|---|
| **TREND_BULLISH** | **VERY HIGH** (Sharpe > 2.5) | SMC BOS, V4 IMCE, TRG Gate | V3 (Overbought RSI triggers premature shorting) | **FULL EXECUTION** |
| **TREND_BEARISH** | **VERY HIGH** (Sharpe > 2.5) | SMC FVG, V4 IMCE, TRG Gate | V3 (Oversold RSI triggers premature buying) | **FULL EXECUTION** |
| **EXPANSION (Breakout)** | **HIGH** (Sharpe > 1.8) | Volatility Expansion, TRG Gate, MOL Gate | C-CLIST (High stress might trigger false veto if DVF was flat prior) | **FULL EXECUTION** |
| **RANGE_WIDE** | **MODERATE** (Sharpe 1.0–1.5) | Order Blocks, V2 SnD/SnR | V4 Expansion signals (triggers false breakout entries) | **REDUCE POSITION SIZING (50%)** |
| **RANGE_NARROW** | **LOW / NEUTRAL** (Sharpe ~0) | TruthKernel, C-CLIST Stress Oracle | All Directional Signals (V1-V4) | **PASS / HIGH THRESHOLD** |
| **COMPRESSION (Squeeze)** | **HIGH EDGE POTENTIAL** | SMC Liquidity Sweeps, BSL/SSL Pools | Directional Momentum | **PREPARE FOR EXPANSION** |
| **NEWS_SHOCK / CRISIS** | **NEGATIVE EXPECTANCY** | TruthKernel Ontological Veto, MetaAgentValidator | All Alpha Providers | **ABSOLUTE VETO (DO NOT TRADE)** |

---

## 2. Dynamic Regime Switching Protocol

```
┌─────────────────────────────────────────────────────────────┐
│                      RegimeClassifier                       │
│      Evaluates: ATR Ratio, Directional Bias, BB Width       │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       [STABLE REGIME]                 [CHAOTIC REGIME]
(TREND / EXPANSION / RANGE)       (NEWS_SHOCK / EXTREME VOL)
               │                               │
               ▼                               ▼
    Enable Active Pipeline          TruthKernel Ontological Veto
    Execute Signals                 Lock Trading Operations
```

---

## 3. Parameter Sensitivity per Regime

| Regime | Optimal TRG Threshold | Optimal TRG Exponent | LHDS Veto Limit | Position Sizing Multiplier |
|---|:---:|:---:|:---:|:---:|
| TREND_BULLISH | 0.30 | 2 | 0.85 | 1.2× |
| TREND_BEARISH | 0.30 | 2 | 0.85 | 1.2× |
| EXPANSION | 0.40 | 2 | 0.80 | 1.0× |
| RANGE_WIDE | 0.50 | 2 | 0.75 | 0.6× |
| COMPRESSION | 0.60 | 3 | 0.70 | 0.5× |
| NEWS_SHOCK | >0.90 | N/A | 0.50 | 0.0× (Blocked) |
