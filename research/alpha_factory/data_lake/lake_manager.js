/**
 * ALPHA FACTORY — DISCOVERY DATA LAKE MANAGER
 * Module: lake_manager.js
 * 
 * Functions:
 * 1. Loads and caches pre-ingested Discovery datasets (2023-2024).
 * 2. Enforces strict FirewallGuard boundary assertions.
 * 3. Precomputes technical indicators (Float64Array) upon first access.
 * 4. Provides zero-copy memory store for high-speed batch simulation.
 */

import fs from 'fs';
import path from 'path';
import { FirewallGuard } from '../core/firewall_guard.js';
import { FastSimulator } from '../core/fast_simulator.js';

export class DataLakeManager {
  constructor(options = {}) {
    this.baseDataDir = options.dataDir || path.resolve(process.cwd(), 'research/alpha_discovery/AD003/data');
    this.cache = new Map(); // key: `${symbol}_${timeframe}` -> { candles, ind, extremesMap }
  }

  /**
   * Retrieves dataset for a given symbol and timeframe with precomputed indicators.
   */
  getDataset(symbol, timeframe, options = {}) {
    const key = `${symbol}_${timeframe}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    FirewallGuard.assertTimeframePermitted(timeframe, options);

    const filePath = path.join(this.baseDataDir, `${symbol}_${timeframe}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`[DATA_LAKE] Missing dataset file for ${key} at: ${filePath}`);
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    raw.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    // Hard firewall assertion
    FirewallGuard.assertDiscoveryCandles(raw, key);

    // Precompute indicators
    const ind = FastSimulator.precomputeIndicators(raw);
    const extremesMap = new Map(); // K -> { highs, lows }

    const entry = {
      symbol,
      timeframe,
      candles: raw,
      ind,
      getExtremes: (K) => {
        if (!extremesMap.has(K)) {
          extremesMap.set(K, FastSimulator.computeRollingExtremes(raw, K));
        }
        return extremesMap.get(K);
      }
    };

    this.cache.set(key, entry);
    return entry;
  }

  /**
   * Preloads a batch of assets and timeframes into memory.
   */
  preload(symbols, timeframes, options = {}) {
    const loaded = [];
    for (const sym of symbols) {
      for (const tf of timeframes) {
        const d = this.getDataset(sym, tf, options);
        loaded.push(`${sym}_${tf} (${d.candles.length.toLocaleString()} bars)`);
      }
    }
    return loaded;
  }
}
