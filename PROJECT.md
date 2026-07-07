# Project: lyzer-edge Hierarchical SMC Execution Engine Transformation

## Architecture
This project transforms the existing `StreamEngine` into a hierarchical Smart Money Concepts (SMC) execution engine driven by synchronized multi-timeframe market structure (H4/H1 → M15 → M5 → M1).

```
[Market Data Feed] -> [TimeframeManager]
                            | (HTF / MTF / LTF candle queues)
                            v
   +-------------------+----+-------------------+-------------------+
   |                   |                        |                   |
   v                   v                        v                   v
[TrendEngine]   [StructureEngine]       [LiquidityEngine]     [TargetEngine]
(EMA / BOS Bias) (Fractals, BOS, CHOCH)  (BSL/SSL Pools, Sweeps) (OB / FVG / Premium)
   |                   |                        |                   |
   +-------------------+----+-------------------+-------------------+
                            | (SMC Analysis States)
                            v
                     [EntryEngine] (Confluence Scoring)
                            | (Signal & Trade Proposal)
                            v
                     [RiskEngine] (Drawdown, RRR verification)
                            | (Validated Entry Details)
                            v
                     [PositionManager] (BE, Partials, Trailing SL)
                            |
                            v
                     [ChartEngine] (Geometry serialize for UI)
```

- All 9 SMC modules will reside in `packages/lyzer-shared/src/smc/` as ESM JavaScript modules.
- `StreamEngine.js` will import these modules and call them inside `processCandle` to orchestrate data ingestion, signal evaluation, court arbitration, risk filters, execution, and position management.

## Milestones
| # | Name | Scope | Dependencies | Status | Conv ID |
|---|---|---|---|---|---|
| 1 | M1: E2E Testing Track | Create opaque-box E2E test suite in `lyzer edge/tests/e2e_smc/`, verifying Tiers 1-4. Publish `TEST_READY.md` and `TEST_INFRA.md`. | None | IN_PROGRESS | e40d0257-8886-4d18-8b7b-32189a69dbba |
| 2 | M2: MTF Processing & Trend | Implement `TimeframeManager` (candle builder/caching, no-lookahead) and `TrendEngine` (H4/H1 bias consensus). | None | IN_PROGRESS | e63d07c9-ece8-4f7d-98df-7a6938b84d43 |
| 3 | M3: Structure & Liquidity | Implement `StructureEngine` (fractals, swing highs/lows, BOS, CHOCH) and `LiquidityEngine` (BSL, SSL, sweeps, EQH/EQL) returning structured `LiquidityZone`s. | M2 | PLANNED | e63d07c9-ece8-4f7d-98df-7a6938b84d43 |
| 4 | M4: Entry, Risk & Position | Implement `TargetEngine` (OB, FVG, premium/discount), `RiskEngine` (RRR, sizing, filters), `EntryEngine` (confluence scoring), and `PositionManager` (BE, trailing, partials). | M3 | PLANNED | e63d07c9-ece8-4f7d-98df-7a6938b84d43 |
| 5 | M5: Chart overlays & UI | Implement `ChartEngine` serialization and extend frontend `LiveTradingView.js` with toggleable overlays (FVG, OB, sweeps, BOS/CHOCH, Risk Box). | M4 | PLANNED | e63d07c9-ece8-4f7d-98df-7a6938b84d43 |
| 6 | M6: Full Integration & E2E | Integrate SMC modules in `StreamEngine.js`, replace legacy engines, and pass 100% of E2E tests (Phase 1). Perform adversarial coverage hardening (Phase 2). | M1, M5 | PLANNED | e63d07c9-ece8-4f7d-98df-7a6938b84d43 |

## Interface Contracts
### Module Signatures
- **TimeframeManager**:
  - `update(candle)`: updates the internal MTF candle structures dynamically.
  - `getCandles(timeframe, limit, includeUnclosed)`: returns array of candles.
  - `getMtfState()`: returns a snapshot of all active/closed candle structures.
- **TrendEngine**:
  - `evaluate(tfManager)`: returns `{ bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL', strength: number }`.
- **StructureEngine**:
  - `analyze(tfManager)`: returns `{ markers: [{ type, direction, price, timestamp }], range: { high, low } }`.
- **LiquidityEngine**:
  - `evaluate(tfManager, marketStructure)`: returns `{ zones: [LiquidityZone], sweep: { swept: 'BSL' | 'SSL' | null, level: number } }`.
- **TargetEngine**:
  - `map(tfManager, marketStructure, liquidityState)`: returns `{ tp: number, sl: number, unmitigatedOBs: [], activeFVGs: [], zones: [] }`.
- **RiskEngine**:
  - `validate(entryProposal, maxDailyCapital, dailyCapitalUsed)`: returns `{ approved: boolean, quantity: number, rrr: number, stopLoss: number, takeProfit: number, reason: string }`.
- **EntryEngine**:
  - `check(trendState, marketStructure, liquidityState, targetState)`: returns `{ trigger: boolean, direction: 'LONG' | 'SHORT', entryPrice: number, confidence: number }`.
- **PositionManager**:
  - `update(activePosition, candle, marketStructure)`: returns `{ closed: boolean, modified: boolean, activePosition: object }`.
- **ChartEngine**:
  - `package(marketStructure, liquidityState, targetState)`: returns `{ overlays: [] }` formatted for UI client.

## Code Layout
- **SMC Engine Modules**: `packages/lyzer-shared/src/smc/`
- **StreamEngine**: `lyzer edge/backend/streamEngine.js`
- **Frontend Live Chart Component**: `lyzer edge/src/components/LiveTradingView.js`
- **E2E SMC Tests**: `lyzer edge/tests/e2e_smc/`
- **Verification Scripts**: `lyzer edge/verify_*.js`
