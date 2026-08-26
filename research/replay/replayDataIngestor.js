/**
 * @fileoverview Replay Data Ingestor
 * Deterministic substitute for LiveDataIngestor.
 * Feeds historical M1 candles one-by-one into the StreamEngine,
 * simulating the exact same onCandleClose callback pattern.
 * 
 * RULE: No network calls. No randomness. Pure sequential replay.
 * RULE: Timestamps come from the dataset, not from Date.now().
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';

export class ReplayDataIngestor {
  /**
   * @param {string} datasetPath - Absolute path to the JSON dataset file
   * @param {Object} config - { startTime, endTime } to slice the dataset
   */
  constructor(datasetPath, config = {}) {
    const raw = readFileSync(datasetPath, 'utf-8');
    const allCandles = JSON.parse(raw);
    
    // Slice by time range if specified
    let candles = allCandles;
    if (config.startTime) {
      candles = candles.filter(c => c.openTime >= config.startTime);
    }
    if (config.endTime) {
      candles = candles.filter(c => c.openTime <= config.endTime);
    }
    
    // Sort by openTime (should already be sorted, but enforce)
    candles.sort((a, b) => a.openTime - b.openTime);
    
    this.candles = candles;
    this.index = 0;
    this.symbol = config.symbol || 'BTCUSDT';
    
    // Dataset metadata for reproducibility
    this.metadata = {
      path: datasetPath,
      totalCandles: candles.length,
      firstTime: candles.length > 0 ? candles[0].openTime : null,
      lastTime: candles.length > 0 ? candles[candles.length - 1].openTime : null,
      hash: createHash('sha256')
        .update(JSON.stringify(candles.map(c => c.openTime)))
        .digest('hex')
        .slice(0, 16),
    };
  }

  /**
   * Returns the next candle in sequence, or null if exhausted.
   * Marks it as a closed candle (simulating kline.x === true).
   */
  next() {
    if (this.index >= this.candles.length) return null;
    
    const candle = this.candles[this.index];
    this.index++;
    
    return {
      ...candle,
      symbol: this.symbol,
      closed: true,  // Simulate kline.x === true
      timestamp: candle.openTime,
    };
  }

  /**
   * Resets the ingestor to the beginning for re-runs.
   */
  reset() {
    this.index = 0;
  }

  /**
   * Returns true if there are more candles to replay.
   */
  hasNext() {
    return this.index < this.candles.length;
  }

  /**
   * Returns progress as a fraction [0, 1].
   */
  progress() {
    return this.candles.length > 0 ? this.index / this.candles.length : 1;
  }

  /**
   * Returns a warmup slice of candles (for TruthKernel stabilization).
   * Does NOT advance the replay index.
   * @param {number} count - Number of warmup candles
   */
  getWarmupCandles(count = 500) {
    return this.candles.slice(0, Math.min(count, this.candles.length)).map(c => ({
      ...c,
      closed: true,
    }));
  }

  /**
   * Splits the dataset into IS / Validation / OOS segments.
   * @param {Object} splits - { is: 0.6, val: 0.2, oos: 0.2 }
   * @returns {Object} { is: { start, end }, val: { start, end }, oos: { start, end } }
   */
  computeTemporalSplit(splits = { is: 0.6, val: 0.2, oos: 0.2 }) {
    const n = this.candles.length;
    const isEnd = Math.floor(n * splits.is);
    const valEnd = Math.floor(n * (splits.is + splits.val));
    
    return {
      is: {
        startTime: this.candles[0].openTime,
        endTime: this.candles[isEnd - 1].openTime,
        candles: isEnd,
      },
      val: {
        startTime: this.candles[isEnd].openTime,
        endTime: this.candles[valEnd - 1].openTime,
        candles: valEnd - isEnd,
      },
      oos: {
        startTime: this.candles[valEnd].openTime,
        endTime: this.candles[n - 1].openTime,
        candles: n - valEnd,
      },
    };
  }
}
