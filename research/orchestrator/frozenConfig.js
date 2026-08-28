import crypto from 'crypto';

/**
 * LYZER EDGE — FROZEN V5 RESEARCH CONFIGURATION
 * IMMUTABLE DEFINITION FOR CELL A & PROSPECTIVE SHADOW TRACKING
 * ANY MODIFICATION INVALIDATES SCIENTIFIC VALIDATION.
 */
export const FROZEN_V5_CONFIG = Object.freeze({
  version: 'V5_WYCKOFF_SPRING_FUNDING_NEGATIVE_v1.0.0',
  provider: 'v5_wyckoff_volume_profile',
  timeframe: '1h',
  lookbackBars: 30,
  volumeZScore: 1.50,
  minPierceATR: 0.50,
  pocProximity: 0.003,
  requireVolume: true,
  requirePierce: true,
  requirePOC: false,
  requireReversal: true,
  signalDirection: 'LONG',

  // Exogenous Context State
  fundingRateCondition: 'NEGATIVE',
  fundingThreshold: 0.0000, // strictly < 0

  // Risk & Execution Architecture
  initialNotionalUSD: 1000,
  stopLossAtrMultiplier: 1.0,
  takeProfitRMultiplier: 2.5,
  maxHoldingBars: 6,
  minStopDistancePct: 0.002, // 0.20% minimum stop floor

  // Execution Costs & Friction
  takerFeePctPerLeg: 0.0010, // 0.10% entry + 0.10% exit = 0.20%
  slippagePctPerLeg: 0.0002, // 0.02% entry + 0.02% exit = 0.04%
  totalRoundtripFrictionPct: 0.0024, // 0.24% roundtrip

  // Verification & Gate Thresholds
  gates: Object.freeze({
    gateA_AccountingToleranceUSD: 0.000001,
    gateB_ExcessReturnRequired: true,
    gateC_MicroAllocationMinTrades: 50,
    gateC_StandardAllocationMinTrades: 100,
    gateD_BootstrapConfidenceInterval: 0.95,
    gateE_Top1EpisodeMaxSharePct: 40.0,
    gateE_Top3EpisodeMaxSharePct: 70.0,
    gateF_DirectionalRegimeMinPF: 1.20
  })
});

// Compute deterministic SHA-256 of the configuration
export function getFrozenConfigHash() {
  const jsonStr = JSON.stringify(FROZEN_V5_CONFIG);
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}

export const FROZEN_CONFIG_HASH = getFrozenConfigHash();
