import { eventBus } from '../lib/eventBus.js';

export class SystemMetacognitionLayer {
  constructor(config = {}) {
    this.windowSize = config.windowSize || 50;
    this.snapshots = [];
    
    // Track observation state for the 7th detector (Observer Influence)
    this.observationHistory = {
      observed: [], // Snapshots when system was being observed (e.g. dashboard open)
      unobserved: [] // Snapshots when system was running headless/unobserved
    };

    // Subscribe to Capital Intelligence Monitor updates (Problem 1)
    this.lastCapitalSummary = null;
    eventBus.on('capital:intelligence_summary', (summary) => {
      this.lastCapitalSummary = summary;
    });
  }

  /**
   * Ingests a state snapshot of all layers
   * @param {Object} snapshot - The full system state (outputs of all 11 layers)
   * @param {boolean} isObserved - Null State / Observer flag (true if user is looking at dashboard/metrics)
   */
  ingestSnapshot(snapshot, isObserved = false) {
    const snap = {
      timestamp: Date.now(),
      isObserved,
      ...snapshot
    };
    
    this.snapshots.push(snap);
    if (this.snapshots.length > this.windowSize) {
      this.snapshots.shift();
    }
    
    // Maintain observation history for statistical comparison (keep up to 100 each)
    if (isObserved) {
      this.observationHistory.observed.push(snap);
      if (this.observationHistory.observed.length > 100) this.observationHistory.observed.shift();
    } else {
      this.observationHistory.unobserved.push(snap);
      if (this.observationHistory.unobserved.length > 100) this.observationHistory.unobserved.shift();
    }
  }

  analyze() {
    if (this.snapshots.length < 5) {
      return { systemState: 'HEALTHY', detections: [], balance: {}, snapshotCount: this.snapshots.length };
    }

    const detections = [];

    // 8. Thermodynamic Drift Detector (Problem 1)
    if (this.lastCapitalSummary && this.lastCapitalSummary.driftAlert) {
      detections.push({
        type: 'THERMODYNAMIC_DRIFT',
        severity: 'CRITICAL',
        averageRatio: this.lastCapitalSummary.averageRatio,
        averageStress: this.lastCapitalSummary.averageStress,
        recommendation: 'Thermodynamic Ratio is below critical limits. Restrict high-friction capital movements.'
      });
    }

    // 9. Capital Lock Detector (Problem 1)
    if (this.lastCapitalSummary && this.lastCapitalSummary.lockAlert) {
      detections.push({
        type: 'CAPITAL_LOCK',
        severity: 'WARNING',
        opportunityEntropy: this.lastCapitalSummary.opportunityEntropy,
        recommendation: 'Capital is stagnant (retention 1.0) despite high opportunity entropy. Governance may be overly restrictive.'
      });
    }

    // 10. Capital Churn Detector (Problem 1)
    if (this.lastCapitalSummary && this.lastCapitalSummary.churnAlert) {
      detections.push({
        type: 'CAPITAL_CHURN',
        severity: 'CRITICAL',
        feeBleedVelocity: this.lastCapitalSummary.feeBleedVelocity,
        recommendation: 'High fee bleed velocity detected. Capital is being churned ineffectively. Halt automatic rotations.'
      });
    }
    
    // 1. Dominance Drift Detector
    const dominance = this._checkDominanceDrift();
    if (dominance.isDrifting) {
      detections.push({
        type: 'DOMINANCE_DRIFT',
        layer: dominance.dominantLayer,
        dominanceRatio: dominance.ratio,
        severity: dominance.ratio > 0.8 ? 'CRITICAL' : 'WARNING'
      });
    }

    // 2. Oscillation Resonance Detector
    const resonance = this._checkOscillationResonance();
    if (resonance.score > 0.4) {
      detections.push({
        type: 'OSCILLATION_RESONANCE',
        resonanceScore: resonance.score,
        severity: resonance.score > 0.6 ? 'CRITICAL' : 'WARNING'
      });
    }

    // 3. False Consensus Detector
    const falseConsensus = this._checkFalseConsensus();
    if (falseConsensus.detected) {
      detections.push({
        type: 'FALSE_CONSENSUS',
        averageConfidence: falseConsensus.avgConfidence,
        severity: 'WARNING'
      });
    }

    // 4. Exploration-Stability Balance Tracker
    const balance = this._checkExplorationBalance();
    if (balance.ratio < 0.15) {
      detections.push({
        type: 'EXPLORATION_DEFICIT',
        ratio: balance.ratio,
        severity: balance.ratio < 0.05 ? 'CRITICAL' : 'WARNING'
      });
    } else if (balance.ratio > 0.40) {
      detections.push({
        type: 'STABILITY_DEFICIT',
        ratio: balance.ratio,
        severity: balance.ratio > 0.6 ? 'CRITICAL' : 'WARNING'
      });
    }

    // 5. Reality Coherence Trend
    const reality = this._checkRealityCoherence();
    if (reality.trend === 'DEGRADING') {
      detections.push({
        type: 'REALITY_COHERENCE_DEGRADING',
        movingAverage: reality.rdiAvg,
        severity: reality.rdiAvg > 0.25 ? 'CRITICAL' : 'WARNING'
      });
    } else if (reality.falseStability) {
      detections.push({
        type: 'FALSE_EPISTEMIC_STABILITY',
        severity: 'WARNING'
      });
    }

    // 6. Null State Lock (Derived from "Null State Sampling")
    const nullState = this._checkNullStateLock();
    if (nullState.isLocked) {
      detections.push({
        type: 'NULL_STATE_LOCK',
        nullRatio: nullState.ratio,
        severity: 'WARNING'
      });
    }

    // 7. Observer Influence Detector (Reverse Goodhart Effect)
    const observerInfluence = this._checkObserverInfluence();
    if (observerInfluence.detected) {
      detections.push({
        type: 'OBSERVER_INFLUENCE_DETECTED',
        behaviorShift: observerInfluence.shiftMetrics,
        severity: 'CRITICAL',
        recommendation: "System is optimizing to 'look healthy' while observed. Observer effects are distorting natural behavior."
      });
    }

    const maxSeverity = detections.reduce((max, d) => {
      if (d.severity === 'CRITICAL') return 'CRITICAL';
      if (d.severity === 'WARNING' && max !== 'CRITICAL') return 'WARNING';
      return max;
    }, 'HEALTHY');

    const systemState = maxSeverity === 'CRITICAL' ? 'PATHOLOGICAL' : (maxSeverity === 'WARNING' ? 'STRESSED' : 'HEALTHY');

    return {
      systemState,
      detections,
      balance: {
        explorationRatio: balance.ratio,
        dominanceProfile: dominance.profile,
        realityCoherenceTrend: reality.trend,
        rdiMovingAverage: reality.rdiAvg
      },
      snapshotCount: this.snapshots.length,
      windowSize: this.windowSize,
      lastCapitalSummary: this.lastCapitalSummary
    };
  }

