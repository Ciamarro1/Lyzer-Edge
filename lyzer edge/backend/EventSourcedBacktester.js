/**
 * Event-Sourced Backtester
 * 
 * Applies principles from:
 * 1. Event Sourcing (Dilger / Hoffman): The history is a deterministic sequence of immutable events.
 * 2. Causal Memory (Kleppmann): The state at time T is perfectly reproducible by replaying events [0...T].
 * 3. The Court Shall Never Learn: The execution engine (StreamEngine) is unaware it is in a backtest.
 */

import { StreamEngine } from './streamEngine.js';
import { ConstitutionalCourt } from '../../packages/lyzer-constitution/src/eca/court.js';

export class EventSourcedBacktester {
  /**
   * @param {Object} db - The mock or real CausalMemory DB instance
   */
  constructor(db) {
    this.db = db;
    
    const freshCourt = new ConstitutionalCourt({
      dvfFloor: parseFloat(process.env.CCLIST_DVF_FLOOR || '0.1'),
      stressAccumulation: parseFloat(process.env.CCLIST_STRESS_ACCUMULATION || '0.002'),
      lethalIllusionLimit: parseFloat(process.env.CCLIST_LETHAL_ILLUSION_LIMIT || '0.9'),
      stressRelease: parseFloat(process.env.CCLIST_STRESS_RELEASE || '0.1'),
    }, {
      sclThreshold: parseInt(process.env.MOL_SCL_THRESHOLD || '3', 10),
      stabilizationWindowMs: 0
    });
    
    // We instantiate a real stream engine, but force it into SIMULATION mode so it doesn't hit Binance
    this.engine = new StreamEngine({ mode: 'SIMULATION', court: freshCourt });
    // Disable live networking & disk bottlenecks in deterministic backtest
    this.engine.startLiveMode = async () => {};
    this.engine.start = async () => {};
    this.engine.startSimulationLoop = () => {};
    this.engine.dualMonitor = { calculateDivergence: async () => 0.05 };
  }

  /**
   * Executes the backtest deterministically.
   * @param {Array} cleanCandles - The sanitized array of candles from HistoricalDataSanitizer
   */
  async run(cleanCandles) {
    this.totalProcessed = cleanCandles.length;
    console.log(`[BACKTESTER] Commencing deterministic replay of ${cleanCandles.length} events...`);
    
    // Warmup the engine with the first 100 candles to populate indicators (e.g. RSI, EMA)
    const warmupCount = Math.min(100, cleanCandles.length);
    for (let i = 0; i < warmupCount; i++) {
        const c = cleanCandles[i];
        this.engine.updateMtfCandles({
            open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, timestamp: c.openTime, openTime: c.openTime, closed: true
        });
    }
    
    console.log(`[BACKTESTER] Engine warmed up with ${warmupCount} candles.`);
    
    // Process the remaining candles as if they were live websocket ticks
    for (let i = warmupCount; i < cleanCandles.length; i++) {
      const candle = cleanCandles[i];
      const tickEvent = {
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        timestamp: candle.openTime,
        openTime: candle.openTime,
        closed: true
      };

      this.engine.updateMtfCandles(tickEvent);
      try {
        await this.engine.processCandle(tickEvent, i);
      } catch (err) {
        console.error(`[BACKTESTER ERROR at candle ${i}]:`, err);
      }
    }

    console.log('[BACKTESTER] Replay completed. Generating Audit Trail...');
    return this.generateAuditTrail();
  }

  generateAuditTrail() {
    const stats = this.engine.globalEVMemory.governanceStats;
    const trades = this.engine.tradeHistory;
    
    const profitTrades = trades.filter(t => t.pnl > 0).length;
    const lossTrades = trades.filter(t => t.pnl < 0).length;
    const winRate = trades.length > 0 ? (profitTrades / trades.length) * 100 : 0;
    
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const breakEvenTrades = trades.filter(t => t.breakEvenApplied === true).length;
    const rangeScalpTrades = trades.filter(t => t.strategyType === 'RANGE_SCALP').length;
    const trendTrades = trades.filter(t => t.strategyType !== 'RANGE_SCALP').length;

    return {
      totalEventsReplayed: this.totalProcessed || this.engine.candles.length,
      tradesExecuted: trades.length,
      breakEvenTrades,
      rangeScalpTrades,
      trendTrades,
      winRate: winRate.toFixed(2) + '%',
      totalPnl: totalPnl.toFixed(4),
      courtGovernance: stats
    };
  }
}
