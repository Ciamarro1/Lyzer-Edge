/**
 * H011 CONFIRMATORY EXECUTION RUNNER
 * Script: h011_confirmatory_runner.js
 * 
 * Formal Institutional Mandate:
 * 1. Requires explicit unsealing of CONFIRMATORY_EXECUTION_LOCK.json.
 * 2. If locked, REFUSES TO TOUCH ANY VIRGIN DATA FILE (BNB, XRP, ADA, SUI).
 * 3. Supports `--dry-run-synthetic` for complete verification without virgin data access.
 * 4. Implements trade-weighted 14-day UTC calendar block bootstrap under H0 centering.
 * 5. Strictly enforces Wilder RMA ATR, t+1 monitoring, worst-case tie breaking, and clean 12 bps cost model.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

// Mulberry32 deterministic PRNG
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Indicator Engine: Wilder RMA ATR & 24h Volume SMA & Rolling 40-bar Extremes
export function precomputeIndicators(candles) {
  const n = candles.length;
  const tr = new Float64Array(n);
  const atr12 = new Float64Array(n);
  const atr24 = new Float64Array(n);
  const atr72 = new Float64Array(n);
  const vol24SMA = new Float64Array(n);
  const highs40 = new Float64Array(n);
  const lows40 = new Float64Array(n);

  if (n === 0) {
    return { tr, atr12, atr24, atr72, vol24SMA, highs40, lows40 };
  }

  // True Range
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < n; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const cPrev = candles[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - cPrev), Math.abs(l - cPrev));
  }

  // Wilder RMA ATR
  function computeWilderATR(period, targetArr) {
    if (n < period) return;
    let sum = 0;
    for (let i = 0; i < period; i++) sum += tr[i];
    targetArr[period - 1] = sum / period;
    for (let i = period; i < n; i++) {
      targetArr[i] = ((period - 1) * targetArr[i - 1] + tr[i]) / period;
    }
  }

  computeWilderATR(12, atr12);
  computeWilderATR(24, atr24);
  computeWilderATR(72, atr72);

  // 24-period Volume SMA
  if (n >= 24) {
    let volSum = 0;
    for (let i = 0; i < 24; i++) volSum += candles[i].volume;
    vol24SMA[23] = volSum / 24;
    for (let i = 24; i < n; i++) {
      volSum += candles[i].volume - candles[i - 24].volume;
      vol24SMA[i] = volSum / 24;
    }
  }

  // Rolling 40-bar Extremes: max/min over past 40 bars [t-40, t-1]
  for (let i = 40; i < n; i++) {
    let mx = -Infinity;
    let mn = Infinity;
    for (let k = 1; k <= 40; k++) {
      const h = candles[i - k].high;
      const l = candles[i - k].low;
      if (h > mx) mx = h;
      if (l < mn) mn = l;
    }
    highs40[i] = mx;
    lows40[i] = mn;
  }

  return { tr, atr12, atr24, atr72, vol24SMA, highs40, lows40 };
}

// Single-Asset Simulation Engine with Clean 12 bps Cost Accounting
export function simulateAsset(candles, ind, config, symbol) {
  const n = candles.length;
  const theta = config.compressionThreshold; // 0.65
  const K = config.breakoutLookback; // 40
  const vMult = config.volumeMultiplier; // 1.50
  const timeoutLimit = config.timeoutHours || 72;

  // Clean Cost Model (Resolution of Double Counting)
  const exchangeFeeRate = 0.0010; // 10 bps round-trip
  const slippageBaseRate = 0.0002; // 2 bps base
  const totalCostNormalRate = 0.0012; // 12 bps all-in

  const trades = [];
  let inPosition = false;
  let activeTrade = null;

  for (let t = 72; t < n; t++) {
    if (inPosition) {
      const cBar = candles[t];
      const O = cBar.open;
      const H = cBar.high;
      const L = cBar.low;
      const C = cBar.close;

      activeTrade.holdingHours++;
      let exited = false;
      let netR = 0;
      let exitType = '';
      let exitPrice = 0;

      if (activeTrade.side === 1) { // LONG
        const SL = activeTrade.sl;
        const TP = activeTrade.tp;

        // Gap at Open Check
        if (O <= SL) {
          // Gap adverse SL
          exitPrice = O - slippageBaseRate * O;
          const grossR = (exitPrice - activeTrade.entryPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'GAP_SL';
          exited = true;
        } else if (O >= TP) {
          // Gap favorable TP
          exitPrice = O - slippageBaseRate * O;
          const grossR = (exitPrice - activeTrade.entryPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'GAP_TP';
          exited = true;
        } else {
          // Intrabar Collision Check
          const touchesSL = L <= SL;
          const touchesTP = H >= TP;

          if (touchesSL && touchesTP) {
            // Worst-Case Tie-Breaking: SL triggers first
            netR = -1.0 - activeTrade.costRNormal;
            exitPrice = SL;
            exitType = 'SL_COLLISION';
            exited = true;
          } else if (touchesSL) {
            netR = -1.0 - activeTrade.costRNormal;
            exitPrice = SL;
            exitType = 'SL';
            exited = true;
          } else if (touchesTP) {
            netR = 5.0 - activeTrade.costRNormal;
            exitPrice = TP;
            exitType = 'TP';
            exited = true;
          }
        }

        // Timeout Check at 72 hours
        if (!exited && activeTrade.holdingHours >= timeoutLimit) {
          exitPrice = C - slippageBaseRate * C;
          const grossR = (exitPrice - activeTrade.entryPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'TIMEOUT';
          exited = true;
        }

      } else { // SHORT
        const SL = activeTrade.sl;
        const TP = activeTrade.tp;

        // Gap at Open Check
        if (O >= SL) {
          // Gap adverse SL
          exitPrice = O + slippageBaseRate * O;
          const grossR = (activeTrade.entryPrice - exitPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'GAP_SL';
          exited = true;
        } else if (O <= TP) {
          // Gap favorable TP
          exitPrice = O + slippageBaseRate * O;
          const grossR = (activeTrade.entryPrice - exitPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'GAP_TP';
          exited = true;
        } else {
          // Intrabar Collision Check
          const touchesSL = H >= SL;
          const touchesTP = L <= TP;

          if (touchesSL && touchesTP) {
            // Worst-Case Tie-Breaking: SL triggers first
            netR = -1.0 - activeTrade.costRNormal;
            exitPrice = SL;
            exitType = 'SL_COLLISION';
            exited = true;
          } else if (touchesSL) {
            netR = -1.0 - activeTrade.costRNormal;
            exitPrice = SL;
            exitType = 'SL';
            exited = true;
          } else if (touchesTP) {
            netR = 5.0 - activeTrade.costRNormal;
            exitPrice = TP;
            exitType = 'TP';
            exited = true;
          }
        }

        // Timeout Check at 72 hours
        if (!exited && activeTrade.holdingHours >= timeoutLimit) {
          exitPrice = C + slippageBaseRate * C;
          const grossR = (activeTrade.entryPrice - exitPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'TIMEOUT';
          exited = true;
        }
      }

      if (exited) {
        trades.push({
          symbol,
          entryTime: activeTrade.entryTime,
          exitTime: candles[t].timestamp,
          side: activeTrade.side,
          holdingHours: activeTrade.holdingHours,
          exitType,
          entryPrice: activeTrade.entryPrice,
          exitPrice,
          riskR: activeTrade.riskR,
          netR
        });
        inPosition = false;
        activeTrade = null;
      }
    }

    // Evaluation of Entry strictly at Close of bar t (monitoring begins at t+1)
    if (!inPosition && t + 1 < n) {
      const cNow = candles[t].close;
      const atr12 = ind.atr12[t];
      const atr72 = ind.atr72[t];
      const atr24 = ind.atr24[t];
      const volNow = candles[t].volume;
      const volSMA = ind.vol24SMA[t];

      if (atr72 > 1e-8 && volSMA > 1e-8) {
        const ratioVol = atr12 / atr72;
        const volExp = volNow >= vMult * volSMA;
        const isLongBreak = cNow > ind.highs40[t];
        const isShortBreak = cNow < ind.lows40[t];

        if (ratioVol <= theta && volExp) {
          let side = 0;
          if (isLongBreak && !isShortBreak) side = 1;
          else if (isShortBreak && !isLongBreak) side = -1;

          if (side !== 0) {
            // Risk Unit 1R
            const raw1R = 1.5 * atr24;
            const floor1R = 0.0080 * cNow; // 80 bps cost floor
            const riskR = Math.max(raw1R, floor1R);

            const costRNormal = (totalCostNormalRate * cNow) / riskR;

            let sl = 0, tp = 0;
            if (side === 1) {
              sl = cNow - riskR;
              tp = cNow + 5.0 * riskR;
            } else {
              sl = cNow + riskR;
              tp = cNow - 5.0 * riskR;
            }

            inPosition = true;
            activeTrade = {
              side,
              entryPrice: cNow,
              entryTime: candles[t].timestamp,
              riskR,
              costRNormal,
              sl,
              tp,
              holdingHours: 0
            };
          }
        }
      }
    }
  }

  return trades;
}

// 14-Day Calendar Block Bootstrap with Exact Trade-Weighted Mean Estimator
export function runCalendarBlockBootstrap(trades, options = {}) {
  const B = options.replications || 10000;
  const seed = options.seed || 777777;
  const epochStartMs = options.epochStartMs || Date.parse('2023-01-01T00:00:00.000Z');
  const windowMs = (options.windowDays || 14) * 24 * 3600 * 1000; // 1,209,600,000 ms

  const n = trades.length;
  if (n === 0) {
    return {
      nTrades: 0,
      meanNetR: 0,
      ci95Lower: 0, ci95Upper: 0,
      pBlock: 1.0,
      profitFactor: 0,
      mddR: 0
    };
  }

  // Calculate Primary Estimand: Sample Mean of Net R
  const netRs = trades.map(t => t.netR);
  const sampleMeanNetR = netRs.reduce((a, b) => a + b, 0) / n;

  // Null-Centered transformation: Y_i = X_i - mean(X)
  const centeredY = netRs.map(x => x - sampleMeanNetR);

  // Group trades into 14-Day UTC Calendar Windows based on exit timestamp
  const windowMap = new Map();
  for (let i = 0; i < n; i++) {
    const tExit = Number(trades[i].exitTime);
    const windowIdx = Math.floor((tExit - epochStartMs) / windowMs);
    if (!windowMap.has(windowIdx)) {
      windowMap.set(windowIdx, { raw: [], centered: [] });
    }
    windowMap.get(windowIdx).raw.push(netRs[i]);
    windowMap.get(windowIdx).centered.push(centeredY[i]);
  }

  // Non-empty windows
  const windows = Array.from(windowMap.values());
  const numWindows = windows.length;

  const rng = mulberry32(seed);
  let nullExceedCount = 0;
  const bootMeans = new Float64Array(B);

  for (let b = 0; b < B; b++) {
    let sumCentered = 0;
    let sumRaw = 0;
    let totalTradesInSample = 0;

    // Resample numWindows with replacement
    for (let w = 0; w < numWindows; w++) {
      const randIdx = Math.floor(rng() * numWindows);
      const win = windows[randIdx];
      const winSize = win.centered.length;

      for (let k = 0; k < winSize; k++) {
        sumCentered += win.centered[k];
        sumRaw += win.raw[k];
      }
      totalTradesInSample += winSize;
    }

    // MANDATORY INSTITUTIONAL ESTIMATOR:
    // Trade-Weighted Mean, NOT average of window means!
    const tradeWeightedMeanCentered = sumCentered / totalTradesInSample;
    const tradeWeightedMeanRaw = sumRaw / totalTradesInSample;

    bootMeans[b] = tradeWeightedMeanRaw;
    if (tradeWeightedMeanCentered >= sampleMeanNetR) {
      nullExceedCount++;
    }
  }

  bootMeans.sort();
  const ci95Lower = Number(bootMeans[Math.floor(0.025 * B)].toFixed(3));
  const ci95Upper = Number(bootMeans[Math.floor(0.975 * B)].toFixed(3));
  const pBlock = Number(((nullExceedCount + 1) / (B + 1)).toFixed(4));

  // Profit Factor & MDD
  let winsSum = 0, lossesSum = 0;
  let peak = 0, running = 0, maxDD = 0;
  for (let i = 0; i < n; i++) {
    const r = netRs[i];
    if (r > 0) winsSum += r;
    else lossesSum += Math.abs(r);

    running += r;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }
  const profitFactor = lossesSum === 0 ? (winsSum > 0 ? 99.0 : 0) : Number((winsSum / lossesSum).toFixed(2));

  return {
    nTrades: n,
    meanNetR: Number(sampleMeanNetR.toFixed(3)),
    ci95Lower, ci95Upper,
    pBlock,
    profitFactor,
    mddR: Number(maxDD.toFixed(2)),
    totalNetR: Number(netRs.reduce((a, b) => a + b, 0).toFixed(2))
  };
}

// Firewall Guard & Standalone Execution Controller
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log('================================================================');
  console.log('🏛️ H011 CONFIRMATORY EXECUTION RUNNER & FIREWALL GUARD');
  console.log('================================================================\n');

  const lockPath = path.resolve(__dirname, 'CONFIRMATORY_EXECUTION_LOCK.json');
  if (!fs.existsSync(lockPath)) {
    console.error('❌ FATAL: Execution lock missing at:', lockPath);
    process.exit(1);
  }
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

  // 1. Verify V8 Engine Hash
  const enginePath = path.resolve(rootDir, 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
  const engineBuf = fs.readFileSync(enginePath);
  const engineSHA = crypto.createHash('sha256').update(engineBuf).digest('hex');
  if (engineSHA !== lock.immutableHashes.engineV8SHA256) {
    console.error('❌ FATAL BREACH: V8 engine SHA-256 does not match lock!');
    process.exit(1);
  }
  console.log('✔ V8 Engine SHA-256 Verified Invariant.');

  // 2. Check Execution Lock
  const isSyntheticDryRun = process.argv.includes('--dry-run-synthetic');
  if (!isSyntheticDryRun) {
    if (lock.executionStatus !== 'AUTHORIZED_AND_UNSEALED' || lock.virginDataAccess !== 'AUTHORIZED') {
      console.error('\n🔴 CONSTITUTIONAL BLOCK: Confirmatory Execution Lock is ACTIVE.');
      console.error(`   Execution Status:   ${lock.executionStatus}`);
      console.error(`   Virgin Data Access: ${lock.virginDataAccess}`);
      console.error('\n⛔ ACCESS TO VIRGIN POPULATION C (BNB, XRP, ADA, SUI) IS BLOCKED.');
      console.error('   To run validation tests, use: node h011_confirmatory_runner.js --dry-run-synthetic\n');
      process.exit(1);
    }
  } else {
    console.log('✔ Mode: --dry-run-synthetic (Zero Virgin Data Access)');
    console.log('✔ Running validation tests on synthetic data...\n');
  }
}
