/**
 * MGO Capture Detector (Release 1.7.6)
 *
 * Meta-Governance Observatory (MGO) module.
 * Monitors for Layer Dominance causing governance paralysis (Governance Capture Trap).
 * Designed to accept state data from Attack 6.
 */

class MgoCaptureDetector {
  /**
   * Evaluates state data for Governance Capture.
   * @param {Object} stateData - The state data from Attack 6.
   * Expected format: { recentBlocks: [{ layer: 'IWL', capital: ... }, ...] }
   * @returns {Object} Alert object
   */
  static analyze(stateData) {
    const defaultAlert = {
      threat_type: 'CAPTURE',
      confidence: 0,
      severity: 'NONE',
      evidence: [],
      projected_cost: 0,
      projected_survival_impact: 'NONE'
    };

    if (!stateData || !Array.isArray(stateData.recentBlocks)) {
      return { ...defaultAlert, evidence: ['Invalid state data: recentBlocks array missing'] };
    }

    const blocks = stateData.recentBlocks;
    const totalBlocks = blocks.length;

    if (totalBlocks === 0) {
      return { ...defaultAlert, evidence: ['Insufficient data: 0 blocks analyzed'] };
    }

    // Tally layers responsible for successive capital blocks
    const layerTally = {};
    let consecutiveBlocks = 0;
    let lastLayer = null;
    let maxConsecutive = 0;

    for (const block of blocks) {
      const layer = block.layer || 'UNKNOWN';
      layerTally[layer] = (layerTally[layer] || 0) + 1;
      
      if (layer === lastLayer) {
        consecutiveBlocks++;
      } else {
        consecutiveBlocks = 1;
        lastLayer = layer;
      }
      
      if (consecutiveBlocks > maxConsecutive) {
        maxConsecutive = consecutiveBlocks;
      }
    }

    // Find the most dominant layer
    let dominantLayer = null;
    let dominantCount = 0;

    for (const [layer, count] of Object.entries(layerTally)) {
      if (count > dominantCount) {
        dominantCount = count;
        dominantLayer = layer;
      }
    }

    const dominanceRatio = dominantCount / totalBlocks;
    let confidence = 0;
    let severity = 'NONE';
    let projected_cost = 0;
    let projected_survival_impact = 'NONE';
    const evidence = [];

    // Capture condition: A single layer dominates > 80% or has long successive chains
    if (dominanceRatio >= 0.8 || maxConsecutive >= 10) {
      confidence = Math.min(0.99, dominanceRatio + (maxConsecutive / totalBlocks) * 0.1);
      severity = dominanceRatio >= 0.9 ? 'CRITICAL' : 'HIGH';
      
      evidence.push(`Governance Capture Detected: Layer '${dominantLayer}' controls ${(dominanceRatio * 100).toFixed(1)}% of recent capital blocks.`);
      if (maxConsecutive >= 10) {
        evidence.push(`Successive paralysis: ${maxConsecutive} consecutive blocks controlled by '${dominantLayer}'.`);
      }
      
      projected_cost = dominantCount * 50000; // Projected cost in arbitrary units based on seized blocks
      projected_survival_impact = severity === 'CRITICAL' ? 'SEVERE' : 'HIGH';
      
    } else if (dominanceRatio >= 0.6) {
      confidence = dominanceRatio;
      severity = 'MEDIUM';
      evidence.push(`Warning: Layer '${dominantLayer}' is showing signs of dominance (${(dominanceRatio * 100).toFixed(1)}%).`);
      projected_cost = dominantCount * 10000;
      projected_survival_impact = 'MODERATE';
      
    } else {
      confidence = 0.1;
      severity = 'LOW';
      evidence.push('Governance power is distributed normally across layers.');
    }

    return {
      threat_type: 'CAPTURE',
      confidence: parseFloat(confidence.toFixed(4)),
      severity,
      evidence,
      projected_cost,
      projected_survival_impact
    };
  }
}

module.exports = MgoCaptureDetector;
