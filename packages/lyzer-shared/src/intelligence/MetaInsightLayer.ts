import { eventBus } from '../lib/eventBus.js';
import { ThermodynamicRatioEvent } from '../types/governanceContracts.js';

export interface VetoedOpportunity {
  id: string;
  expectedGain: number;
  migrationCost: number;
  timestamp: number;
  realizedReturn?: number;
}

export class MetaInsightLayer {
  private vetoedOpportunities: Map<string, VetoedOpportunity> = new Map();
  private allowedOpportunities: Map<string, { migrationCost: number; realizedReturn?: number }> = new Map();
  private currentBaselineEquity: number = 10000;
  private bestCounterfactualEquity: number = 10000;
  private totalFeeBleed: number = 0;

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    // Listen to thermodynamics:ratio events (STL publication)
    eventBus.on('thermodynamics:ratio', (data: ThermodynamicRatioEvent) => {
      // Use timestamp + expectedGain as a unique key for the opportunity
      const opportunityId = `opt_${data.timestamp}_${Math.round(data.expectedGain * 100)}`;
      if (!data.allowed) {
        this.vetoedOpportunities.set(opportunityId, {
          id: opportunityId,
          expectedGain: data.expectedGain,
          migrationCost: data.migrationCost,
          timestamp: data.timestamp
        });
      } else {
        this.allowedOpportunities.set(opportunityId, {
          migrationCost: data.migrationCost
        });
        this.totalFeeBleed += data.migrationCost;
      }
    });
  }

  /**
   * Records the actual realized outcome of an opportunity.
   * If it was vetoed, this allows us to compute COSUP and Best Counterfactual Path.
   */
  public recordOpportunityOutcome(opportunityId: string, realizedPnl: number): void {
    // 1. If it was vetoed, and it was positive -> Best Counterfactual Path gets this PnL
    const vetoed = this.vetoedOpportunities.get(opportunityId);
    if (vetoed) {
      vetoed.realizedReturn = realizedPnl;
      if (realizedPnl > 0) {
        // If we didn't veto, we would have gained realizedPnl but paid migrationCost
        const netContribution = realizedPnl - vetoed.migrationCost;
        if (netContribution > 0) {
          this.bestCounterfactualEquity += netContribution;
          // Emit COSUP alert: Counterfactual Opportunity Suppression
          eventBus.emit('mil:cosup_alert', {
            opportunityId,
            suppressedGain: realizedPnl,
            frictionPaid: vetoed.migrationCost,
            netMissedAlpha: netContribution,
            reason: 'TR VETO suppressed a highly profitable opportunity'
          });
        }
      }
    }

    // 2. If it was allowed, adjust our baseline equity
    const allowed = this.allowedOpportunities.get(opportunityId);
    if (allowed) {
      allowed.realizedReturn = realizedPnl;
      this.currentBaselineEquity += (realizedPnl - allowed.migrationCost);
      // Best Counterfactual Path also takes it if it was positive
      if (realizedPnl - allowed.migrationCost > 0) {
        this.bestCounterfactualEquity += (realizedPnl - allowed.migrationCost);
      }
    }
  }

  /**
   * Returns the list of vetoed opportunities.
   */
  public getVetoedOpportunities(): VetoedOpportunity[] {
    return Array.from(this.vetoedOpportunities.values());
  }

  /**
   * Detects Missed Alpha against the Best Counterfactual Path.
   * Q2: Missed Alpha = Best Counterfactual Path - Current Baseline Equity.
   */
  public detectMissedAlpha(): { missedAlpha: number; ratio: number } {
    const missedAlpha = Math.max(0, this.bestCounterfactualEquity - this.currentBaselineEquity);
    const ratio = this.currentBaselineEquity > 0 ? missedAlpha / this.currentBaselineEquity : 0;
    return {
      missedAlpha: Math.round(missedAlpha * 100) / 100,
      ratio: Math.round(ratio * 10000) / 10000
    };
  }

  /**
   * Governance Blindness check.
   * Restrictive blindness: Missed Alpha is high (vetoes are blocking profitable trades).
   * Permissive blindness: Fee bleed is high compared to actual alpha captured.
   */
  public detectGovernanceBlindness(): {
    blindnessDetected: boolean;
    type: 'RESTRICTIVE' | 'PERMISSIVE' | 'NONE';
    score: number;
    reason: string;
  } {
    const { missedAlpha, ratio: missedAlphaRatio } = this.detectMissedAlpha();

    // 1. Restrictive Blindness check (too many good things vetoed)
    if (missedAlphaRatio > 0.05) {
      return {
        blindnessDetected: true,
        type: 'RESTRICTIVE',
        score: missedAlphaRatio,
        reason: `Overly restrictive veto threshold: suppressed profitable opportunities resulting in ${Math.round(missedAlphaRatio * 10000) / 100}% missed alpha.`
      };
    }

    // 2. Permissive Blindness check (allowed migrations bleed too many fees)
    if (this.totalFeeBleed > 500 && this.currentBaselineEquity < 10000) {
      return {
        blindnessDetected: true,
        type: 'PERMISSIVE',
        score: Math.round((this.totalFeeBleed / 10000) * 10000) / 10000,
        reason: `Overly permissive governance: allowed migrations generated significant fee bleed ($${this.totalFeeBleed.toFixed(2)}).`
      };
    }

    return {
      blindnessDetected: false,
      type: 'NONE',
      score: 0,
      reason: 'Governance threshold is well-calibrated.'
    };
  }

  /**
   * Future Governance Lock Detector (Phase 4 / D7)
   * Triggers ONLY when expected governance compression (GCR-E) and Missed Alpha exceed
   * limits for 10 consecutive windows, conditioned on CCS >= 0.6 and CSI <= 0.3.
   */
  public evaluateFutureGovernanceLock(
    gcrEHistory: number[],
    projectedMissedAlphaHistory: number[],
    capital: number,
    ccs: number,
    csi: number,
    eps: number
  ): boolean {
    if (gcrEHistory.length < 10 || projectedMissedAlphaHistory.length < 10) {
      return false;
    }

    // Conditioning: CCS >= 0.6 and CSI <= 0.3 and EPS >= 0.5
    if (ccs < 0.6 || csi > 0.3 || eps < 0.5) {
      return false;
    }

    // Check last 10 periods
    const last10GcrE = gcrEHistory.slice(-10);
    const last10Missed = projectedMissedAlphaHistory.slice(-10);

    const triggerLimit = capital * 0.03; // 3% of capital
    const isLocked = last10GcrE.every(gcr => gcr > 0.60) && 
                     last10Missed.every(missed => missed > triggerLimit);

    if (isLocked) {
      eventBus.emit('mil:future_governance_lock', {
        timestamp: Date.now(),
        averageGcrE: Math.round((last10GcrE.reduce((a, b) => a + b, 0) / 10) * 10000) / 10000,
        averageMissedAlpha: Math.round((last10Missed.reduce((a, b) => a + b, 0) / 10) * 100) / 100,
        reason: 'Critical Future Governance Lock: Over 60% GCR-E and > 3% capital missed alpha for 10 consecutive periods.'
      });
    }

    return isLocked;
  }
}
