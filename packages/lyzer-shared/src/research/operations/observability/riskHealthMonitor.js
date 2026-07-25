/**
 * L13 Risk Health Monitor
 * Monitora Drawdown intradiário, limites de capital e alertas de contágio L12.
 */

export class RiskHealthMonitor {
  constructor() {
    this.status = 'HEALTHY';
    this.softStopDD = 5.0; // 5% cautious
    this.hardStopDD = 10.0; // 10% circuit breaker
  }

  checkHealth(intradayDrawdownPerc = 1.2, isContagionDetected = false) {
    const issues = [];
    if (intradayDrawdownPerc >= this.hardStopDD) {
      issues.push(`Intraday Drawdown (${intradayDrawdownPerc.toFixed(2)}%) breached Hard Stop (${this.hardStopDD}%)`);
    } else if (intradayDrawdownPerc >= this.softStopDD) {
      issues.push(`Intraday Drawdown (${intradayDrawdownPerc.toFixed(2)}%) breached Soft Stop (${this.softStopDD}%)`);
    }

    if (isContagionDetected) {
      issues.push(`L12 Fast-Correlation Trigger detected systemic contagion`);
    }

    if (intradayDrawdownPerc >= this.hardStopDD || isContagionDetected) {
      this.status = 'CIRCUIT_BREAKER';
    } else if (intradayDrawdownPerc >= this.softStopDD) {
      this.status = 'CAUTIOUS';
    } else {
      this.status = 'HEALTHY';
    }

    return {
      component: 'RiskHealth',
      status: this.status,
      metrics: { intradayDrawdownPerc: intradayDrawdownPerc, contagion: isContagionDetected },
      issues: issues,
      timestamp: new Date().toISOString()
    };
  }
}
