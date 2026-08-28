import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { ReplayRunner } from '../replay/replayRunner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runIsolation(providerId) {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 STARTING ISOLATION: PROVIDER ${providerId.toUpperCase()}`);
  console.log('='.repeat(60));

  // Determine which providers to disable
  const allProviders = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'];
  const disabledList = allProviders.filter(p => p !== providerId);
  
  // Apply environment overrides for streamEngine
  process.env.DISABLED_PROVIDERS = disabledList.join(',');
  process.env.FAST_TF = '1m';
  process.env.INTERMEDIATE_TF = '1m';
  process.env.SLOW_TF = '1m';

  const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
  
  const config = {
    datasetPath,
    symbol: 'BTCUSDT',
    segment: 'is', 
    split: { is: 0.6, val: 0.2, oos: 0.2 },
    experimentId: `EXP-PROVIDER-ISOLATION-001-${providerId.toUpperCase()}`,
    hypothesis: `Isolate provider ${providerId} to measure its raw expectancy and MFE/MAE profile without interference from other providers.`,
    takerFeePct: 0.001,
    slippagePct: 0.0002,
    warmupCandles: 500,
  };

  const runner = new ReplayRunner(config);
  const results = await runner.run();
  
  const resultsDir = resolve(__dirname, '../results');
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });
  
  const outputPath = runner.saveResults(resultsDir);
  runner.printReport();

  return { name: providerId.toUpperCase(), metrics: results.metrics, trades: results.trades, path: outputPath };
}

function computeStats(trades) {
  if (!trades || trades.length === 0) {
    return {
      count: 0,
      avgMfeR: 0,
      medianMfeR: 0,
      avgMaeR: 0,
      medianMaeR: 0,
      ge020: 0,
      ge020Pct: 0,
      ge050: 0,
      ge050Pct: 0,
      ge100: 0,
      ge100Pct: 0,
      ge200: 0,
      ge200Pct: 0,
      distribution: { lt020: 0, b020_050: 0, b050_100: 0, b100_200: 0, ge200: 0 }
    };
  }

  const mfeRs = [];
  const maeRs = [];
  const dist = { lt020: 0, b020_050: 0, b050_100: 0, b100_200: 0, ge200: 0 };

  for (const t of trades) {
    const riskDistance = (t.entryPrice && t.stopLoss) ? Math.abs(t.entryPrice - t.stopLoss) : null;
    const riskPct = (riskDistance && t.entryPrice) ? riskDistance / t.entryPrice : null;
    
    const mfeR = (riskPct && riskPct > 0 && t.mfe != null) ? (t.mfe / riskPct) : 0;
    const maeR = (riskPct && riskPct > 0 && t.mae != null) ? (Math.abs(t.mae) / riskPct) : 0;
    
    mfeRs.push(mfeR);
    maeRs.push(maeR);

    if (mfeR < 0.20) dist.lt020++;
    else if (mfeR < 0.50) dist.b020_050++;
    else if (mfeR < 1.00) dist.b050_100++;
    else if (mfeR < 2.00) dist.b100_200++;
    else dist.ge200++;
  }

  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const ge020 = mfeRs.filter(r => r >= 0.20).length;
  const ge050 = mfeRs.filter(r => r >= 0.50).length;
  const ge100 = mfeRs.filter(r => r >= 1.00).length;
  const ge200 = mfeRs.filter(r => r >= 2.00).length;

  return {
    count: trades.length,
    avgMfeR: avg(mfeRs),
    medianMfeR: median(mfeRs),
    avgMaeR: avg(maeRs),
    medianMaeR: median(maeRs),
    ge020,
    ge020Pct: (ge020 / trades.length) * 100,
    ge050,
    ge050Pct: (ge050 / trades.length) * 100,
    ge100,
    ge100Pct: (ge100 / trades.length) * 100,
    ge200,
    ge200Pct: (ge200 / trades.length) * 100,
    distribution: dist
  };
}

async function main() {
  // Test only the providers that are active in production by default
  const targetProviders = ['v2', 'v4', 'v5', 'v6', 'v7'];
  const results = [];

  for (const p of targetProviders) {
    const res = await runIsolation(p);
    results.push(res);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXPERIMENT EXP-PROVIDER-ISOLATION-001 — EXECUTIVE AUTOPSY REPORT');
  console.log('='.repeat(80));
  
  console.log('\n| Provider | Trades | Win Rate | Net PnL | PF | Expectancy | Max DD | MFE Méd (R) | MFE Med (R) | MFE ≥ 0.20R (%) | MFE ≥ 0.50R (%) | MFE ≥ 1.0R (%) |');
  console.log('|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|');

  for (const r of results) {
    const s = computeStats(r.trades);
    console.log(`| **${r.name}** | ${r.metrics.trades} | ${r.metrics.winRate}% | $${r.metrics.netPnL} | ${r.metrics.profitFactor} | $${r.metrics.expectancy} | $${r.metrics.maxDrawdown} | ${s.avgMfeR.toFixed(2)}R | ${s.medianMfeR.toFixed(2)}R | ${s.ge020} (${s.ge020Pct.toFixed(1)}%) | ${s.ge050} (${s.ge050Pct.toFixed(1)}%) | ${s.ge100} (${s.ge100Pct.toFixed(1)}%) |`);
  }

  console.log('\n' + '-'.repeat(80));
  console.log('📈 MFE IN R DISTRIBUTION BREAKDOWN PER PROVIDER');
  console.log('-'.repeat(80));

  for (const r of results) {
    const s = computeStats(r.trades);
    console.log(`\n--- [PROVIDER ${r.name}] (${r.metrics.trades} trades) ---`);
    console.log(`  • MFE < 0.20R (Dead Signals):       ${s.distribution.lt020} trades (${((s.distribution.lt020 / s.count) * 100 || 0).toFixed(1)}%)`);
    console.log(`  • MFE 0.20R - 0.50R (Weak Moves):   ${s.distribution.b020_050} trades (${((s.distribution.b020_050 / s.count) * 100 || 0).toFixed(1)}%)`);
    console.log(`  • MFE 0.50R - 1.00R (Moderate):     ${s.distribution.b050_100} trades (${((s.distribution.b050_100 / s.count) * 100 || 0).toFixed(1)}%)`);
    console.log(`  • MFE 1.00R - 2.00R (Good Edge):     ${s.distribution.b100_200} trades (${((s.distribution.b100_200 / s.count) * 100 || 0).toFixed(1)}%)`);
    console.log(`  • MFE ≥ 2.00R (Runners):             ${s.distribution.ge200} trades (${((s.distribution.ge200 / s.count) * 100 || 0).toFixed(1)}%)`);
    console.log(`  • MAE Médio: ${s.avgMaeR.toFixed(2)}R | MAE Mediano: ${s.medianMaeR.toFixed(2)}R`);
    console.log(`  • JSON Report: ${r.path}`);
  }
  
  console.log('\n============================================================');
  console.log('Isolation complete. All reports written to disk.');
}

main().catch(err => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
