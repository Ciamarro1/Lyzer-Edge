/**
 * L13 Alpha Health Monitor
 * Monitora a saúde do Alpha Core (SMC + V4 IMCE) via LSS Score e Decay em tempo real.
 */

export class AlphaHealthMonitor {
  constructor() {
    this.status = 'HEALTHY';
    this.minLSS = 60.0; // Institutional Grade minimum
  }

  checkHealth(lssScore = 85.0, decayStatus = 'FULL_ALLOCATION') {
    const issues = [];
    if (lssScore < this.minLSS) {
      issues.push(`LSS Score (${lssScore.toFixed(1)}) dropped below institutional minimum (${this.minLSS})`);
    }
    if (decayStatus === 'DECAY_WARNING' || decayStatus === 'HALT') {
      issues.push(`Alpha decay governor is in state: ${decayStatus}`);
    }

    if (decayStatus === 'HALT' || lssScore < 50.0) {
      this.status = 'CRITICAL_DECAY';
    } else if (issues.length > 0) {
      this.status = 'WARNING';
    } else {
      this.status = 'HEALTHY';
    }

    return {
      component: 'AlphaHealth',
      status: this.status,
      metrics: { lssScore: lssScore, decayStatus: decayStatus },
      issues: issues,
      timestamp: new Date().toISOString()
    };
  }
}
