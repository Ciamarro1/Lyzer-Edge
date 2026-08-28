import { findSwings } from '../../packages/lyzer-shared/src/providers/openmobius/pivots.js';
import { analyzeStructure } from '../../packages/lyzer-shared/src/providers/openmobius/structure.js';
import { find_fvgs, find_displacements, find_volume_anomalies, calc_atr } from '../../packages/lyzer-shared/src/providers/openmobius/imbalance.js';
import { find_sweeps } from '../../packages/lyzer-shared/src/providers/openmobius/liquidity.js';
import { find_order_blocks } from '../../packages/lyzer-shared/src/providers/openmobius/orderBlocks.js';
import { MarketProfileEngine } from '../../packages/lyzer-shared/src/providers/v6_market_profile.js';
import { TapeReadingEngine } from '../../packages/lyzer-shared/src/providers/v7_tape_reading.js';
import { getLatestFundingRate } from './datasetSnapshot.js';

/**
 * CAUSAL SIGNAL ENGINE — Composable Multi-Engine Evaluator for Batch 003
 *
 * Wraps OpenMobius modules + V6 MarketProfile + V7 TapeReading into a unified
 * interface that produces DECOMPOSED predicate objects. Each predicate can be
 * independently masked for ablation testing.
 *
 * RULE: This file DOES NOT modify any existing engine. It only imports and composes.
 */

const tapeEngine = new TapeReadingEngine(20);

/**
 * Evaluates a single bar position against all available microstructural engines.
 * Returns a decomposed predicate object where each field is independently testable.
 *
 * @param {number} i - Current bar index in the full candles array
 * @param {Array} candles - Full candles array
 * @param {Array} lookbackBuffer - Rolling window of recent candles (up to 300)
 * @param {Array} funding - Funding rate array
 * @param {Object} config - Family-specific thresholds
 * @returns {Object} Decomposed predicates
 */
