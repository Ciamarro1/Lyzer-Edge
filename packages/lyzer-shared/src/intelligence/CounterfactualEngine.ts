import { ExternalRealitySnapshot } from './ExternalFeedAdapter.js';
import { CounterfactualEvidenceRecord, EvidenceLineage } from '../types/governanceContracts.js';
import { v4 as uuidv4 } from 'uuid';

export interface TimelineEvent {
  id: string;
  timestamp: number;
  expectedEdge: number;      // e.g. 0.03 (3% expected edge)
  realizedPnl: number;       // actual dollar PnL realized
  migrationCost: number;     // actual dollar migration cost
  allowed: boolean;          // actual decision made by STL
  opportunityEntropy: number;// entropy score
  thermodynamicStress: number;// stress score
  allocations: Record<string, number>;
}

export interface SimulationResult {
  simulatedEquity: number;
  vetoedIndices: number[];
  allowedIndices: number[];
  path: number[]; // equity at each step
  isPruned: boolean;
  pruneReason: string;
}

export class CounterfactualEngine {
  private initialEquity: number;
  private maxDepth: number = 3; // D_max = 3 downstream steps re-evaluated

  constructor(initialEquity: number = 10000, maxDepth: number = 3) {
    this.initialEquity = initialEquity;
    this.maxDepth = maxDepth;
  }