  // --- Detector Implementations ---

  _checkDominanceDrift() {
    const counts = { kernel: 0, epe: 0, gal: 0, cfr: 0, rsis: 0, rdm: 0, stl: 0 };
    let valid = 0;
    
    for (const snap of this.snapshots) {
      if (!snap.layers) continue;
      valid++;
      // Determine which engine "dominated" this evaluation cycle based on signal severity
      let dominant = 'kernel'; 
      if (snap.layers.stl?.signal !== 'NOMINAL' && snap.layers.stl?.signal) dominant = 'stl';
      else if (snap.layers.rdm?.signal === 'DRIFTING' || snap.layers.rdm?.signal === 'DANGER') dominant = 'rdm';
      else if (snap.layers.rsis?.signal === 'SHOCK') dominant = 'rsis';
      else if (snap.layers.epe?.signal === 'go') dominant = 'epe';
      else if (snap.layers.gal?.signal === 'MAINTAIN') dominant = 'gal';
      
      counts[dominant]++;
    }

    if (valid === 0) return { isDrifting: false, profile: {} };

    const profile = {};
    let maxRatio = 0;
    let dominantLayer = null;

    for (const [layer, count] of Object.entries(counts)) {
      const ratio = count / valid;
      profile[layer] = parseFloat(ratio.toFixed(2));
      if (ratio > maxRatio) {
        maxRatio = ratio;
        dominantLayer = layer;
      }
    }

    return {
      isDrifting: maxRatio > 0.6,
      dominantLayer,
      ratio: maxRatio,
      profile
    };
  }

  _checkOscillationResonance() {
    let flips = 0;
    let validTransitions = 0;

    for (let i = 1; i < this.snapshots.length; i++) {
      const prev = this.snapshots[i-1].layers;
      const curr = this.snapshots[i].layers;
      if (!prev || !curr) continue;
      
      validTransitions++;
      let flipCount = 0;
      if (prev.epe?.signal !== curr.epe?.signal) flipCount++;
      if (prev.gal?.signal !== curr.gal?.signal) flipCount++;
      if (prev.cfr?.signal !== curr.cfr?.signal) flipCount++;
      if (prev.rsis?.signal !== curr.rsis?.signal) flipCount++;
      
      if (flipCount >= 2) flips++; // High interaction oscillation
    }

    return {
      score: validTransitions > 0 ? (flips / validTransitions) : 0
    };
  }

