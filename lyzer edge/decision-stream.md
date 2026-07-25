# Plan: Decision Stream & Signal Sandbox - Release 1.7.6

Architectural plan to build the Signal Sandbox, real historical replay, and the interactive Decision Stream terminal UI for Lyzer Edge Analyst.

## Overview
This release implements a complete live-running simulator dashboard. It feeds real historical candle data from 2024 (BTCUSDT/ETHUSDT) into the Signal Engine, Truth Kernel, Risk Sizing, and ECA Layer, and displays the decisions dynamically.

## Project Type
- **Type:** WEB (Node.js engine & Vanilla JS frontend UI)

## Success Criteria
- [ ] Real-looking historical candle data series loaded from `src/db/historicalData.js`.
- [ ] Signal engine calculates RSI, EMAs, and Volume, outputting signal metrics: `signal`, `confidence`, `reasons`, `regime`, `volatility`, and `trendStrength`.
- [ ] Decision Stream UI shows:
  - **Decision Explanation Panel**: Indicator cross triggers.
  - **Kernel Breakdown**: Weight details for context confidences.
  - **ECA Overlay**: Real-time veto overlays on constitutional breaches.
  - **Paper Account Timeline**: Equity curves and drawdowns.
- [ ] Play, Pause, Speed, and Reset controls work smoothly.

## Tech Stack
- **Vanilla Javascript (ES Modules)**
- **CSS3 (Modern glassmorphism, animations)**

## File Structure
- `src/db/historicalData.js` — Real BTCUSDT / ETHUSDT candle data
- `src/engine/signalEngine.js` — Tech indicators & price logic
- `src/components/DecisionStream.js` — Live streaming terminal view with breakdowns
- `src/app.js` — Navigation and route registration
- `verify_stream.js` — Offline test runner script

---

## Task Breakdown

### Task 1: Create historicalData.js
- **Agent**: `backend-specialist`
- **Skills**: `clean-code`
- **Priority**: P0
- **Dependencies**: None
- **INPUT**: Real hourly candle sequences for BTC (60k-95k) and ETH (2.5k-4k).
- **OUTPUT**: File `src/db/historicalData.js`.
- **VERIFY**: Check import contains valid arrays of OHLCV candles.

### Task 2: Create signalEngine.js
- **Agent**: `backend-specialist`
- **Skills**: `clean-code`
- **Priority**: P0
- **Dependencies**: Task 1
- **INPUT**: Indicators logic (EMA 20/50, RSI 14, Volume) outputting enriched signal payloads.
- **OUTPUT**: File `src/engine/signalEngine.js`.
- **VERIFY**: Check outputs conform to target contract.

### Task 3: Create DecisionStream.js Component
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`
- **Priority**: P1
- **Dependencies**: Task 2
- **INPUT**: HTML layout for explanation panels, kernel breakdowns, ECA overlays, and paper timelines.
- **OUTPUT**: File `src/components/DecisionStream.js`.
- **VERIFY**: Test mounting in DOM and verify css animations.

### Task 4: Integrate into App routing (app.js)
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`
- **Priority**: P1
- **Dependencies**: Task 3
- **INPUT**: Route registration in `ROUTES` and `NAV_ITEMS` in `src/app.js`.
- **OUTPUT**: Modified `src/app.js`.
- **VERIFY**: Clicking sidebar launches stream.

### Task 5: Create verify_stream.js Test Script
- **Agent**: `test-engineer`
- **Skills**: `testing-patterns`
- **Priority**: P2
- **Dependencies**: Task 2
- **INPUT**: Test script importing signalEngine and asserting indicator accuracy.
- **OUTPUT**: File `verify_stream.js` in the project root.
- **VERIFY**: Run `node verify_stream.js` and verify it logs `PASS`.

---

## Phase X: Verification
- [ ] No purple/violet hex codes used in UI.
- [ ] Socratic Gate was respected.
- [ ] Full test script `node verify_stream.js` reports success.
- [ ] All checklist validation scripts pass.
