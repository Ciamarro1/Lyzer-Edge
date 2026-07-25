import { eventBus } from '../lib/eventBus.js';
import { calculateEDM } from '../intelligence/edm.ts';

export class FailureModeCartography {
  constructor() {
    this.activeModes = new Map(); // mode -> snapshots active
  }

  /**
   * Evaluates the 6 structural failure modes.
   * @param {Object} smlReport - The output from SML.analyze()
   * @param {Array} snapshots - The recent window of layer snapshots from SML
   * @returns {Object} Threat report
   */
  evaluateFailureModes(smlReport, snapshots) {
    if (!snapshots || snapshots.length < 10) return this._emptyReport();

    const threats = [];
    
    // 1. Governance Metastability
    const hasCapitalLock = smlReport.detections?.some(d => d.type === 'CAPITAL_LOCK');
    if (this._checkGovernanceMetastability(snapshots) || hasCapitalLock) {
      threats.push(this._createThreat('GOVERNANCE_METASTABILITY', 'CRITICAL', ['gal', 'epe', 'stl'], 
        'System is too safe to act. GAL is locking the system while EPE is dormant. Capital stagnation risk.'));
    }

    // 2. Evolutionary Monoculture Collapse
    if (this._checkMonoculture(snapshots)) {
      threats.push(this._createThreat('EVOLUTIONARY_MONOCULTURE', 'CRITICAL', ['epe', 'rsis'], 
        'Strategies converged. High fragility to regime shifts.'));
    }

    // 3. Feedback Resonance Loop
    const smlResonance = smlReport.detections?.find(d => d.type === 'OSCILLATION_RESONANCE');
    if (smlResonance && smlResonance.severity === 'CRITICAL') {
      const lastStl = snapshots[snapshots.length - 1].layers?.stl;
      // If oscillating AND thermodynamic budget is negative or throttling
      if (lastStl && (lastStl.signal === 'THROTTLE_REJECT' || lastStl.raw_metrics?.net_energy < 0)) {
        threats.push(this._createThreat('FEEDBACK_RESONANCE_LOOP', 'CRITICAL', ['gal', 'cfr', 'rsis', 'stl'], 
          'Interaction engines are fighting each other and consuming thermodynamic budget.'));
      }
    }

    // 4. Stability Mirage
    if (this._checkStabilityMirage(snapshots)) {
      threats.push(this._createThreat('STABILITY_MIRAGE', 'WARNING', ['rdm', 'kernel'], 
        'System believes it is performing well (high confidence), but reality is diverging.'));
    }

    // 5. Capital Concentration Death Spiral
    if (this._checkCfrSpiral(snapshots)) {
      threats.push(this._createThreat('CAPITAL_CONCENTRATION_DEATH_SPIRAL', 'CRITICAL', ['cfr', 'kernel'], 
        'Monopoly detected. Redistribution failing while dominant kernel loses efficiency.'));
    }

    // 6. Exploration Exhaustion
    if (this._checkExplorationExhaustion(snapshots)) {
      threats.push(this._createThreat('EXPLORATION_EXHAUSTION', 'WARNING', ['epe', 'stl'], 
        'EPE applying increasing pressure but no new edges found. Wasting energy.'));
    }

    // 7. Thermodynamic Decay
    const hasDrift = smlReport.detections?.some(d => d.type === 'THERMODYNAMIC_DRIFT');
    const hasChurn = smlReport.detections?.some(d => d.type === 'CAPITAL_CHURN');
    if (hasDrift || hasChurn) {
      threats.push(this._createThreat('THERMODYNAMIC_DECAY', 'CRITICAL', ['stl', 'sml', 'fmc'], 
        'Thermodynamic drift or excessive capital churn detected. Threat of fee bleed and energy depletion.'));
    }

    // 8. Capital Attrition Spiral
    if (this._checkCapitalAttritionSpiral(smlReport, snapshots)) {
      threats.push(this._createThreat('CAPITAL_ATTRITION_SPIRAL', 'CRITICAL', ['stl', 'sml', 'fmc'], 
        'Capital attrition spiral detected: high rotation/fee bleed velocity + increasing stress + dropping TR. Recursive degradation loop.'));
    }

    // 9. Counterfactual Hallucination (Sprint 2.7.5)
    const latestRecord = smlReport.latestEvidenceRecord;
    if (latestRecord) {
      const ccs = latestRecord.confidence;
      const csi = latestRecord.sensitivity;
      const eps = latestRecord.externalPlausibility;
      const ncr = latestRecord.narrativeRiskScore;
      
      if (ccs >= 0.6 && csi <= 0.3 && eps < 0.5 && ncr >= 0.5) {
        threats.push(this._createThreat('COUNTERFACTUAL_HALLUCINATION', 'CRITICAL', ['cil', 'fmc', 'sml'], 
          'System developed highly coherent, low-sensitivity internal counterfactual branches that are completely decoupled from external market reality.'));
      }
    }

    // 10. Epistemic Drift Momentum / PRE_HALLUCINATION (Sprint 2.7.5)
    const epsHistory = smlReport.epsHistory || snapshots.map(s => s.layers?.cil?.eps).filter(x => x !== undefined);
    if (epsHistory && epsHistory.length >= 4) {
      const edm = calculateEDM(epsHistory, 4);
      if (edm.warning) {
        const threat = this._createThreat('PRE_HALLUCINATION', 'WARNING', ['cil', 'fmc'], 
          'Epistemic Drift Momentum detected. External Plausibility Score is strictly declining over the last 4 periods.');
        threat.confidence = edm.edmScore;
        threats.push(threat);
        
        eventBus.emit('mil:EpistemicDriftDetected', {
          timestamp: Date.now(),
          edmScore: edm.edmScore,
          epsHistory: epsHistory.slice(-4)
        });
      }
    }

    // Update duration tracker
    const currentThreatIds = new Set(threats.map(t => t.mode));
    for (const [mode, duration] of this.activeModes.entries()) {
      if (!currentThreatIds.has(mode)) {
        this.activeModes.delete(mode); // Recovered
      }
    }
    
    threats.forEach(t => {
      const duration = (this.activeModes.get(t.mode) || 0) + 1;
      this.activeModes.set(t.mode, duration);
      t.duration = duration;
    });

    const systemIntegrity = threats.length > 0 ? Math.max(0, 1 - (threats.length * 0.2)) : 1.0;
    const cascadeRisk = threats.length > 1 ? 0.35 + (threats.length * 0.15) : 0.05;

    return {
      activeThreats: threats,
      cascadeRisk: Math.min(1.0, cascadeRisk),
      systemIntegrity: parseFloat(systemIntegrity.toFixed(2))
    };
  }

