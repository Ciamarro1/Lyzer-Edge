# Create Backend Modules

## Goal
Create the historical candle generator and the signal engine module to support technical analysis.

## Tasks
- [x] Task 1: Create `src/db/historicalData.js` with a deterministic, seeded pseudo-random candle generator for BTCUSDT and ETHUSDT. → Verify: Function returns 500 candles each, with specified trend patterns and exact same values on repeat calls.
- [x] Task 2: Create `src/engine/signalEngine.js` with `SignalEngine` class implementing EMA 20, EMA 50, RSI 14, and volume spike calculations. → Verify: `processCandle` returns correct signals, confidence, reasons, and regime classification.
- [x] Task 3: Add validation verification using a test file or direct execution script. → Verify: Calculation output checks out against expected mathematical values.

## Done When
- Two new modules are successfully written in their respective directories.
- BTCUSDT and ETHUSDT each have 500 candles matching the trending, consolidating, dropping, and recovering patterns.
- EMA, RSI, and Volume spikes calculate correctly under normal and boundary conditions.
