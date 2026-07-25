import { eventBus } from '../lib/eventBus.js';
import { ThermodynamicRatioEvent, ThermodynamicStressEvent } from '../types/governanceContracts.js';

export interface MigrationEvaluation {
  allowed: boolean;
  ratio: number;
  reason: string;
}

export interface RegulationResult {
  signal: string;
  action: string;
  reason_codes: string[];
  adjustments: Record<string, any>;
  raw_metrics: Record<string, number>;
}

export class SystemThermodynamicsLayer {
  private threshold: number;
  private energyToEdgeRatio: number;

  constructor(config: { threshold?: number; energyToEdgeRatio?: number } = {}) {
    this.threshold = config.threshold ?? 1.5; // Default: Expected Gain must be > 1.5 * Migration Cost
    this.energyToEdgeRatio = config.energyToEdgeRatio ?? 1.5;
  }

  /**
   * Evaluates if a capital migration is allowed under the Second Law of Capital Thermodynamics.
   * 
   * Rule: TR = Expected Gain / Migration Cost > threshold
   * 
   * @param expectedGain The potential alpha or return gain from migrating capital
   * @param migrationCost The transaction costs, slippage, and fees associated with the move
   * @param customThreshold Optional custom threshold override
   */
  public evaluateMigration(
    expectedGain: number,
    migrationCost: number,
    customThreshold?: number
  ): MigrationEvaluation {
    const currentThreshold = customThreshold ?? this.threshold;
    
    // Handle edge cases
    if (migrationCost < 0) {
      migrationCost = 0;
    }

    let ratio: number;
    if (migrationCost === 0) {
      ratio = expectedGain >= 0 ? Infinity : 0;
    } else {
      ratio = expectedGain / migrationCost;
    }

    const allowed = ratio > currentThreshold;
    const reason = allowed ? 'TR_EXCEEDS_THRESHOLD' : 'VETO_THERMODYNAMIC_DEFICIT';

    const eventPayload: ThermodynamicRatioEvent = {
      ratio,
      expectedGain,
      migrationCost,
      threshold: currentThreshold,
      allowed,
      timestamp: Date.now()
    };

    // Publish Thermodynamic Ratio to SML via shared event bus
    eventBus.emit('thermodynamics:ratio', eventPayload);

    // Compute and publish Thermodynamic Stress (Problem 5)
    const stress = ratio > 0 ? Math.round((1 / ratio) * 10000) / 10000 : 100;
    const stressPayload: ThermodynamicStressEvent = {
      stress: Math.min(100, stress),
      ratio,
      expectedGain,
      migrationCost,
      timestamp: Date.now()
    };
    eventBus.emit('thermodynamics:stress', stressPayload);

    return {
      allowed,
      ratio,
      reason
    };
  }

  /**
   * Backward compatibility implementation of system regulation.
   */
  public regulate(subsystemMetrics: Record<string, number>, state: Record<string, number>): RegulationResult {
    const energyInput = (state.newEdge || 0) * 0.6 + (state.volatility || 0) * 0.4;

    const energyCost = (subsystemMetrics.governanceOverhead || 0) * 0.3 + 
                       (subsystemMetrics.simulationDepth || 0) * 0.5 + 
                       (subsystemMetrics.latency || 0) * 0.2;

    const energyDecay = (subsystemMetrics.staleEdges || 0) * 0.7 + 
                        (subsystemMetrics.redundantKernels || 0) * 0.3;

    const energyRecovery = (subsystemMetrics.pruning || 0) * 0.5 + 
                           (subsystemMetrics.exploration || 0) * 0.5;

    const netEnergyConsumed = energyCost + energyDecay - energyRecovery;
    const justifiedEdge = state.statisticallyJustifiedEdge || 0;

    let signal = 'NOMINAL';
    let action = 'MAINTAIN_BUDGET';
    const reason_codes: string[] = [];
    let recommendedAdjustments: Record<string, any> = {};

    const maxAllowedEnergy = justifiedEdge * this.energyToEdgeRatio;

    if (netEnergyConsumed > maxAllowedEnergy && maxAllowedEnergy > 0) {
      signal = 'THERMODYNAMIC_DEFICIT';
      action = 'THROTTLE_SUBSYSTEM';
      reason_codes.push('FIRST_LAW_VIOLATION');
      reason_codes.push('ENERGY_COST_EXCEEDS_JUSTIFIED_EDGE');
      
      recommendedAdjustments = {
        reduceSimulationDepth: true,
        forcePruning: true,
        targetComplexityReduction: netEnergyConsumed - maxAllowedEnergy
      };
    } else if (netEnergyConsumed < maxAllowedEnergy * 0.3 && maxAllowedEnergy > 0) {
      signal = 'THERMODYNAMIC_SURPLUS';
      action = 'EXPAND_BUDGET';
      reason_codes.push('HIGH_ENERGY_EFFICIENCY');
      
      recommendedAdjustments = {
        increaseSimulationDepth: true,
        allowExploration: true
      };
    }

    return {
      signal,
      action,
      reason_codes,
      adjustments: recommendedAdjustments,
      raw_metrics: {
        energyInput,
        energyCost,
        energyDecay,
        energyRecovery,
        netEnergyConsumed,
        justifiedEdge,
        maxAllowedEnergy
      }
    };
  }
}
