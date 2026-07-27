import db, { CausalMemoryDB } from '../../backend/db.js';
import { ExperimentMetrics } from '../../backend/experimentMetrics.js';
import { ExperimentManager } from '../../backend/experimentManager.js';

async function runVerification() {
  console.log('--- STARTING QUANT RESEARCH LAB 5-FEATURE VERIFICATION ---');

  // 1. Test ExperimentMetrics & Alpha Score Calculation
  console.log('\n[1] Testing ExperimentMetrics & Multi-Factor Alpha Score (0-100)...');
  const sampleTrades = [
    { id: 't1', symbol: 'BTCUSDT', direction: 'LONG', entryPrice: 60000, exitPrice: 63000, timestamp: 1000, exitTimestamp: 2000, pnl: 0.05, status: 'closed' },
    { id: 't2', symbol: 'BTCUSDT', direction: 'SHORT', entryPrice: 60000, exitPrice: 61200, timestamp: 3000, exitTimestamp: 4000, pnl: -0.02, status: 'closed' },
    { id: 't3', symbol: 'ETHUSDT', direction: 'LONG', entryPrice: 3000, exitPrice: 3240, timestamp: 5000, exitTimestamp: 6000, pnl: 0.08, status: 'closed' },
    { id: 't4', symbol: 'SOLUSDT', direction: 'LONG', entryPrice: 150, exitPrice: 154.5, timestamp: 7000, exitTimestamp: 8000, pnl: 0.03, status: 'closed' }
  ];

  const metrics = ExperimentMetrics.computeFromTrades(sampleTrades);
  console.log('Alpha Score:', metrics.alphaScore, '/ 100');
  console.log('Alpha Breakdown:', metrics.alphaBreakdown);
  console.log('Anti-Overfitting Report:', metrics.antiOverfitting);

  if (typeof metrics.alphaScore !== 'number') throw new Error('Alpha score must be numeric');
  if (!metrics.alphaBreakdown) throw new Error('Alpha breakdown must exist');
  if (!metrics.antiOverfitting) throw new Error('Anti-overfitting report must exist');
  console.log('✓ Alpha Score & Anti-Overfitting verification passed!');

  // 2. Test Strategy Hashing
  console.log('\n[2] Testing Strategy Hash Generation...');
  const manager = new ExperimentManager(db);
  const hash1 = manager.computeStrategyHash({ takeProfit: 0.02, stopLoss: 0.01, longEnabled: true });
  const hash2 = manager.computeStrategyHash({ takeProfit: 0.02, stopLoss: 0.01, longEnabled: true });
  const hash3 = manager.computeStrategyHash({ takeProfit: 0.03, stopLoss: 0.01, longEnabled: true });

  if (hash1 !== hash2) throw new Error('Hashes for identical config must match');
  if (hash1 === hash3) throw new Error('Hashes for different configs must differ');
  console.log('✓ Strategy Hash verification passed!');

  // 3. Test Market Context Snapshot
  console.log('\n[3] Testing Market Snapshot Engine...');
  const marketSnapshot = await manager.fetchMarketSnapshot();
  console.log('Market Snapshot:', marketSnapshot);
  if (!marketSnapshot.btcDominancePct || !marketSnapshot.fearAndGreedIndex) {
    throw new Error('Market snapshot must include dominance and fear/greed index');
  }
  console.log('✓ Market Snapshot verification passed!');

  // 4. Test 6-State Status Lifecycle
  console.log('\n[4] Testing 6-State Status Lifecycle Transitions...');
  await manager.initialize();
  const activeExp = await manager.getActiveExperiment();
  
  // Transition to VALIDATING
  const validatingExp = await manager.updateStatus(activeExp.experiment_id, 'VALIDATING', 'Incubation check');
  if (validatingExp.status !== 'VALIDATING') throw new Error('Status transition to VALIDATING failed');

  // Transition back to ACTIVE then FREEZE
  await manager.updateStatus(activeExp.experiment_id, 'ACTIVE');
  await db.insertExperimentTrade(activeExp.experiment_id, sampleTrades[0]);

  const freezeResult = await manager.freezeAndCreateNew('User triggered freeze');
  if (freezeResult.frozenExperiment.status !== 'LEGACY') throw new Error('Frozen status must be LEGACY');
  if (!freezeResult.marketSnapshot) throw new Error('Freeze result must include marketSnapshot');
  console.log('✓ 6-State Lifecycle & Freeze verification passed!');

  // 5. Test Alpha Discovery Engine
  console.log('\n[5] Testing Alpha Discovery Engine (Cross-Experiment Analysis)...');
  const alphaDiscovery = await manager.alphaDiscoveryEngine.discoverAlpha();
  console.log('Alpha Discovery Insights:', {
    totalExperiments: alphaDiscovery.totalExperiments,
    totalTradesAnalyzed: alphaDiscovery.totalTradesAnalyzed,
    conclusion: alphaDiscovery.conclusionSummary
  });

  if (alphaDiscovery.totalExperiments < 1) throw new Error('Alpha Discovery should analyze at least 1 experiment');
  if (!alphaDiscovery.conclusionSummary) throw new Error('Alpha Discovery must produce a conclusion summary');
  console.log('✓ Alpha Discovery Engine verification passed!');

  console.log('\n=================================================================');
  console.log('🎉 ALL 5 QUANT RESEARCH LAB EXTENSIONS PASSED VERIFICATION 100%! 🎉');
  console.log('=================================================================\n');
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
