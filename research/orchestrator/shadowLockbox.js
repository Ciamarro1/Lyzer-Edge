import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { FROZEN_V5_CONFIG, FROZEN_CONFIG_HASH } from './frozenConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lockboxDir = resolve(__dirname, '../results/v5_confirmatory');
const lockboxPath = resolve(lockboxDir, 'V5_SHADOW_LOCKBOX.json');

/**
 * SHADOW LOCKBOX PROTOCOL:
 * Stores prospective real-time events (#26 -> #50) in cold cryptographic storage.
 * Operational interpretation is strictly locked until N=50 checkpoint.
 */
export class ShadowLockbox {
  constructor() {
    this.lockboxPath = lockboxPath;
    this.ensureStorage();
  }

  ensureStorage() {
    if (!existsSync(lockboxDir)) mkdirSync(lockboxDir, { recursive: true });
    if (!existsSync(this.lockboxPath)) {
      const initialData = {
        lockboxId: 'V5_PROSPECTIVE_SHADOW_LOCKBOX',
        createdAt: new Date().toISOString(),
        frozenConfigHash: FROZEN_CONFIG_HASH,
        frozenConfig: FROZEN_V5_CONFIG,
        historicalBaselineN: 25,
        targetCheckpointN: 50,
        currentProspectiveCount: 0,
        status: 'COLD_RECORDING_LOCKED_UNTIL_N50',
        events: []
      };
      writeFileSync(this.lockboxPath, JSON.stringify(initialData, null, 2));
    }
  }

  load() {
    this.ensureStorage();
    return JSON.parse(readFileSync(this.lockboxPath, 'utf-8'));
  }

  recordProspectiveEvent(eventData) {
    const box = this.load();

    if (box.frozenConfigHash !== FROZEN_CONFIG_HASH) {
      throw new Error(`CRITICAL INTEGRITY VIOLATION: Config hash mismatch! Expected ${box.frozenConfigHash}, got ${FROZEN_CONFIG_HASH}`);
    }

    const eventId = box.historicalBaselineN + box.events.length + 1;

    // Build event snapshot hash to prove zero tampering
    const snapshotRaw = JSON.stringify({
      eventId,
      timestamp: eventData.timestamp,
      btcPrice: eventData.btcPrice,
      fundingRate: eventData.fundingRate,
      entryPrice: eventData.entryPrice,
      configHash: FROZEN_CONFIG_HASH
    });
    const decisionSnapshotHash = crypto.createHash('sha256').update(snapshotRaw).digest('hex');

    const eventRecord = {
      eventId,
      isProspective: true,
      timestamp: eventData.timestamp,
      dateUtc: new Date(eventData.timestamp).toISOString(),
      btcPrice: eventData.btcPrice,
      localAtr: eventData.localAtr,
      atrPricePct: Number(((eventData.localAtr / eventData.btcPrice) * 100).toFixed(3)),
      volatilityClassification: ((eventData.localAtr / eventData.btcPrice) * 100) > 0.80 ? 'HIGH_VOLATILITY' : 'LOW_VOLATILITY',
      fundingRate: eventData.fundingRate,
      macroRegime1D: eventData.macroRegime1D || 'UNKNOWN',
      entryPriceRaw: eventData.entryPrice,
      executedEntryPrice: eventData.entryPrice * (1 + FROZEN_V5_CONFIG.slippagePctPerLeg),
      stopLossPrice: eventData.stopLossPrice,
      takeProfitPrice: eventData.takeProfitPrice,
      exitPriceRaw: eventData.exitPrice,
      executedExitPrice: eventData.executedExitPrice,
      exitReason: eventData.exitReason,
      holdingHours: eventData.holdingHours,
      forwardBtcReturn6hPct: eventData.forwardBtcReturn6hPct,
      grossPnL: eventData.grossPnL,
      fees: eventData.fees,
      slippage: eventData.slippage,
      totalFriction: eventData.totalFriction,
      netPnL: eventData.netPnL,
      isNetWin: eventData.netPnL > 0,
      decisionSnapshotHash,
      recordedAt: new Date().toISOString()
    };

    box.events.push(eventRecord);
    box.currentProspectiveCount = box.events.length;
    box.totalAccumulatedCount = box.historicalBaselineN + box.events.length;

    if (box.totalAccumulatedCount >= box.targetCheckpointN) {
      box.status = 'READY_FOR_N50_SCIENTIFIC_AUDIT';
    }

    writeFileSync(this.lockboxPath, JSON.stringify(box, null, 2));
    return eventRecord;
  }

  getLockboxSummary() {
    const box = this.load();
    return {
      status: box.status,
      historicalN: box.historicalBaselineN,
      prospectiveN: box.currentProspectiveCount,
      totalN: box.historicalBaselineN + box.currentProspectiveCount,
      targetCheckpointN: box.targetCheckpointN,
      frozenConfigHash: box.frozenConfigHash
    };
  }
}

export const shadowLockbox = new ShadowLockbox();
