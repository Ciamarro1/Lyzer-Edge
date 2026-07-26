# 🏛️ OpenMobius Skill — Architectural Analysis & Internal Flow

**Status**: AUDIT COMPLETE  
**Category**: Institutional Evidence Engine Architecture  
**Target Repository**: `https://github.com/MobiusQuant/OpenMobius-skill`  
**Classification**: Non-Decision Probabilistic Observation Engine  

---

## 1. Overview & Core Purpose

OpenMobius is a quantitative market structure annotation framework designed for Smart Money Concepts (SMC) and Inner Circle Trader (ICT) market geometry parsing.

In its native form, OpenMobius provides AI agents with tools to parse K-line data, identify Fair Value Gaps (FVG), Order Blocks (OB), Break of Structure (BOS), Change of Character (CHoCH), and Liquidity Sweeps.

### Institutional Boundary Rule (The Supreme Axiom)
> **SUPREME RULE**: OpenMobius MUST NOT make trading execution decisions (BUY/SELL/LONG/SHORT). It is strictly classified as a **Probabilistic Evidence Generator (Observation Layer)** feeding evidence into the Lyzer Edge decision pipeline:
> $$\text{OpenMobius Evidence} \longrightarrow \text{Reality Orchestrator} \longrightarrow \text{Constitutional Court} \longrightarrow \text{Decision Ledger} \longrightarrow \text{Execution}$$

---

## 2. Component Breakdown & Mathematical Models

### 2.1 Market Structure Parsing (BOS / CHoCH)
- **Mathematical Form**: Local extremum identification over rolling window $W$:
  $$H_t = \max(P_{t-W \dots t+W}), \quad L_t = \min(P_{t-W \dots t+W})$$
- **Break of Structure (BOS)**: Triggered when close price $P_c > H_{\text{prev}}$ in an uptrend, signifying trend continuation.
- **Change of Character (CHoCH)**: Triggered when close price $P_c < L_{\text{prev}}$ in an uptrend, indicating potential structural reversal.

### 2.2 Fair Value Gap (FVG) Detection
- **Definition**: Price imbalance where Candle $t-2$ high is strictly lower than Candle $t$ low (Bullish FVG):
  $$\text{FVG}_{\text{bull}} = (P_{\text{low}, t} - P_{\text{high}, t-2}) > \theta_{\text{min\_gap}}$$
- **Mitigation Tracking**: Tracked until price retraces into the gap bounds $[\text{FVG}_{\text{low}}, \text{FVG}_{\text{high}}]$.

### 2.3 Order Block (OB) Identification
- **Bullish OB**: Last down candle prior to an aggressive impulsive up-move that breaks structure (BOS).
- **Bearish OB**: Last up candle prior to an aggressive impulsive down-move.

---

## 3. Input / Output Data Contracts

### 3.1 Input Contract (`MarketCandleStream`)
```typescript
interface MarketCandleStream {
  symbol: string;
  timeframe: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

### 3.2 Output Contract (`OpenMobiusObservation`)
```typescript
interface OpenMobiusObservation {
  symbol: string;
  timestamp: number;
  regime: 'TRENDING_BULL' | 'TRENDING_BEAR' | 'RANGING' | 'HIGH_VOLATILITY';
  orderBlocks: Array<{ type: 'BULLISH' | 'BEARISH'; top: number; bottom: number; mitigationStatus: number }>;
  fairValueGaps: Array<{ type: 'BULLISH' | 'BEARISH'; top: number; bottom: number; filledRatio: number }>;
  structure: { bosCount: number; chochDetected: boolean; trendDirection: 1 | -1 | 0 };
  evidenceMetrics: {
    confidence: number;      // [0.0 - 1.0]
    probability: number;     // [0.0 - 1.0]
    uncertainty: number;     // [0.0 - 1.0]
    signalQuality: number;   // [0.0 - 1.0]
    signalDecayHalfLifeMs: number;
  };
  provenance: {
    source: 'OPENMOBIUS_EVIDENCE_ENGINE';
    realityTag: 'OBSERVED_REALITY' | 'INFERRED_REALITY';
    minRuntimeVersion: '3.4.0';
  };
}
```