  _checkFalseConsensus() {
    let detected = false;
    let sumConf = 0;
    let valid = 0;

    for (const snap of this.snapshots) {
      const k = snap.layers?.kernel;
      if (!k || !k.raw_metrics?.context_confidences) continue;
      
      const confs = Object.values(k.raw_metrics.context_confidences);
      if (confs.length === 0) continue;
      
      valid++;
      const avg = confs.reduce((a, b) => a + b, 0) / confs.length;
      sumConf += avg;
      
      const maxDiff = Math.max(...confs) - Math.min(...confs);
      
      // All contexts agree (low diff) but overall confidence is low
      if (maxDiff < 0.1 && avg < 0.5 && k.signal === 'caution') {
        detected = true;
      }
    }

    return {
      detected,
      avgConfidence: valid > 0 ? (sumConf / valid) : 0
    };
  }

  _checkExplorationBalance() {
    let epeGo = 0;
    let galMaintain = 0;
    
    for (const snap of this.snapshots) {
      if (snap.layers?.epe?.signal === 'go') epeGo++;
      if (snap.layers?.gal?.signal === 'MAINTAIN') galMaintain++;
    }

    const total = epeGo + galMaintain;
    const ratio = total > 0 ? (epeGo / total) : 0.2; // default safe balance

    return { ratio: parseFloat(ratio.toFixed(2)) };
  }

  _checkRealityCoherence() {
    const rdis = this.snapshots
      .map(s => s.layers?.rdm?.raw_metrics?.realityDriftIndex)
      .filter(x => x !== undefined && x !== null);
      
    if (rdis.length < 10) return { trend: 'STABLE', rdiAvg: 0, falseStability: false };

    const mid = Math.floor(rdis.length / 2);
    const firstHalf = rdis.slice(0, mid);
    const secondHalf = rdis.slice(mid);
    
    const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const totalAvg = rdis.reduce((a, b) => a + b, 0) / rdis.length;

    let trend = 'STABLE';
    if (avg2 > avg1 + 0.05) trend = 'DEGRADING';
    else if (avg2 < avg1 - 0.05) trend = 'IMPROVING';

    // False epistemic stability: RDI very low while EPE is highly active
    let falseStability = false;
    if (totalAvg < 0.1) {
      const recentEpeActive = this.snapshots.slice(-10).filter(s => s.layers?.epe?.signal === 'go').length;
      if (recentEpeActive > 5) falseStability = true;
    }

    return { trend, rdiAvg: parseFloat(totalAvg.toFixed(2)), falseStability };
  }
  
  _checkNullStateLock() {
    let nullCount = 0;
    for (const snap of this.snapshots) {
      if (snap.layers?.kernel?.signal === 'caution' || snap.layers?.kernel?.signal === 'no-go') {
        nullCount++;
      }
    }
    const ratio = this.snapshots.length > 0 ? nullCount / this.snapshots.length : 0;
    return {
      isLocked: ratio > 0.9,
      ratio: parseFloat(ratio.toFixed(2))
    };
  }

  _checkObserverInfluence() {
    if (this.observationHistory.observed.length < 10 || this.observationHistory.unobserved.length < 10) {
      return { detected: false };
    }
    
    const getAvgConf = (snaps) => {
      const vals = snaps.map(s => s.layers?.kernel?.confidence).filter(x => x !== undefined);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    
    const getExploreRate = (snaps) => {
      const epeCount = snaps.filter(s => s.layers?.epe?.signal === 'go').length;
      return snaps.length > 0 ? epeCount / snaps.length : 0;
    };

    const confObserved = getAvgConf(this.observationHistory.observed);
    const confUnobserved = getAvgConf(this.observationHistory.unobserved);
    
    const expObserved = getExploreRate(this.observationHistory.observed);
    const expUnobserved = getExploreRate(this.observationHistory.unobserved);
    
    const confDiff = Math.abs(confObserved - confUnobserved);
    const expDiff = Math.abs(expObserved - expUnobserved);
    
    // Flag if average confidence drops/jumps severely when observed, or exploration halts when observed
    const isGoodharting = confDiff > 15 || expDiff > 0.20;
    
    return {
      detected: isGoodharting,
      shiftMetrics: {
        confidenceDiff: parseFloat(confDiff.toFixed(2)),
        explorationDiff: parseFloat(expDiff.toFixed(2)),
        observedConf: parseFloat(confObserved.toFixed(2)),
        unobservedConf: parseFloat(confUnobserved.toFixed(2))
      }
    };
  }
}
 