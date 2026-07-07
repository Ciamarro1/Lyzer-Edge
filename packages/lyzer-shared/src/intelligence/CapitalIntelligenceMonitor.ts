import { eventBus } from '../lib/eventBus.js';
import { 
  CapitalIntelligenceSummary, 
  ThermodynamicRatioEvent, 
  ThermodynamicStressEvent, 
  CapitalTrajectoryEvent, 
  OpportunityEntropyEvent 
} from '../types/governanceContracts.js';

export class CapitalIntelligenceMonitor {
  private ratioHistory: ThermodynamicRatioEvent[] = [];
  private stressHistory: ThermodynamicStressEvent[] = [];
  private trajectoryHistory: CapitalTrajectoryEvent[] = [];
  private entropyHistory: OpportunityEntropyEvent[] = [];
  
  private windowSize: number = 20;
  private totalFeeBleed: number = 0;
  private monitorStartTime: number = Date.now();

  constructor(windowSize: number = 20) {
    this.windowSize = windowSize;
    this.setupListeners();
  }

  private setupListeners(): void {
    eventBus.on('thermodynamics:ratio', (data: ThermodynamicRatioEvent) => {
      this.ratioHistory.push(data);
      if (this.ratioHistory.length > this.windowSize) this.ratioHistory.shift();
      if (data.allowed) {
        this.totalFeeBleed += data.migrationCost;
      }
      this.evaluateAndEmitSummary();
    });

    eventBus.on('thermodynamics:stress', (data: ThermodynamicStressEvent) => {
      this.stressHistory.push(data);
      if (this.stressHistory.length > this.windowSize) this.stressHistory.shift();
    });

    eventBus.on('observational:trajectory_update', (data: CapitalTrajectoryEvent) => {
      this.trajectoryHistory.push(data);
      if (this.trajectoryHistory.length > this.windowSize) this.trajectoryHistory.shift();
      this.evaluateAndEmitSummary();
    });

    eventBus.on('research:opportunity_entropy', (data: OpportunityEntropyEvent) => {
      this.entropyHistory.push(data);
      if (this.entropyHistory.length > this.windowSize) this.entropyHistory.shift();
      this.evaluateAndEmitSummary();
    });
  }

  /**
   * Evaluates the collected metrics and publishes an intelligence summary to SML/FMC.
   */
  public evaluateAndEmitSummary(): void {
    const timestamp = Date.now();

    // 1. Calculate Average Stress & Ratio
    const avgStress = this.stressHistory.length > 0 
      ? this.stressHistory.reduce((sum, s) => sum + s.stress, 0) / this.stressHistory.length
      : 1.0;
    
    const avgRatio = this.ratioHistory.length > 0
      ? this.ratioHistory.reduce((sum, r) => sum + r.ratio, 0) / this.ratioHistory.length
      : 1.5;

    // 2. Calculate Fee Bleed Velocity (Dollar bleed per minute)
    // Formula: (Total fee bleed in window) / (Time elapsed in minutes)
    const timeElapsedMin = (timestamp - this.monitorStartTime) / 60000;
    const feeBleedVelocity = timeElapsedMin > 0 ? this.totalFeeBleed / timeElapsedMin : 0;

    // 3. Get Capital Velocity & Retention from last trajectory update
    const lastTrajectory = this.trajectoryHistory[this.trajectoryHistory.length - 1];
    const capitalVelocity = lastTrajectory ? lastTrajectory.capitalVelocity : 0;
    const capitalRetention = lastTrajectory ? lastTrajectory.capitalRetention : 1.0;

    // 4. Get last Opportunity Entropy
    const lastEntropy = this.entropyHistory[this.entropyHistory.length - 1];
    const opportunityEntropy = lastEntropy ? lastEntropy.entropy : 0;

    // 5. Evaluate Alerts
    // Alert A: Thermodynamic Drift (TR is drifting lower while stress is rising)
    const driftAlert = avgRatio < 1.1 && avgStress > 0.9;

    // Alert B: Capital Lock (Capital retention is 1.0 (no velocity) while opportunity entropy is high)
    const lockAlert = capitalRetention === 1.0 && opportunityEntropy > 0.5 && this.trajectoryHistory.length >= 5;

    // Alert C: Capital Churn (Q1: measured by Fee Bleed Velocity instead of simple velocity)
    // If fee bleed velocity is high, capital is being churned ineffectively
    const churnAlert = feeBleedVelocity > 10.0; // Veto/Alert threshold: $10/min of fee bleed

    const summary: CapitalIntelligenceSummary = {
      timestamp,
      averageStress: Math.round(avgStress * 10000) / 10000,
      averageRatio: Math.round(avgRatio * 10000) / 10000,
      feeBleedVelocity: Math.round(feeBleedVelocity * 10000) / 10000,
      capitalVelocity,
      capitalRetention,
      opportunityEntropy,
      driftAlert,
      lockAlert,
      churnAlert
    };

    // Emit to SML/FMC/MIL/CIL
    eventBus.emit('capital:intelligence_summary', summary);
  }

  public getSummaryStats() {
    const timeElapsedMin = (Date.now() - this.monitorStartTime) / 60000;
    return {
      totalFeeBleed: this.totalFeeBleed,
      timeElapsedMin,
      feeBleedVelocity: timeElapsedMin > 0 ? this.totalFeeBleed / timeElapsedMin : 0
    };
  }
}
