/**
 * L13 Execution Health Monitor
 * Monitora slippage, spread anormal e divergência institucional (Reality Gap).
 */

export class ExecutionHealthMonitor {
  constructor() {
    this.status = 'HEALTHY';
    this.maxSpreadPerc = 0.05; // 0.05% tolerance in Alpha Freeze
    this.maxRealityGapPerc = 15.0; // 15% PnL gap in 30d window
  }

  checkHealth(currentSpreadPerc = 0.02, realityGapPerc = 4.5) {
    const issues = [];
    if (currentSpreadPerc > this.maxSpreadPerc) {
      issues.push(`Current exchange spread (${currentSpreadPerc.toFixed(3)}%) exceeds max allowed (${this.maxSpreadPerc}%)`);
    }
    if (realityGapPerc > this.maxRealityGapPerc) {
      issues.push(`Institutional Reality Gap (${realityGapPerc.toFixed(1)}%) breached 30-day limit (${this.maxRealityGapPerc}%)`);
    }

    if (realityGapPerc > this.maxRealityGapPerc) {
      this.status = 'STRUCTURAL_DIVERGENCE';
    } else if (currentSpreadPerc > this.maxSpreadPerc) {
      this.status = 'HIGH_SPREAD';
    } else {
      this.status = 'HEALTHY';
    }

    return {
      component: 'ExecutionHealth',
      status: this.status,
      metrics: { spreadPerc: currentSpreadPerc, realityGapPerc: realityGapPerc },
      issues: issues,
      timestamp: new Date().toISOString()
    };
  }
}
