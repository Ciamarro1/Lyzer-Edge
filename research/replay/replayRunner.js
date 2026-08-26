/**
 * @fileoverview Replay Runner — Orchestrator for Deterministic Historical Replay
 * 
 * This is the CORE of the Research Laboratory.
 * It feeds historical candles into the REAL StreamEngine (same code as Live),
 * bypassing only the network layer (LiveDataIngestor + ExchangeExecution).
 * 
 * ARCHITECTURE:
 *   ReplayDataIngestor (historical JSON)
 *        ↓
 *   StreamEngine.updateMtfCandles() ← SAME code as Live
 *   StreamEngine.processCandle()    ← SAME code as Live
 *        ↓
 *   Trade decisions captured from StreamEngine.tradeHistory
 *        ↓
 *   ExecutionSimulator (fees + slippage)
 *        ↓
 *   MetricsCalculator (20+ metrics)
 * 
 * RULES:
 * - No modification to StreamEngine source code required
 * - processCandle is called synchronously, one candle at a time
 * - All timestamps come from the dataset, never from Date.now()
 * - Deterministic: same input → same output, always
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { ReplayDataIngestor } from './replayDataIngestor.js';
import { ExecutionSimulator } from './executionSimulator.js';
import { MetricsCalculator } from './metricsCalculator.js';

// --- SILENCE NOISY LOGS DURING REPLAY ---
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = (...args) => {
  if (typeof args[0] === 'string' && (
    args[0].startsWith('[REPLAY]') || 
    args[0].startsWith('=') || 
    args[0].startsWith('🔬') || 
    args[0].startsWith('📊') || 
    args[0].startsWith('✅') || 
    args[0].startsWith('❌') || 
    args[0].startsWith('  ') || 
    args[0].startsWith('\n')
  )) {
    originalLog(...args);
  }
};
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].startsWith('[REPLAY]')) originalWarn(...args);
};
// ----------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));

export class ReplayRunner {
  /**
   * @param {Object} config
   * @param {string} config.datasetPath - Path to M1 JSON dataset
   * @param {string} config.symbol - Trading pair (default: BTCUSDT)
   * @param {Object} config.split - Temporal split { is: 0.6, val: 0.2, oos: 0.2 }
   * @param {string} config.segment - Which segment to run: 'is', 'val', 'oos', or 'full'
   * @param {number} config.takerFeePct - Taker fee (default: 0.001 = 0.1%)
   * @param {number} config.slippagePct - Slippage (default: 0.0002 = 0.02%)
   * @param {Object} config.engineConfig - Config overrides for StreamEngine constructor
   * @param {string} config.experimentId - Experiment identifier for logging
   * @param {string} config.hypothesis - Hypothesis being tested
   */
  constructor(config) {
    this.config = {
      symbol: 'BTCUSDT',
      split: { is: 0.6, val: 0.2, oos: 0.2 },
      segment: 'is',
      takerFeePct: 0.001,
      slippagePct: 0.0002,
      experimentId: 'UNNAMED',
      hypothesis: 'No hypothesis specified',
      warmupCandles: 500,
      ...config,
    };

    // Compute temporal split boundaries
    const fullIngestor = new ReplayDataIngestor(this.config.datasetPath, {
      symbol: this.config.symbol,
    });
    this.splitBoundaries = fullIngestor.computeTemporalSplit(this.config.split);
    this.datasetMetadata = fullIngestor.metadata;

    // Create segment-specific ingestor
    const segmentBounds = this.config.segment === 'full'
      ? { startTime: fullIngestor.candles[0].openTime, endTime: fullIngestor.candles[fullIngestor.candles.length - 1].openTime }
      : this.splitBoundaries[this.config.segment];
    
    this.ingestor = new ReplayDataIngestor(this.config.datasetPath, {
      symbol: this.config.symbol,
      startTime: segmentBounds.startTime,
      endTime: segmentBounds.endTime,
    });

    // Execution simulator
    this.execSim = new ExecutionSimulator({
      takerFeePct: this.config.takerFeePct,
      slippagePct: this.config.slippagePct,
    });

    this.engine = null;
    this.tradeLedger = [];
    this.runMetadata = null;
  }

  /**
   * Initializes the StreamEngine without starting network connections.
   * This is the key innovation: we use the REAL StreamEngine in SIMULATION mode,
   * but skip startLiveMode() entirely.
   */
  async initEngine() {
    // Inject required env vars for replay mode
    if (!process.env.COURT_SECRET_KEY) process.env.COURT_SECRET_KEY = 'REPLAY_SECRET_MOCK';

    // Dynamic import to handle the ESM module from lyzer edge
    const streamEnginePath = resolve(__dirname, '../../lyzer edge/backend/streamEngine.js');
    const { pathToFileURL } = await import('url');
    const { StreamEngine } = await import(pathToFileURL(streamEnginePath).href);

    const engineConfig = {
      mode: 'SIMULATION',
      symbol: this.config.symbol,
      interval: '1m',
      stabilizationWindowMs: 0, // No MOL delay in replay
      ...this.config.engineConfig,
    };

    this.engine = new StreamEngine(engineConfig);
    
    // Mark as running without calling start() (which would connect to Binance)
    this.engine.isRunning = true;
    this.engine.execution = null; // No real execution in replay
    
    console.log(`[REPLAY] StreamEngine initialized in SIMULATION mode for ${this.config.symbol}`);
  }

  /**
   * Warms up the engine with initial candles to stabilize LHDS/TruthKernel.
   * These candles are processed but their trades are discarded.
   */
  async warmup() {
    const warmupCandles = this.ingestor.getWarmupCandles(this.config.warmupCandles);
    console.log(`[REPLAY] Warming up with ${warmupCandles.length} candles...`);
    
    for (const candle of warmupCandles) {
      this.engine.updateMtfCandles(candle);
      try {
        await this.engine.processCandle(candle, 0);
      } catch (e) {
        // Warmup errors are expected (insufficient data for some indicators)
      }
    }
    
    // Clear any trades generated during warmup
    this.engine.tradeHistory = [];
    this.engine.activePosition = null;
    console.log(`[REPLAY] Warmup complete. TruthKernel stabilized.`);
  }

  /**
   * Runs the replay. This is the main execution loop.
   * @returns {Object} Complete results with metrics
   */
  async run() {
    if (!this.engine) {
      await this.initEngine();
    }

    // Warmup
    await this.warmup();

    const startTime = Date.now();
    let candleCount = 0;
    let errorCount = 0;
    const initialTradeCount = this.engine.tradeHistory.length;

    console.log(`[REPLAY] Starting replay: ${this.ingestor.metadata.totalCandles} candles, segment: ${this.config.segment}`);
    console.log(`[REPLAY] Experiment: ${this.config.experimentId}`);
    console.log(`[REPLAY] Hypothesis: ${this.config.hypothesis}`);

    // Reset ingestor to start of segment
    this.ingestor.reset();

    // Main replay loop
    while (this.ingestor.hasNext()) {
      const candle = this.ingestor.next();
      if (!candle) break;

      candleCount++;

      // Feed candle into StreamEngine (SAME path as Live)
      this.engine.updateMtfCandles(candle);

      try {
        await this.engine.processCandle(candle, candleCount);
      } catch (e) {
        errorCount++;
        if (errorCount <= 5) {
          console.warn(`[REPLAY] processCandle error at candle ${candleCount}: ${e.message}`);
        }
      }

      // Progress logging every 10%
      if (candleCount % Math.floor(this.ingestor.metadata.totalCandles / 10) === 0) {
        const pct = (this.ingestor.progress() * 100).toFixed(0);
        const trades = this.engine.tradeHistory.length - initialTradeCount;
        process.stdout.write(`\r[REPLAY] Progress: ${pct}% (${candleCount} candles, ${trades} trades)`);
      }
    }

    const runtimeMs = Date.now() - startTime;
    console.log(`\n[REPLAY] Replay complete in ${(runtimeMs / 1000).toFixed(1)}s`);

    // Extract trades and apply execution simulation (fees + slippage)
    const rawTrades = this.engine.tradeHistory.slice(initialTradeCount);
    this.tradeLedger = this._applyExecutionCosts(rawTrades);

    // Calculate metrics
    const firstCandle = this.ingestor.candles[0];
    const lastCandle = this.ingestor.candles[this.ingestor.candles.length - 1];
    
    const metrics = MetricsCalculator.compute(this.tradeLedger, {
      initialCapital: 10000,
      startTime: firstCandle?.openTime,
      endTime: lastCandle?.openTime,
    });

    // Build run metadata for reproducibility
    this.runMetadata = {
      experimentId: this.config.experimentId,
      hypothesis: this.config.hypothesis,
      segment: this.config.segment,
      datasetHash: this.datasetMetadata.hash,
      configHash: this._hashConfig(),
      engineVersion: 'streamEngine-live-v1',
      runtimeMs,
      candlesProcessed: candleCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
      split: this.splitBoundaries,
      fees: { taker: this.config.takerFeePct, slippage: this.config.slippagePct },
    };

    return {
      metadata: this.runMetadata,
      metrics,
      trades: this.tradeLedger,
    };
  }

  /**
   * Applies fees and slippage to raw trades from StreamEngine.
   */
  _applyExecutionCosts(rawTrades) {
    return rawTrades.map(t => {
      const notional = t.notional || t.size || 100; // fallback
      const pnlBreakdown = this.execSim.calculatePnL({
        direction: t.direction,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice || t.entryPrice,
        notional,
      });

      return {
        ...t,
        ...pnlBreakdown,
        entryTime: t.timestamp || t.openTime,
        exitTime: t.closeTime || t.exitTimestamp,
      };
    });
  }

  /**
   * Generates a deterministic hash of the engine configuration.
   */
  _hashConfig() {
    const configStr = JSON.stringify({
      symbol: this.config.symbol,
      segment: this.config.segment,
      fees: this.config.takerFeePct,
      slippage: this.config.slippagePct,
      engineConfig: this.config.engineConfig || {},
    });
    return createHash('sha256').update(configStr).digest('hex').slice(0, 16);
  }

  /**
   * Prints formatted results to console.
   */
  printReport() {
    if (!this.runMetadata) {
      console.log('No results available. Run replay first.');
      return;
    }

    const metrics = MetricsCalculator.compute(this.tradeLedger, {
      initialCapital: 10000,
    });

    console.log('\n' + '='.repeat(50));
    console.log(`  EXPERIMENT: ${this.runMetadata.experimentId}`);
    console.log('='.repeat(50));
    console.log(`  Hypothesis: ${this.config.hypothesis}`);
    console.log(`  Segment: ${this.runMetadata.segment}`);
    console.log(`  Dataset Hash: ${this.runMetadata.datasetHash}`);
    console.log(`  Config Hash: ${this.runMetadata.configHash}`);
    console.log(`  Runtime: ${(this.runMetadata.runtimeMs / 1000).toFixed(1)}s`);
    console.log(`  Candles: ${this.runMetadata.candlesProcessed}`);
    console.log(`  Errors: ${this.runMetadata.errors}`);
    console.log('-'.repeat(50));
    console.log(MetricsCalculator.formatReport(metrics, `RESULTS (${this.runMetadata.segment.toUpperCase()})`));
  }

  /**
   * Saves results to a JSON file.
   * @param {string} outputDir - Directory to save results
   */
  saveResults(outputDir) {
    const safeId = this.config.experimentId.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `${safeId}_${this.config.segment}_${Date.now()}.json`;
    const outputPath = resolve(outputDir, filename);
    
    const results = {
      metadata: this.runMetadata,
      metrics: MetricsCalculator.compute(this.tradeLedger, { initialCapital: 10000 }),
      tradeCount: this.tradeLedger.length,
      trades: this.tradeLedger.map(t => ({
        direction: t.direction,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        netPnL: t.netPnL,
        totalFees: t.totalFees,
        entryTime: t.entryTime,
        exitTime: t.exitTime,
      })),
    };
    
    writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`[REPLAY] Results saved to ${outputPath}`);
    return outputPath;
  }
}