  /**
   * Deterministic pseudo-random number generator (Mulberry32)
   */
  private getPRNG(seed: number | string): () => number {
    let seedNum = 0;
    if (typeof seed === 'string') {
      for (let i = 0; i < seed.length; i++) {
        seedNum = (seedNum << 5) - seedNum + seed.charCodeAt(i);
        seedNum |= 0;
      }
    } else {
      seedNum = seed;
    }
    return () => {
      let t = (seedNum += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Evaluates Structural Plausibility Checks (SPC)
   */
  private checkStructuralPlausibility(
    equity: number,
    stress: number,
    allocations: Record<string, number>,
    actualBaselineEquity: number
  ): { plausible: boolean; reason: string } {
    if (equity < 0) {
      return { plausible: false, reason: 'Negative Capital detected ($' + equity.toFixed(2) + ')' };
    }
    if (stress <= 0 || Number.isNaN(stress) || !Number.isFinite(stress)) {
      return { plausible: false, reason: 'Impossible Stress value detected (' + stress + ')' };
    }
    // Allocations validation: check if sum exceeds standard leverage limits (e.g. 150%) relative to baseline capital
    let sum = 0;
    for (const val of Object.values(allocations)) {
      if (val < 0) {
        return { plausible: false, reason: 'Invalid negative allocation detected' };
      }
      sum += val;
    }
    const leverage = actualBaselineEquity > 0 ? sum / actualBaselineEquity : 0;
    if (leverage > 1.5) {
      return { plausible: false, reason: 'Allocation sum violates leverage constraints (' + leverage + ')' };
    }
    return { plausible: true, reason: '' };
  }

  /**
   * Core Replay logic running over a specific window of events
   */
  private runReplay(
    events: TimelineEvent[],
    interventionIndex: number,
    threshold: number,
    frictionBps: number,
    pertShift: { threshold: number; cost: number; stress: number },
    randGen: () => number
  ): SimulationResult {
    const totalEvents = events.length;
    if (totalEvents === 0 || interventionIndex < 0 || interventionIndex >= totalEvents) {
      return { simulatedEquity: this.initialEquity, vetoedIndices: [], allowedIndices: [], path: [], isPruned: true, pruneReason: 'Empty timeline or invalid intervention index' };
    }

    let equity = this.initialEquity;
    const path: number[] = [equity];
    const vetoedIndices: number[] = [];
    const allowedIndices: number[] = [];

    // Adjust parameters with perturbations
    const activeThreshold = threshold * (1 + pertShift.threshold);
    const activeFriction = (frictionBps / 10000) * (1 + pertShift.cost);

    // Timeline Loop
    for (let k = 0; k < totalEvents; k++) {
      const event = events[k];
      const isWithinCascade = k >= interventionIndex && k <= interventionIndex + this.maxDepth;

      let allowed = event.allowed;

      if (k === interventionIndex) {
        // Swap decision
        allowed = !event.allowed;
      } else if (isWithinCascade) {
        // Re-evaluate using simulated capital, stress, and threshold
        const simulatedStress = event.thermodynamicStress * (1 + pertShift.stress);
        
        // Dynamic expected gain and cost based on simulated equity
        const simulatedCost = equity * activeFriction;
        const simulatedGain = equity * event.expectedEdge;
        
        const simulatedTR = simulatedCost > 0 ? simulatedGain / simulatedCost : 100;
        allowed = simulatedTR > activeThreshold;
      }

      // Check SPC before applying step returns
      const spc = this.checkStructuralPlausibility(equity, event.thermodynamicStress, event.allocations, this.initialEquity);
      if (!spc.plausible) {
        return { simulatedEquity: equity, vetoedIndices, allowedIndices, path, isPruned: true, pruneReason: spc.reason };
      }

      if (allowed) {
        const simulatedCost = equity * activeFriction;
        // Scale actual return based on capital difference
        const actualReturnPct = event.realizedPnl / this.initialEquity; 
        const simulatedPnl = equity * actualReturnPct;

        equity += (simulatedPnl - simulatedCost);
        allowedIndices.push(k);
      } else {
        vetoedIndices.push(k);
      }

      path.push(equity);
    }

    return {
      simulatedEquity: Math.round(equity * 100) / 100,
      vetoedIndices,
      allowedIndices,
      path,
      isPruned: false,
      pruneReason: ''
    };
  }

  /**
   * Executes the full alternative history simulation, GCR calculations, CSI perturbations, and CCS scoring.
   */
  public simulateAlternativeHistory(
    events: TimelineEvent[],
    interventionIndex: number,
    threshold: number = 1.5,
    frictionBps: number = 15,
    simulationSeed: string | number = 'lyzer-default-seed',
    externalContext?: ExternalRealitySnapshot
  ): {
    record: CounterfactualEvidenceRecord;
    isPruned: boolean;
    pruneReason: string;
  } {
    const prng = this.getPRNG(simulationSeed);

    // 1. Run main unperturbed simulation
    const mainSim = this.runReplay(events, interventionIndex, threshold, frictionBps, { threshold: 0, cost: 0, stress: 0 }, prng);
    if (mainSim.isPruned) {
      return {
        record: null as any,
        isPruned: true,
        pruneReason: mainSim.pruneReason
      };
    }

    // 2. Run Perturbation Analysis for CSI
    const perturbations = [
      { threshold: 0.05, cost: 0.0, stress: 0.0 },
      { threshold: -0.05, cost: 0.0, stress: 0.0 },
      { threshold: 0.10, cost: 0.0, stress: 0.0 },
      { threshold: -0.10, cost: 0.0, stress: 0.0 },
      { threshold: 0.0, cost: 0.10, stress: 0.0 },
      { threshold: 0.0, cost: -0.10, stress: 0.0 },
      { threshold: 0.0, cost: 0.0, stress: 0.10 },
      { threshold: 0.0, cost: 0.0, stress: -0.10 }
    ];

    const perturbedEquities: number[] = [];
    for (const pert of perturbations) {
      const sim = this.runReplay(events, interventionIndex, threshold, frictionBps, pert, prng);
      if (!sim.isPruned) {
        perturbedEquities.push(sim.simulatedEquity);
      }
    }

    // Compute CSI
    let csi = 0.5; // default high sensitivity if perturbations fail
    if (perturbedEquities.length > 0) {
      const mean = perturbedEquities.reduce((a, b) => a + b, 0) / perturbedEquities.length;
      const variance = perturbedEquities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / perturbedEquities.length;
      const stdDev = Math.sqrt(variance);
      csi = mean !== 0 ? stdDev / Math.abs(mean) : 0;
    }
    csi = Math.round(csi * 10000) / 10000;

    // 3. Compute GCR-E, GCR-R, GCE, AOTD
    let sumExpectedEdgeSuppressed = 0;
    let sumExpectedEdgeTotal = 0;
    let sumRealizedReturnSuppressed = 0;
    let sumRealizedReturnTotal = 0;
    let totalCostAvoided = 0;

    // Calculate Best Counterfactual Equity over the interval to derive missed alpha
    let bestCounterfactualEquity = this.initialEquity;
    let actualFinalEquity = this.initialEquity;

    const actualReturns: number[] = [];
    const bestReturns: number[] = [];

    for (let k = 0; k < events.length; k++) {
      const ev = events[k];
      const cost = actualFinalEquity * (frictionBps / 10000);
      const isProfitable = ev.realizedPnl > 0;

      // Actual path logic
      let actRet = 0;
      if (ev.allowed) {
        actRet = ev.realizedPnl - cost;
        actualFinalEquity += actRet;
        actualReturns.push(actRet);
      } else {
        totalCostAvoided += cost;
        actualReturns.push(0);
      }

      // Best Counterfactual path logic (allows profitable vetoes, vetoes unprofitable allows)
      let bestRet = 0;
      if (isProfitable) {
        bestRet = ev.realizedPnl - cost;
        bestCounterfactualEquity += bestRet;
        bestReturns.push(bestRet);
      } else {
        bestReturns.push(0);
      }

      // Suppressed metrics accumulator
      if (isProfitable) {
        sumExpectedEdgeTotal += ev.expectedEdge;
        sumRealizedReturnTotal += ev.realizedPnl;
        
        if (!ev.allowed) {
          sumExpectedEdgeSuppressed += ev.expectedEdge;
          sumRealizedReturnSuppressed += ev.realizedPnl;
        }
      }
    }

    const gcrE = sumExpectedEdgeTotal > 0 ? sumExpectedEdgeSuppressed / sumExpectedEdgeTotal : 0;
    const gcrR = sumRealizedReturnTotal > 0 ? sumRealizedReturnSuppressed / sumRealizedReturnTotal : 0;
    const gce = Math.abs(gcrE - gcrR);

    // Risk Avoided calculation (difference in standard deviations)
    const stdDevActual = this.calculateStdDev(actualReturns);
    const stdDevBest = this.calculateStdDev(bestReturns);
    const riskAvoided = Math.max(0, stdDevActual - stdDevBest);

    const missedAlpha = Math.max(0, bestCounterfactualEquity - actualFinalEquity);
    const aotd = (totalCostAvoided + riskAvoided) > 0 ? missedAlpha / (totalCostAvoided + riskAvoided) : 0;

    // 4. Calculate CCS (Weighted Confidence Score)
    const simulatedSteps = Math.min(events.length - interventionIndex, this.maxDepth + 1);
    const coverage = simulatedSteps / events.length;
    
    // Completeness check
    const completeEventsCount = events.filter(e => e.expectedEdge !== undefined && e.realizedPnl !== undefined).length;
    const completeness = events.length > 0 ? completeEventsCount / events.length : 1.0;
    
    const distance = interventionIndex / events.length; // Close to end = higher confidence
    const divergence = Math.abs(mainSim.simulatedEquity - actualFinalEquity) / actualFinalEquity;
    const divScore = 1 - Math.min(0.5, divergence);

    const ccs = this.calculateWeightedConfidence(coverage, completeness, distance, divScore);

    // EPS, EDA, EDD, NCR calculations
    const cfRet = (mainSim.simulatedEquity - this.initialEquity) / this.initialEquity;
    let eps = 0.0;
    let eda = 0.0;
    let edd = 0.0;
    let benchRet = 0.0;
    let volatility = 0.15;

    if (externalContext) {
      benchRet = externalContext.benchmarkReturn;
      volatility = externalContext.marketVolatility;
      // Guarded EPS formula (epsilon = 0.01)
      eps = 1 - Math.min(1.0, Math.abs(cfRet - benchRet) / Math.max(0.01, Math.abs(benchRet) + volatility));
      eps = Math.round(eps * 10000) / 10000;

      // EDA step-by-step sign match
      let matches = 0;
      const stepBenchmarkReturns = (externalContext as any).stepBenchmarkReturns;
      const getSign = (val: number) => {
        if (val > 0) return 1;
        if (val < 0) return -1;
        return 0;
      };

      for (let k = 0; k < events.length; k++) {
        const stepCfRet = mainSim.path[k+1] - mainSim.path[k];
        const stepBenchRet = (stepBenchmarkReturns && stepBenchmarkReturns[k] !== undefined)
          ? stepBenchmarkReturns[k]
          : externalContext.benchmarkReturn; // fallback to window level return
        
        if (getSign(stepCfRet) === getSign(stepBenchRet)) {
          matches++;
        }
      }
      eda = matches / events.length;
      eda = Math.round(eda * 10000) / 10000;

      edd = Math.abs(cfRet - benchRet);
      edd = Math.round(edd * 10000) / 10000;
    }

    // Continuous NCR
    const ncr = (1 - eps) * ccs * (1 - csi);
    const ncrScore = Math.round(ncr * 10000) / 10000;

    let narrativeRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (ncrScore >= 0.75) {
      narrativeRisk = 'CRITICAL';
    } else if (ncrScore >= 0.50) {
      narrativeRisk = 'HIGH';
    } else if (ncrScore >= 0.25) {
      narrativeRisk = 'MODERATE';
    }

    // 5. Build Evidence Lineage metadata
    const lineage: EvidenceLineage = {
      sourceEventsSet: events.map(e => e.id),
      simulationVersion: '1.0.0',
      constitutionVersion: '1.5',
      replayTimestamp: Date.now(),
      externalAnchorVersion: externalContext ? `anchor_${externalContext.timestamp}` : 'local_static_1.0.0'
    };

    // Determine outcomes based on vetoes and returns
    const wasVetoed = !events[interventionIndex].allowed;
    const observedOutcome = wasVetoed ? 'Capital Lock (Veto Active)' : 'Capital Migrated';
    const counterfactualOutcome = wasVetoed ? 'Rotation Allowed with Profit Captured' : 'Rotation Suppressed (Friction Avoided)';

    return {
      isPruned: false,
      pruneReason: '',
      record: {
        id: uuidv4(),
        timestamp: Date.now(),
        cause: events[interventionIndex].opportunityEntropy > 0.6 ? 'VOLATILITY_SHOCK' : 'NONE',
        intervention: wasVetoed ? 'TR_VETO' : 'NONE',
        observedOutcome,
        counterfactualOutcome,
        confidence: ccs,
        sensitivity: csi,
        externalPlausibility: eps,
        externalDirectionAgreement: eda,
        externalDrift: edd,
        narrativeRiskScore: ncrScore,
        narrativeRisk,
        simulationSeed,
        lineage,
        evidenceStrength: Math.round(Math.min(1.0, events.length / 50) * completeness * 10000) / 10000,
        externalAnchorAlignment: externalContext ? (externalContext.benchmarkReturn > 0 ? 0.85 : -0.25) : 0.0,
        metrics: {
          gcrE: Math.round(gcrE * 10000) / 10000,
          gcrR: Math.round(gcrR * 10000) / 10000,
          gce: Math.round(gce * 10000) / 10000,
          aotd: Math.round(aotd * 10000) / 10000,
          capitalDelta: Math.round((mainSim.simulatedEquity - actualFinalEquity) * 100) / 100
        },
        simulationContext: {
          startTime: events[0].timestamp,
          endTime: events[events.length - 1].timestamp,
          depth: simulatedSteps,
          stepsReplayed: events.length
        }
      }
    };
  }

  /**
   * Weighted additive score to avoid confidence collapse.
   */
  public calculateWeightedConfidence(
    coverage: number,
    completeness: number,
    distance: number,
    divergence: number
  ): number {
    const score = 0.35 * coverage + 0.35 * completeness + 0.15 * distance + 0.15 * divergence;
    return Math.round(score * 10000) / 10000;
  }

  /**
   * Persistence quality gate
   */
  public shouldPersistEvidence(record: CounterfactualEvidenceRecord): boolean {
    const MIN_CCS = 0.6;
    const MAX_CSI = 0.3;
    const MIN_EPS = 0.5;
    return record.confidence >= MIN_CCS && 
           record.sensitivity <= MAX_CSI && 
           record.externalPlausibility >= MIN_EPS;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const sqDiffSum = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
    return Math.sqrt(sqDiffSum / values.length);
  }
}
