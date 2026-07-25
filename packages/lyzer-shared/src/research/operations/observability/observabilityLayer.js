import fs from 'fs';
import path from 'path';
import { SystemHealthMonitor } from './systemHealthMonitor.js';
import { AlphaHealthMonitor } from './alphaHealthMonitor.js';
import { RiskHealthMonitor } from './riskHealthMonitor.js';
import { ExecutionHealthMonitor } from './executionHealthMonitor.js';
import { DataIntegrityMonitor } from './dataIntegrityMonitor.js';

/**
 * L13 Institutional Observability Layer
 * Agrega os 5 monitores e emite relatórios para knowledge/operations/health/
 */
export class InstitutionalObservabilityLayer {
  constructor() {
    this.system = new SystemHealthMonitor();
    this.alpha = new AlphaHealthMonitor();
    this.risk = new RiskHealthMonitor();
    this.exec = new ExecutionHealthMonitor();
    this.data = new DataIntegrityMonitor();

    this.healthDir = path.resolve(process.cwd(), '../../../knowledge/operations/health');
    if (!fs.existsSync(this.healthDir)) {
      try { fs.mkdirSync(this.healthDir, { recursive: true }); } catch(e) {}
    }
  }

  runFullDiagnostics(inputs = {}) {
    const sysRes = this.system.checkHealth(inputs.memoryMB, inputs.latencyMs);
    const alphaRes = this.alpha.checkHealth(inputs.lssScore, inputs.decayStatus);
    const riskRes = this.risk.checkHealth(inputs.intradayDrawdownPerc, inputs.contagion);
    const execRes = this.exec.checkHealth(inputs.spreadPerc, inputs.realityGapPerc);
    const dataRes = this.data.checkHealth(inputs.dataDelayMs, inputs.isDataCorrupted, inputs.anomalousGap);

    const allReports = [sysRes, alphaRes, riskRes, execRes, dataRes];
    const allIssues = allReports.flatMap(r => r.issues);

    let aggregatedStatus = 'NORMAL';
    if (sysRes.status === 'DEGRADED' || alphaRes.status === 'WARNING' || execRes.status === 'HIGH_SPREAD' || dataRes.status === 'STALE_DATA') {
      aggregatedStatus = 'WARNING';
    }
    if (execRes.status === 'STRUCTURAL_DIVERGENCE' || riskRes.status === 'CAUTIOUS') {
      aggregatedStatus = 'DEFENSIVE';
    }
    if (alphaRes.status === 'CRITICAL_DECAY') {
      aggregatedStatus = 'SHADOW_ONLY';
    }
    if (riskRes.status === 'CIRCUIT_BREAKER' || dataRes.status === 'CORRUPTED_FEED') {
      aggregatedStatus = 'HALT';
    }

    const snapshot = {
      aggregatedStatus,
      timestamp: new Date().toISOString(),
      monitors: {
        system: sysRes,
        alpha: alphaRes,
        risk: riskRes,
        execution: execRes,
        data: dataRes
      },
      totalIssues: allIssues.length,
      issues: allIssues
    };

    this.emitHealthReport(snapshot);
    return snapshot;
  }

  emitHealthReport(snapshot) {
    const reportMd = `
# 🏥 INSTITUTIONAL SYSTEM HEALTH REPORT (L13)
**Timestamp:** ${snapshot.timestamp}
**Aggregated System State:** \`${snapshot.aggregatedStatus}\`
**Total Issues Detected:** ${snapshot.totalIssues}

## 1. COMPONENT HEALTH MATRIX
| Component | Status | Key Metrics | Issues |
|---|---|---|---|
| **System Health** | \`${snapshot.monitors.system.status}\` | Memory: ${snapshot.monitors.system.metrics.memoryMB}MB, Latency: ${snapshot.monitors.system.metrics.latencyMs}ms | ${snapshot.monitors.system.issues.length} |
| **Alpha Health** | \`${snapshot.monitors.alpha.status}\` | LSS: ${snapshot.monitors.alpha.metrics.lssScore}, Decay: ${snapshot.monitors.alpha.metrics.decayStatus} | ${snapshot.monitors.alpha.issues.length} |
| **Risk Health** | \`${snapshot.monitors.risk.status}\` | Intraday DD: ${snapshot.monitors.risk.metrics.intradayDrawdownPerc}%, Contagion: ${snapshot.monitors.risk.metrics.contagion} | ${snapshot.monitors.risk.issues.length} |
| **Execution Health** | \`${snapshot.monitors.execution.status}\` | Spread: ${snapshot.monitors.execution.metrics.spreadPerc}%, Reality Gap: ${snapshot.monitors.execution.metrics.realityGapPerc}% | ${snapshot.monitors.execution.issues.length} |
| **Data Integrity** | \`${snapshot.monitors.data.status}\` | Delay: ${snapshot.monitors.data.metrics.delayMs}ms, Corrupted: ${snapshot.monitors.data.metrics.corrupted} | ${snapshot.monitors.data.issues.length} |

## 2. DETECTED ISSUES & ALERTS
${snapshot.issues.length === 0 ? '- ✅ All institutional health indicators are green.' : snapshot.issues.map(i => `- ⚠️ ${i}`).join('\n')}
`;
    const filepath = path.join(this.healthDir, 'system_health_report.md');
    try {
      fs.writeFileSync(filepath, reportMd);
    } catch(e) {
      console.log(`[OBSERVABILITY] Simulated emit to ${filepath}`);
    }
  }
}
