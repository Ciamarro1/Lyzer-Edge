/**
 * Historical candle data generator for simulation.
 * Outputs deterministic, realistic hourly candles for BTCUSDT and ETHUSDT.
 * Incorporates a non-stationary Regime Switching State Machine,
 * tail-risk shock events, and volatility memory (clustering).
 */

const REGIMES = {
  TRENDING_UP: 'TRENDING_UP',
  TRENDING_DOWN: 'TRENDING_DOWN',
  CHOP: 'CHOP',
  HIGH_VOLATILITY: 'HIGH_VOLATILITY',
  CRASH: 'CRASH'
};

function seedRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function sampleRegime(rand) {
  const r = rand();
  if (r < 0.25) return REGIMES.CHOP;
  if (r < 0.55) return REGIMES.TRENDING_UP;
  if (r < 0.75) return REGIMES.TRENDING_DOWN;
  if (r < 0.90) return REGIMES.HIGH_VOLATILITY;
  return REGIMES.CRASH;
}

function generateCandles(symbol, startPrice, endPrice, length, seed) {
  const rand = seedRandom(seed);
  const candles = [];
  let currentPrice = startPrice;
  const priceRange = endPrice - startPrice;
  const step = priceRange / length;
  let timestamp = Date.now() - length * 3600 * 1000;

  // Regime switcher and Volatility Memory states
  let currentRegime = sampleRegime(rand);
  let chopStartPrice = currentPrice;
  let volatilityMemory = 1.0;

  for (let i = 0; i < length; i++) {
    // 1. Regime Switching with persistence (5% transition chance per step)
    if (rand() < 0.05) {
      currentRegime = sampleRegime(rand);
      if (currentRegime === REGIMES.CHOP) {
        chopStartPrice = currentPrice; // lock anchor price for reversion
      }
    }

    // Volatility memory clustering (decays slowly back to 1.0 baseline)
    volatilityMemory = Math.max(1.0, volatilityMemory * 0.96);

    let change = 0;
    const baseVol = startPrice * 0.005; // 0.5% base hourly volatility

    // 2. Regime Specific Signature Execution
    switch (currentRegime) {
      case REGIMES.CHOP:
        // Local mean reversion to chopStartPrice (flat EMAs, fake breakout traps)
        const reversion = (chopStartPrice - currentPrice) * 0.12;
        const chopNoise = (rand() - 0.5) * (startPrice * 0.015) * volatilityMemory;
        change = reversion + chopNoise;
        break;

      case REGIMES.TRENDING_UP:
        const upDrift = step * 1.8;
        const upPullback = (rand() < 0.15) ? -step * 2.2 : 0; // occasional pullback
        change = upDrift + upPullback + (rand() - 0.5) * baseVol * volatilityMemory;
        break;

      case REGIMES.TRENDING_DOWN:
        const downDrift = -step * 1.8;
        const downPullback = (rand() < 0.15) ? step * 2.2 : 0; // occasional pullback
        change = downDrift + downPullback + (rand() - 0.5) * baseVol * volatilityMemory;
        break;

      case REGIMES.HIGH_VOLATILITY:
        volatilityMemory = Math.max(volatilityMemory, 2.0); // spike volatility
        change = step + (rand() - 0.5) * baseVol * 2.8 * volatilityMemory;
        break;

      case REGIMES.CRASH:
        // Fast liquidity exhaustion: -4% to -8% drop per candle
        const crashDrift = -startPrice * (0.04 + rand() * 0.04);
        change = crashDrift;
        volatilityMemory = 3.5; // heavy volatility memory spike
        break;
    }

    // 3. Tail-Event Shock (0.5% chance of sudden flash crash)
    if (rand() < 0.005) {
      const shockDrop = -currentPrice * (0.05 + rand() * 0.10); // -5% to -15% drop
      change += shockDrop;
      volatilityMemory = Math.max(volatilityMemory, 3.0);
    }

    const open = currentPrice;
    let close = currentPrice + change;

    // Hard bounds safety clamp
    const minP = startPrice * 0.35;
    const maxP = startPrice * 3.0;
    if (close < minP) close = open + Math.abs(change) * 0.15;
    if (close > maxP) close = open - Math.abs(change) * 0.15;

    // 4. Extreme Wick & Liquidity dynamics based on regime and volatility memory
    let wickMultiplier = 0.006;
    if (currentRegime === REGIMES.HIGH_VOLATILITY || currentRegime === REGIMES.CRASH) {
      wickMultiplier = 0.025;
    }

    const high = Math.max(open, close) + rand() * (startPrice * wickMultiplier) * volatilityMemory;
    const low = Math.min(open, close) - rand() * (startPrice * wickMultiplier) * volatilityMemory;
    
    // Volume calculation scaling with volatility memory
    const volBase = rand() * 5000;
    const volClustered = (Math.abs(close - open) / startPrice) * 500000 * volatilityMemory;
    const volume = Math.floor(volBase + volClustered);

    candles.push({
      timestamp,
      datetime: new Date(timestamp).toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2))
    });

    currentPrice = close;
    timestamp += 3600 * 1000;
  }

  return candles;
}

export const BTC_HISTORICAL = generateCandles('BTCUSDT', 62000, 94000, 500, 42);
export const ETH_HISTORICAL = generateCandles('ETHUSDT', 2700, 3950, 500, 99);

export function getHistoricalCandles() {
  return {
    BTCUSDT: BTC_HISTORICAL,
    ETHUSDT: ETH_HISTORICAL
  };
}
 