export function evaluateBar(i, candles, lookbackBuffer, funding, config = {}) {
  const c = candles[i];
  const req = config.requiredModules; // Array or Set of needed modules (e.g. ['sweep', 'volumeAnomaly'])
  const needAll = !req;

  const result = {
    sweep: { detected: false, type: null, wickSize: 0, sweptLevel: 0 },
    volumeAnomaly: { detected: false, ratio: 0, direction: null },
    displacement: { detected: false, magnitudeAtr: 0, direction: null },
    structure: { event: null, type: null, bias: 'FLAT' },
    fvg: { detected: false, type: null, size: 0 },
    exhaustion: { detected: false, signal: 'NEUTRAL', narrative: null, confidence: 0 },
    marketProfile: { poc: 0, vah: 0, val: 0, priceLocation: 'UNKNOWN' },
    funding: { rate: 0, isExtreme: false, percentile: 0.5 },
    orderBlock: { detected: false, type: null, displacementAtr: 0 }
  };

  if (!lookbackBuffer || lookbackBuffer.length < 30) return result;

  // --- SWEEP & STRUCTURE DETECTION ---
  const needSweep = needAll || req.includes('sweep');
  const needStructure = needAll || req.includes('structure');

  if (needSweep || needStructure) {
    const swingLeft = config.swingLeft || 3;
    const swingRight = config.swingRight || 2;
    const sweepLookback = config.sweepLookback || 15;
    const pivotWindow = lookbackBuffer.slice(-Math.max(60, sweepLookback + 10));

    const swings = findSwings(pivotWindow, swingLeft, swingRight);

    if (needSweep) {
      const sweeps = find_sweeps(pivotWindow, swings, sweepLookback);
      const currentSweeps = sweeps.filter(s => s.sweep_candle_index === pivotWindow.length - 1);
      if (currentSweeps.length > 0) {
        const sweep = currentSweeps[currentSweeps.length - 1];
        result.sweep = {
          detected: true,
          type: sweep.type,
          wickSize: sweep.wick_size,
          sweptLevel: sweep.swept_level
        };
      }
    }

    if (needStructure) {
      const structureResult = analyzeStructure(swings);
      if (structureResult.events && structureResult.events.length > 0) {
        const lastEvent = structureResult.events[structureResult.events.length - 1];
        result.structure = {
          event: lastEvent.type,
          type: lastEvent.type,
          bias: lastEvent.type.startsWith('bullish') ? 'BULLISH' : 'BEARISH'
        };
      }
    }
  }

  // --- VOLUME ANOMALY ---
  if (needAll || req.includes('volumeAnomaly')) {
    const volMult = config.volumeAnomalyMult || 2.0;
    const volWindow = lookbackBuffer.slice(-25);
    const volAnomalies = find_volume_anomalies(volWindow, 20, volMult);
    const currentVolAnomaly = volAnomalies.filter(v => v.candle_index === volWindow.length - 1);
    if (currentVolAnomaly.length > 0) {
      result.volumeAnomaly = {
        detected: true,
        ratio: currentVolAnomaly[0].volume_ratio,
        direction: currentVolAnomaly[0].direction
      };
    }
  }

  // --- DISPLACEMENT ---
  if (needAll || req.includes('displacement')) {
    const dispAtrMult = config.displacementAtrMult || 2.0;
    const dispWindow = lookbackBuffer.slice(-20);
    const displacements = find_displacements(dispWindow, dispAtrMult);
    const currentDisp = displacements.filter(d => d.candle_index === dispWindow.length - 1);
    if (currentDisp.length > 0) {
      result.displacement = {
        detected: true,
        magnitudeAtr: currentDisp[0].magnitude_atr,
        direction: currentDisp[0].direction
      };
    }
  }

  // --- FVG ---
  if (needAll || req.includes('fvg')) {
    const fvgMinSize = config.fvgMinSizeAtr || 0.2;
    const fvgWindow = lookbackBuffer.slice(-15);
    const fvgs = find_fvgs(fvgWindow, fvgMinSize);
    const recentFvgs = fvgs.filter(f => f.age_bars <= 3);
    if (recentFvgs.length > 0) {
      const fvg = recentFvgs[recentFvgs.length - 1];
      result.fvg = {
        detected: true,
        type: fvg.type,
        size: fvg.size,
        top: fvg.top,
        bottom: fvg.bottom,
        zone: { top: fvg.top, bottom: fvg.bottom, type: fvg.type }
      };
    }
  }

  // --- TAPE READING (V7): Exhaustion / Absorption / CVD Divergence ---
  if (needAll || req.includes('exhaustion')) {
    const tapeWindow = lookbackBuffer.slice(-30);
    const tapeResult = tapeEngine.reconstruct(tapeWindow);
    if (tapeResult.signal !== 'NEUTRAL') {
      result.exhaustion = {
        detected: true,
        signal: tapeResult.signal,
        narrative: tapeResult.narrative,
        confidence: tapeResult.confidence,
        methodology: 'PROXY_ORDER_FLOW'
      };
    }
  }

  // --- MARKET PROFILE (V6) ---
  if (needAll || req.includes('marketProfile') || req.includes('vaRejection')) {
    const mpLookback = config.marketProfileLookback || 50;
    const mpWindow = lookbackBuffer.slice(-mpLookback);
    const binSize = config.binSize || 10;
    const mpEngine = new MarketProfileEngine({ lookback: mpLookback, binSize });
    const mtf = { slow: mpWindow, intermediate: mpWindow, fast: mpWindow };
    const mpResult = mpEngine.reconstruct(mtf);
    if (mpResult && (mpResult.vah !== undefined || mpResult.valueArea)) {
      const va = mpResult.valueArea || mpResult;
      const vaShift = config.vaShiftPct || 0;
      const poc = va.poc ? va.poc * (1 + vaShift) : 0;
      const vah = va.vah ? va.vah * (1 + vaShift) : 0;
      const val = va.val ? va.val * (1 + vaShift) : 0;

      const price = c.close;
      let priceLocation = 'INSIDE_VA';
      if (price > vah) priceLocation = 'ABOVE_VA';
      else if (price < val) priceLocation = 'BELOW_VA';

      const piercedBelow = (c.low < val && c.close >= val);
      const piercedAbove = (c.high > vah && c.close <= vah);

      result.marketProfile = {
        poc,
        vah,
        val,
        priceLocation,
        piercedBelow,
        piercedAbove,
        distanceToPOC: poc > 0 ? Math.abs(price - poc) / poc : 0,
        vaShiftApplied: vaShift
      };
    }
  }

  // --- FUNDING ---
  if (needAll || req.includes('funding')) {
    const fundingRate = getLatestFundingRate(funding, c.closeTime);
    result.funding = {
      rate: fundingRate,
      isExtreme: false,
      percentile: 0.5
    };
  }

  // --- ORDER BLOCKS ---
  if (needAll || req.includes('orderBlock')) {
    const obAtrMult = config.orderBlockAtrMult || 1.5;
    const obWindow = lookbackBuffer.slice(-30);
    const obs = find_order_blocks(obWindow, obAtrMult);
    const recentObs = obs.filter(ob => ob.age_bars <= 5);
    if (recentObs.length > 0) {
      const ob = recentObs[recentObs.length - 1];
      result.orderBlock = {
        detected: true,
        type: ob.type,
        displacementAtr: ob.displacement_atr
      };
    }
  }

  result.orderFlowProxy = 'PROXY_ORDER_FLOW';

  return result;
}

/**
 * Computes funding rate percentiles over the full dataset for Stage 0 / Family 4.
 */
export function computeFundingPercentiles(funding, candles) {
  const rates = [];
  for (const c of candles) {
    rates.push(getLatestFundingRate(funding, c.closeTime));
  }
  rates.sort((a, b) => a - b);
  const p5 = rates[Math.floor(rates.length * 0.05)];
  const p95 = rates[Math.floor(rates.length * 0.95)];
  return { p5, p95, rates };
}

/**
 * Computes ATR for a lookback buffer.
 */
export function computeATR(lookbackBuffer, period = 14) {
  return calc_atr(lookbackBuffer, period);
}
