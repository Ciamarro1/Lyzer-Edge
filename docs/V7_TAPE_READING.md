# Lyzer Edge V7 Tape Reading (Level 2 Order Flow Approximation)

## Introduction

In high-frequency quantitative trading, true Level 2 (L2) Order Flow (Tape Reading) processing requires ingesting tens of thousands of tick-level WebSocket events per second. In a Node.js environment like Lyzer Edge's execution plane, this massive event loop penalty creates unacceptable latency, leading to event loop lag, delayed signal execution, and ultimately, slippage.

To solve this, Lyzer Edge V7 employs **Synthetic Tape Reading**. Instead of processing every individual tick, we approximate Level 2 dynamics through intra-candle heuristics using **Volume/Price Effort vs Result** and **Cumulative Volume Delta (CVD)** proxies. This allows high-frequency microscalping filtering without the I/O bottleneck.

## Core Mechanisms

### 1. Volume/Price Effort vs Result (WSA/VSA Heuristics)

We evaluate the effort (volume) against the result (price spread) to identify hidden market dynamics, specifically Absorption and Exhaustion.

*   **Absorption (The Wall):** High volume effort, but minimal price progression (small spread). This indicates a limit order wall absorbing aggressive market orders. If this occurs at key liquidity sweeps or order blocks, it acts as a high-probability reversal filter.
*   **Exhaustion (The Fade):** Declining volume effort as price approaches a structural high or low. The lack of participation indicates the current directional move is exhausted and likely to revert.

**Implementation Logic:**
By analyzing the `Volume / (High - Low)` ratio (Volume per Pip) at the closing seconds of lower timeframe (LTF) candles, we classify the candle's internal aggressive behavior without needing the actual order book.

### 2. Intra-Candle Cumulative Volume Delta (CVD) Proxy

Actual CVD requires bid/ask tick data. We approximate CVD (Synthetic CVD) by dissecting the candle's wick-to-body ratios and analyzing volume distribution based on price location relative to the VWAP or moving averages.

*   **Aggressive Buying Proxy:** If a candle closes near its high with a long lower wick and high relative volume, we attribute the majority of the volume to aggressive buying (positive delta).
*   **Aggressive Selling Proxy:** If a candle closes near its low with a long upper wick and high relative volume, we attribute the volume to aggressive selling (negative delta).

By accumulating these synthetic delta values over a rolling window, we generate a CVD proxy that highlights divergence. For example, if price is making higher highs but Synthetic CVD is making lower highs, it signals structural weakness and impending reversal.

## Performance Benefits

1.  **Zero Event Loop Lag:** Eliminates the need to parse and process thousands of raw WebSocket order book updates.
2.  **Deterministic Execution:** Engine evaluates fixed arrays of OHLCV data, maintaining O(1) or O(N) complexity for bounded N, ensuring stable execution latency.
3.  **High-Frequency Applicability:** Provides enough granular insight into order flow dynamics to filter microscalping signals effectively, rejecting low-quality setups at the execution layer before the TruthKernel is even queried.

## Integration with StreamEngine

This synthetic order flow acts as a precursor filter in the `StreamEngine`. Before a signal passes to the `ExecutionTriggerLayer`, the Tape Reading heuristics must validate the context:
*   Does the Effort vs Result confirm the breakout, or is it an absorption trap?
*   Does the Synthetic CVD support the momentum?

If the tape disagrees with the signal, it is vetoed immediately, preserving capital and avoiding the latency cost of deeper constitutional evaluation.
