/**
 * @fileoverview Latency Scenario Library (Wave 3)
 * Provides stochastic latency models to ensure REPLAY_DETERMINISM_LEAK is prevented.
 */

export const LATENCY_SCENARIOS = {
  NORMAL_RETAIL: {
    p50: 25,     // 25ms base latency
    jitter: 10,  // +/- 10ms variance
    spikeFreq: 0.01, // 1% chance of a spike
    spikeMultiplier: 5 // Spike is 5x normal
  },
  HIGH_VOLATILITY: {
    p50: 150,
    jitter: 50,
    spikeFreq: 0.05,
    spikeMultiplier: 10
  },
  EXCHANGE_STRESS: {
    p50: 800,
    jitter: 300,
    spikeFreq: 0.15,
    spikeMultiplier: 3
  },
  DEGRADED_INFRASTRUCTURE: {
    p50: 2000,
    jitter: 1500,
    spikeFreq: 0.20,
    spikeMultiplier: 4
  }
};

/**
 * Calculates a random latency based on the provided scenario profile.
 * @param {Object} scenario 
 * @returns {number} Delay in milliseconds
 */
export function calculateStochasticLatency(scenario) {
  // Base P50 + Jitter
  const jitterValue = (Math.random() * 2 - 1) * scenario.jitter; // Range [-jitter, +jitter]
  let finalLatency = scenario.p50 + jitterValue;

  // Spikes
  if (Math.random() < scenario.spikeFreq) {
    finalLatency *= scenario.spikeMultiplier;
  }

  // Ensure minimum physical network latency
  return Math.max(5, Math.floor(finalLatency));
}