  _emptyReport() {
    return { activeThreats: [], cascadeRisk: 0, systemIntegrity: 1.0 };
  }

  _createThreat(mode, severity, affectedLayers, recommendation) {
    return { mode, severity, affectedLayers, recommendation, confidence: 0.85 };
  }

  // --- Signatures ---

  _checkGovernanceMetastability(snapshots) {
    // GAL = MAINTAIN for 10+ snaps AND EPE = no-go
    const recent = snapshots.slice(-10);
    const galMaintains = recent.filter(s => s.layers?.gal?.signal === 'MAINTAIN').length;
    const epeDormant = recent.filter(s => s.layers?.epe?.signal === 'no-go').length;
    return galMaintains >= 8 && epeDormant >= 8;
  }

  _checkMonoculture(snapshots) {
    // EPE monoculture_risk > 70 AND RSIS survival_rate dropping
    const last = snapshots[snapshots.length - 1].layers;
    return last?.epe?.raw_metrics?.monoculture_risk > 70 && last?.rsis?.raw_metrics?.survival_rate < 0.4;
  }

  _checkStabilityMirage(snapshots) {
    // RDM = STABLE for 15+ snaps AND Kernel confidence > 80 AND RDI > 0.2
    if (snapshots.length < 15) return false;
    const recent = snapshots.slice(-15);
    const rdmStables = recent.filter(s => s.layers?.rdm?.signal === 'STABLE').length;
    const highConf = recent.filter(s => s.layers?.kernel?.confidence > 80).length;
    const lastRdi = snapshots[snapshots.length - 1].layers?.rdm?.raw_metrics?.realityDriftIndex;
    
    return rdmStables >= 12 && highConf >= 12 && lastRdi > 0.2;
  }

  _checkCfrSpiral(snapshots) {
    // CFR maxShare > 0.85 AND CFR signal = REDISTRIBUTE
    const recent = snapshots.slice(-5);
    const redist = recent.filter(s => s.layers?.cfr?.signal === 'REDISTRIBUTE_CAPITAL').length;
    const lastCfr = snapshots[snapshots.length - 1].layers?.cfr;
    
    return redist >= 3 && lastCfr?.raw_metrics?.maxShare > 0.85;
  }

  _checkExplorationExhaustion(snapshots) {
    if (snapshots.length < 15) return false;
    const early = snapshots.slice(-15, -10);
    const late = snapshots.slice(-5);
    
    const earlyPressure = early.reduce((sum, s) => sum + (s.layers?.epe?.raw_metrics?.applied_pressure || 0), 0) / 5;
    const latePressure = late.reduce((sum, s) => sum + (s.layers?.epe?.raw_metrics?.applied_pressure || 0), 0) / 5;
    
    // Pressure increasing, but stl energy dropping
    const lastStl = late[late.length - 1].layers?.stl?.raw_metrics?.net_energy;
    return (latePressure > earlyPressure + 10) && lastStl < 0.3;
  }

  _checkCapitalAttritionSpiral(smlReport, snapshots) {
    const summary = smlReport.lastCapitalSummary;
    if (!summary) return false;
    // High fee bleed velocity AND high stress AND low thermodynamic ratio
    return summary.feeBleedVelocity > 5.0 && summary.averageStress > 0.7 && summary.averageRatio < 1.3;
  }

  getCascadeMap() {
    return {
      "RSIS → GAL": "Shock causes GAL to loosen constraints",
      "GAL → CFR": "Loose constraints enable aggressive capital redistribution",
      "CFR → RDM": "Capital shifts cause reality divergence",
      "RDM → STL": "Reality drift triggers thermodynamic throttling",
      "EPE → Kernel": "Exploration pressure forces Kernel into lower-confidence regimes"
    };
  }
}
 