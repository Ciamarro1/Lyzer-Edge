/**
 * ALPHA FACTORY — FIREWALL GUARD & INTEGRITY ENFORCER
 * Module: firewall_guard.js
 * 
 * Strict Institutional Invariants:
 * 1. Discovery data strictly bounded by 2023-01-01T00:00:00.000Z to 2024-12-31T23:59:59.999Z.
 * 2. Any candle with timestamp > 1735689599999 triggers fatal fail-closed exception.
 * 3. 1H timeframe access triggers exception when excludeContaminated1H is active.
 * 4. Engine V8 SHA-256 must match fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1.
 */

import fs from 'fs';
import crypto from 'crypto';

export const DISCOVERY_START_MS = 1672531200000; // 2023-01-01T00:00:00.000Z
export const DISCOVERY_END_MS   = 1735689599999; // 2024-12-31T23:59:59.999Z
export const FROZEN_V8_SHA256   = 'fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1';

export class FirewallGuard {
  /**
   * Asserts that candles array is strictly within the discovery window.
   * Throws FIREWALL_BREACH_EXCEPTION on violation.
   */
  static assertDiscoveryCandles(candles, sourceLabel = 'unknown') {
    if (!Array.isArray(candles) || candles.length === 0) {
      throw new Error(`[FIREWALL_GUARD] Empty or invalid candles array from ${sourceLabel}`);
    }

    const firstTs = Number(candles[0].timestamp);
    const lastTs  = Number(candles[candles.length - 1].timestamp);

    if (lastTs > DISCOVERY_END_MS) {
      const breachDate = new Date(lastTs).toISOString();
      throw new Error(
        `[FIREWALL_BREACH_EXCEPTION] Holdout 2025-2026 data detected in discovery dataset ${sourceLabel}! ` +
        `Timestamp: ${lastTs} (${breachDate}) exceeds Discovery ceiling ${DISCOVERY_END_MS} (2024-12-31T23:59:59.999Z).`
      );
    }

    return true;
  }

  /**
   * Asserts that the requested timeframe is permitted.
   */
  static assertTimeframePermitted(timeframe, options = {}) {
    if (options.excludeContaminated1H && (timeframe === '1h' || timeframe === '1H' || timeframe === '60m')) {
      throw new Error(
        `[CONTAMINATED_1H_EXCEPTION] Timeframe 1H is strictly excluded from competition due to prior exposure and contamination in AD002/H011.`
      );
    }
    return true;
  }

  /**
   * Asserts that Institutional Quant Signal Engine V8 is bit-for-bit intact.
   */
  static assertV8EngineInvariant(engineFilePath) {
    if (!fs.existsSync(engineFilePath)) {
      throw new Error(`[ENGINE_INVARIANT_EXCEPTION] V8 engine file not found at: ${engineFilePath}`);
    }
    const buf = fs.readFileSync(engineFilePath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    if (hash !== FROZEN_V8_SHA256) {
      throw new Error(
        `[ENGINE_INVARIANT_EXCEPTION] V8 Engine SHA-256 mutation detected! ` +
        `Expected: ${FROZEN_V8_SHA256}, Actual: ${hash}`
      );
    }
    return true;
  }
}
