/**
 * @fileoverview Governance contracts for Lyzer Labs (Release 1.7.5)
 * Defines formal typescript interfaces for all governance and thermodynamic events.
 */

export interface OpportunityEntropyEvent {
  entropy: number; // Shannon entropy of expected edge distribution
  triggerEvent: 'REGIME_CHANGE' | 'ALLOCATION_CHANGE' | 'OPPORTUNITY_COLLAPSE' | 'VOLATILITY_SHOCK';
  activeOpportunityCount: number;
  timestamp: number; // epoch ms
}

export interface ThermodynamicRatioEvent {
  ratio: number; // Expected Gain / Migration Cost
  expectedGain: number;
  migrationCost: number;
  threshold: number; // Configurable limit
  allowed: boolean; // Veto decision (allowed if ratio > threshold)
  timestamp: number; // epoch ms
}

/**
 * Problem 5 - ThermodynamicStressEvent
 * Published by the STL to SML, MIL, and FMC.
 */
export interface ThermodynamicStressEvent {
  stress: number; // 1 / TR
  ratio: number;
  expectedGain: number;
  migrationCost: number;
  timestamp: number;
}

export interface CapitalTrajectoryEvent {
  timestamp: number; // epoch ms
  capitalAgeAvg: number; // Weighted average age in ms
  capitalVelocity: number; // Turnover speed normalized [0, 1]
  capitalConcentration: number; // Herfindahl-Hirschman Index (HHI) [0, 1]
  capitalRetention: number; // 1 - velocity
  allocations: Record<string, number>; // Current capital per strategy
}

export interface CounterfactualCapitalPathEvent {
  timestamp: number; // epoch ms
  baselineEquity: number; // Equity assuming zero automatic migration
  migrationEquity: number; // Equity assuming active migration (EES chasing)
  feeBleedAccumulated: number;
  alphaCapturedAccumulated: number;
  netDivergence: number; // baselineEquity - migrationEquity
}

/**
 * Problem 1 - CapitalIntelligenceSummary
 * Published by the CIM (Capital Intelligence Monitor) to SML and FMC.
 */
export interface CapitalIntelligenceSummary {
  timestamp: number;
  averageStress: number;
  averageRatio: number;
  feeBleedVelocity: number; // Churn measured in dollar bleed per unit time
  capitalVelocity: number;
  capitalRetention: number;
  opportunityEntropy: number;
  driftAlert: boolean; // True if TR is drifting lower and stress is high
  lockAlert: boolean;  // True if retention is 1.0 while entropy is high
  churnAlert: boolean; // True if fee bleed velocity is high
}

/**
 * Problem 3 - CausalRecord
 * Map structural elements: Cause -> Intervention -> Outcome
 */
export interface CausalRecord {
  timestamp: number;
  cause: 'VOLATILITY_SHOCK' | 'REGIME_CHANGE' | 'OPPORTUNITY_COLLAPSE' | 'MARKET_STRESS' | 'NONE';
  intervention: 'TR_VETO' | 'ECA_CONSTRAINT' | 'FMC_ALERT' | 'GOVERNANCE_OVERRIDE' | 'ALLOCATION_FREEZE' | 'NONE';
  observedOutcome: string; // e.g., "Capital Lock", "Fee Bleed Stopped"
  counterfactualOutcome: string; // e.g., "Rotation Allowed but Bleed Incurred"
}

export type CausalTrigger = 
  | 'VOLATILITY_SHOCK' 
  | 'REGIME_CHANGE' 
  | 'OPPORTUNITY_COLLAPSE' 
  | 'MARKET_STRESS' 
  | 'NONE';

export type SystemIntervention = 
  | 'TR_VETO' 
  | 'ECA_CONSTRAINT' 
  | 'FMC_ALERT' 
  | 'GOVERNANCE_OVERRIDE' 
  | 'ALLOCATION_FREEZE' 
  | 'NONE';

export type NarrativeCompressionRiskType = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface EvidenceLineage {
  sourceEventsSet: string[];        // Array of event IDs consumed as inputs
  simulationVersion: string;        // Version of the simulation codebase
  constitutionVersion: string;      // e.g. "1.5"
  replayTimestamp: number;          // Timestamp when the simulation was executed
  externalAnchorVersion: string;    // Identifier for the benchmark feed version used
}

export interface CounterfactualEvidenceRecord {
  id: string;                       // Unique evidence block identifier (UUID)
  timestamp: number;                // Simulation epoch timestamp in ms
  cause: CausalTrigger;
  intervention: SystemIntervention;
  observedOutcome: string;
  counterfactualOutcome: string;
  confidence: number;               // CCS score [0, 1]
  sensitivity: number;              // CSI score [0, inf)
  externalPlausibility: number;     // EPS score [0, 1]
  externalDirectionAgreement: number; // EDA score [0, 1]
  externalDrift: number;            // EDD score [0, inf)
  narrativeRiskScore: number;       // Continuous NCR score [0, 1]
  narrativeRisk: NarrativeCompressionRiskType;
  simulationSeed: string | number;  // Seed for determinism
  lineage: EvidenceLineage;         // Traceability audit map
  evidenceStrength: number;         // Statistical weight [0, 1]
  externalAnchorAlignment: number;  // Correlation to benchmark [-1, 1]
  metrics: {
    gcrE: number;                   // Governance Compression Ratio (Expected)
    gcrR: number;                   // Governance Compression Ratio (Realized)
    gce: number;                    // Governance Calibration Error
    aotd: number;                   // Adjusted Opportunity Thermodynamic Deficit
    capitalDelta: number;           // Net dollar difference between simulated and actual equity
  };
  simulationContext: {
    startTime: number;
    endTime: number;
    depth: number;                  // Branch depth reached
    stepsReplayed: number;
  };
}

