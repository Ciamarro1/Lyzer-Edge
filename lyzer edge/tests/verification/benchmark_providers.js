import fs from 'fs';
import { LiquidityReconstructionEngine } from '../../../packages/lyzer-shared/src/providers/v1_smc_ict.js';
import { StructuralBoundaryEngine } from '../../../packages/lyzer-shared/src/providers/v2_snd_snr.js';
import { MomentumRsiEngine } from '../../../packages/lyzer-shared/src/providers/v3_momentum_rsi.js';
import { InstitutionalMarketCausalityEngine } from '../../../packages/lyzer-shared/src/providers/v4_imce.js';
import { OpenMobiusPatternEngine } from '../../src/components/commandCenter/sdk/evidence/openmobius/OpenMobiusPatternEngine.js';
import { EvidenceFusionEngine } from '../../src/components/commandCenter/sdk/evidence/fusion/EvidenceFusionEngine.js';

function seedRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const rand = seedRandom(42);

// Generate 5000 hybrid synthetic candles
function generateDataset() {
  const dataset = [];
  let currentPrice = 60000;
  
  for (let i = 0; i < 5000; i++) {
    // Determine regime
    let drift = 0;
    let vol = 0.002;
    if (i > 1000 && i < 2000) { drift = 0.0005; vol = 0.004; } // Bull trend
    else if (i > 3000 && i < 4000) { drift = -0.0005; vol = 0.005; } // Bear trend
    
    // Inject artificial gaps for OpenMobius testing (3% chance)
    if (rand() < 0.03) {
      if (rand() > 0.5) { drift += 0.02; } // Massive bull gap
      else { drift -= 0.02; } // Massive bear gap
    }

    const open = currentPrice;
    const randMove = (rand() - 0.5) * 2;
    currentPrice = currentPrice * (1 + drift + randMove * vol);
    const close = currentPrice;
    
    const high = Math.max(open, close) * (1 + rand() * vol * 0.5);
    const low = Math.min(open, close) * (1 - rand() * vol * 0.5);

    dataset.push({
      timestamp: 1600000000000 + i * 60000,
      open, high, low, close,
      volume: 10 + rand() * 100
    });
  }
  return dataset;
}

const data = generateDataset();

const engines = {
  v1: new LiquidityReconstructionEngine(),
  v2: new StructuralBoundaryEngine(),
  v3: new MomentumRsiEngine(),
  v4: new InstitutionalMarketCausalityEngine(),
  openMobiusStandalone: new OpenMobiusPatternEngine(),
  fusion: new EvidenceFusionEngine()
};

const results = {
  v1: { pnl: 0, wins: 0, losses: 0, trades: 0 },
  v2: { pnl: 0, wins: 0, losses: 0, trades: 0 },
  v3: { pnl: 0, wins: 0, trades: 0 },
  v4: { pnl: 0, wins: 0, losses: 0, trades: 0 },
  openMobiusStandalone: { pnl: 0, wins: 0, losses: 0, trades: 0 },
  fusion: { pnl: 0, wins: 0, losses: 0, trades: 0 }
};

const positions = {
  v1: null, v2: null, v3: null, v4: null, openMobiusStandalone: null, fusion: null
};

// Simplified simulator execution
function evaluateSignal(engineKey, signal, price, idx) {
  const pos = positions[engineKey];
  const stats = results[engineKey];

  if (pos) {
    const held = idx - pos.idx;
    const isLong = pos.type === 'long';
    const ret = isLong ? (price - pos.entry) / pos.entry : (pos.entry - price) / pos.entry;
    
    // Close on opposite signal, stop loss (1%) or take profit (2%) or time limits
    if ((isLong && signal === 'short') || (!isLong && signal === 'long') || ret <= -0.01 || ret >= 0.02 || held > 20) {
      stats.pnl += ret * 100; // pct
      stats.trades++;
      if (ret > 0) stats.wins++;
      else stats.losses++;
      positions[engineKey] = null;
    }
  } else {
    if (signal === 'long' || signal === 'short') {
      positions[engineKey] = { type: signal, entry: price, idx };
    }
  }
}

// Run simulation
const windowSize = 50;
for (let i = windowSize; i < data.length; i++) {
  const window = data.slice(i - windowSize, i + 1);
  const currentPrice = window[window.length - 1].close;
  const mtf = { intermediate: window };

  // V1 to V4
  ['v1', 'v2', 'v3', 'v4'].forEach(key => {
    try {
      const res = engines[key].reconstruct(mtf);
      evaluateSignal(key, res.signal, currentPrice, i);
    } catch (e) {}
  });

  // OpenMobius Standalone (Mock Wrapper)
  engines.openMobiusStandalone.processCandle(window[window.length - 1]);
  const fvgs = engines.openMobiusStandalone._fvgs || [];
  let omSignal = 'flat';
  // Use the most recent FVG direction regardless of mitigation for the test
  if (fvgs.length > 0) {
    omSignal = fvgs[fvgs.length - 1].type === 'BULLISH' ? 'long' : 'short';
  }
  evaluateSignal('openMobiusStandalone', omSignal, currentPrice, i);

  // Fusion Engine
  const ev1 = { sourceEngine: 'LYZER_NATIVE', evidenceMetrics: { confidence: 0.8, probability: 0.6, uncertainty: 0.1 } };
  const evOM = { sourceEngine: 'OPENMOBIUS_SMC', evidenceMetrics: { confidence: omSignal !== 'flat' ? 0.9 : 0.1, probability: omSignal === 'long' ? 0.8 : (omSignal === 'short' ? 0.2 : 0.5), uncertainty: 0.1 } };
  
  const fusionRes = engines.fusion.fuseEvidence([ev1, evOM]);
  let fusionSignal = 'flat';
  // use fusedProbability for direction
  if (fusionRes.fusedProbability > 0.55) fusionSignal = 'long';
  else if (fusionRes.fusedProbability < 0.45) fusionSignal = 'short';
  
  evaluateSignal('fusion', fusionSignal, currentPrice, i);
}

console.log("\n=======================================================");
console.log("       LYZER EDGE - PROVIDERS BENCHMARK RESULTS        ");
console.log("=======================================================");
console.log(`| ${'PROVIDER'.padEnd(20)} | ${'NET %'.padEnd(8)} | ${'WIN RATE'.padEnd(10)} | ${'TRADES'.padEnd(8)} |`);
console.log("|----------------------|----------|------------|----------|");

Object.keys(results).forEach(key => {
  const stat = results[key];
  const winRate = stat.trades > 0 ? ((stat.wins / stat.trades) * 100).toFixed(2) + '%' : '0.00%';
  console.log(`| ${key.padEnd(20)} | ${stat.pnl.toFixed(2).padStart(7)}% | ${winRate.padStart(10)} | ${stat.trades.toString().padStart(8)} |`);
});
console.log("=======================================================\n");
