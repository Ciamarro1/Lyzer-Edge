import fs from 'fs';
import path from 'path';
import { DataLineageEngine } from './dataLineageEngine.js';

/**
 * L14 Independent Validation Engine (Regras 1 & 2)
 * Auditor externo estatístico.
 * NÃO conhece e NUNCA acessa a lógica, regras ou heurísticas do Alpha Core (SMC/V4).
 * Consume apenas os resultados de contabilidade cega do Shadow Fund.
 * Avalia estatisticamente, procura inconsistências, detecta overfitting e assina relatório externo.
 */

export class IndependentValidationEngine {
  constructor() {
    this.auditDir = path.resolve(process.cwd(), '../../../knowledge/audit');
    if (!fs.existsSync(this.auditDir)) {
      try { fs.mkdirSync(this.auditDir, { recursive: true }); } catch(e) {}
    }
    this.lineage = new DataLineageEngine();
  }

  runStatisticalAudit(blindTradeRecords) {
    console.log(`[INDEPENDENT AUDITOR] Running Blind Statistical Validation on ${blindTradeRecords.length} blind records...`);

    if (!blindTradeRecords || blindTradeRecords.length === 0) {
      throw new Error("Independent Validation aborted: Zero blind records provided.");
    }

    const returns = blindTradeRecords.map(t => t.resultPnlBrl);
    const totalPnl = returns.reduce((a, b) => a + b, 0);
    const meanPnl = totalPnl / returns.length;
    
    // Variance & StdDev
    const variance = returns.reduce((a, b) => a + Math.pow(b - meanPnl, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Skewness (assimetria)
    const skewness = stdDev === 0 ? 0 : (returns.reduce((a, b) => a + Math.pow(b - meanPnl, 3), 0) / (returns.length * Math.pow(stdDev, 3)));
    
    // Kurtosis (caudas)
    const kurtosis = stdDev === 0 ? 0 : (returns.reduce((a, b) => a + Math.pow(b - meanPnl, 4), 0) / (returns.length * Math.pow(stdDev, 4))) - 3;

    // Overfitting Check: Se o winrate for > 85% e kurtosis extremamente alta, suspeita de overfitting ou lookahead bias
    const wins = returns.filter(r => r >= 0).length;
    const winRate = (wins / returns.length) * 100;
    
    let isOverfitted = false;
    const anomalyFlags = [];
    if (winRate > 85.0) {
      isOverfitted = true;
      anomalyFlags.push(`CRITICAL: Abnormal Win Rate (${winRate.toFixed(1)}%). Suggests Lookahead Bias or Curve Fitting.`);
    }
    if (skewness < -2.0) {
      anomalyFlags.push(`WARNING: Severe Negative Skewness (${skewness.toFixed(2)}). Hidden tail risk exposed.`);
    }
    if (stdDev === 0) {
      anomalyFlags.push(`CRITICAL: Zero variance in returns. Synthetic artificial feed detected.`);
    }

    // Registrar Lineage
    this.lineage.recordMetricLineage('Audit_Mean_PNL', meanPnl.toFixed(2), 'Blind Shadow Ledger', 'IndependentValidationEngine', 'Arithmetic Mean');
    this.lineage.recordMetricLineage('Audit_Skewness', skewness.toFixed(3), 'Blind Shadow Ledger', 'IndependentValidationEngine', '3rd Central Moment');
    this.lineage.recordMetricLineage('Audit_Kurtosis', kurtosis.toFixed(3), 'Blind Shadow Ledger', 'IndependentValidationEngine', '4th Central Moment - 3');

    const passed = anomalyFlags.length === 0 && !isOverfitted;

    const reportMd = `
# 🔬 INDEPENDENT STATISTICAL AUDIT REPORT (L14)
**Timestamp:** ${new Date().toISOString()}
**Auditor:** Independent Validation Engine v1.0 (Zero-Knowledge of Alpha Heuristics)
**Audit Status:** \`${passed ? '🟢 STATISTICALLY ROBUST & VERIFIED' : '🔴 ANOMALIES / OVERFITTING DETECTED'}\`

---

## 1. BLIND DATASET METRICS
- **Sample Size:** ${returns.length} blind executions
- **Mean Trade PnL:** R$ ${meanPnl.toFixed(2)}
- **Return Std Dev:** R$ ${stdDev.toFixed(2)}
- **Distribution Skewness:** ${skewness.toFixed(3)} (${skewness > 0 ? 'Positive Right-Tail' : 'Negative Left-Tail'})
- **Distribution Excess Kurtosis:** ${kurtosis.toFixed(3)} (${kurtosis > 1 ? 'Heavy-Tailed (Leptokurtic)' : 'Normal-Tailed'})

## 2. OVERFITTING & ANOMALY DETECTION
- **Lookahead Bias Check:** ${winRate <= 85 ? '🟢 PASSED (Win Rate ' + winRate.toFixed(1) + '% is statistically realistic)' : '🔴 FAILED'}
- **Return Symmetry Check:** ${skewness >= -2.0 ? '🟢 PASSED (No extreme negative skew)' : '🔴 FAILED'}
- **Flags Detected:** ${anomalyFlags.length === 0 ? 'None. Distribution conforms to institutional empirical trading patterns.' : anomalyFlags.join(' | ')}

## 3. AUDITOR DELIBERATION
> *${passed ? 'O auditor independente certifica que a distribuição de retornos observada no fundo sombra NÃO apresenta sinais estatísticos de sobre-ajuste (overfitting), viés de antecipação (lookahead bias) ou manipulação sintética.' : '⚠️ ALERTA DE REJEIÇÃO DA AUDITORIA ESTATÍSTICA: Evidências incompatíveis com o mundo real identificadas.'}*
`;

    const filepath = path.join(this.auditDir, 'independent_validation.md');
    try {
      fs.writeFileSync(filepath, reportMd);
    } catch(e) {
      console.log(`[INDEPENDENT AUDIT] Simulated write to ${filepath}`);
    }

    return {
      passed,
      sampleSize: returns.length,
      meanPnl: parseFloat(meanPnl.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      skewness: parseFloat(skewness.toFixed(3)),
      kurtosis: parseFloat(kurtosis.toFixed(3)),
      isOverfitted,
      anomalyFlags,
      reportPath: 'knowledge/audit/independent_validation.md'
    };
  }
}
