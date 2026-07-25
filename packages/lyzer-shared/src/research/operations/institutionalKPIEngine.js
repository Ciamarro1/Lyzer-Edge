import { DataLineageEngine } from './dataLineageEngine.js';

/**
 * L14 Institutional KPI Engine (Regra 4)
 * Proibido usar retorno absoluto como métrica principal de aprovação.
 * Toda avaliação prioriza:
 * - Sharpe ajustado e Sortino
 * - Calmar Ratio (Retorno Anual / Max Drawdown)
 * - Max Drawdown e Recovery Time (tempo para recuperar topo patrimonial)
 * - Tail Risk (VaR 99% e Expected Shortfall)
 * - Reality Gap e Consistência por regime
 * 
 * Interliga com DataLineageEngine (Regra 3) para assinar origem de cada KPI.
 */

export class InstitutionalKPIEngine {
  constructor() {
    this.lineage = new DataLineageEngine();
  }

  calculateInstitutionalKPIs(blindTradeRecords, initialCapital = 1000000, riskFreeRateAnnual = 0.05) {
    console.log(`[KPI ENGINE] Computing Survival and Risk-Adjusted KPIs on ${blindTradeRecords.length} records...`);

    if (!blindTradeRecords || blindTradeRecords.length === 0) {
      return { status: 'ABORTED', reason: 'No records to compute KPIs' };
    }

    const returnsBrl = blindTradeRecords.map(t => t.resultPnlBrl);
    const totalPnl = returnsBrl.reduce((a, b) => a + b, 0);
    const meanPnl = totalPnl / returnsBrl.length;

    // Daily returns assumption (approx 2 trades/day)
    const dailyReturnsPerc = [];
    for (let i = 0; i < returnsBrl.length; i += 2) {
      const dayPnl = returnsBrl[i] + (returnsBrl[i+1] || 0);
      dailyReturnsPerc.push((dayPnl / initialCapital) * 100);
    }

    const meanDailyReturn = dailyReturnsPerc.reduce((a, b) => a + b, 0) / dailyReturnsPerc.length;
    const stdDailyReturn = Math.sqrt(dailyReturnsPerc.reduce((a, b) => a + Math.pow(b - meanDailyReturn, 2), 0) / dailyReturnsPerc.length);

    // Annualized Sharpe Ratio (assuming 365 trading days for crypto)
    const annualReturnPerc = meanDailyReturn * 365;
    const annualStdDev = stdDailyReturn * Math.sqrt(365);
    const sharpeRatio = annualStdDev === 0 ? 0 : (annualReturnPerc - (riskFreeRateAnnual * 100)) / annualStdDev;

    // Sortino Ratio (downside deviation only)
    const negativeReturns = dailyReturnsPerc.filter(r => r < 0);
    const downsideStdDev = Math.sqrt(negativeReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / (negativeReturns.length || 1)) * Math.sqrt(365);
    const sortinoRatio = downsideStdDev === 0 ? 0 : (annualReturnPerc - (riskFreeRateAnnual * 100)) / downsideStdDev;

    // Max Drawdown & Recovery Time
    let currentNav = initialCapital;
    let peakNav = initialCapital;
    let maxDrawdownBrl = 0;
    let maxDrawdownPerc = 0;
    let currentDrawdownDays = 0;
    let maxRecoveryDays = 0;

    for (let i = 0; i < dailyReturnsPerc.length; i++) {
      currentNav = currentNav * (1 + dailyReturnsPerc[i] / 100);
      if (currentNav >= peakNav) {
        peakNav = currentNav;
        if (currentDrawdownDays > maxRecoveryDays) maxRecoveryDays = currentDrawdownDays;
        currentDrawdownDays = 0;
      } else {
        currentDrawdownDays++;
        const dd = peakNav - currentNav;
        const ddPerc = (dd / peakNav) * 100;
        if (dd > maxDrawdownBrl) maxDrawdownBrl = dd;
        if (ddPerc > maxDrawdownPerc) maxDrawdownPerc = ddPerc;
      }
    }

    // Calmar Ratio
    const calmarRatio = maxDrawdownPerc === 0 ? 0 : annualReturnPerc / maxDrawdownPerc;

    // Tail Risk (99% VaR daily)
    const sortedDaily = [...dailyReturnsPerc].sort((a, b) => a - b);
    const var99Index = Math.floor(sortedDaily.length * 0.01);
    const var99Perc = Math.abs(sortedDaily[var99Index] || 0);

    // Alpha Decay Assessment
    const firstHalfPnl = returnsBrl.slice(0, Math.floor(returnsBrl.length / 2)).reduce((a,b)=>a+b,0);
    const secondHalfPnl = returnsBrl.slice(Math.floor(returnsBrl.length / 2)).reduce((a,b)=>a+b,0);
    const alphaDecayRate = firstHalfPnl === 0 ? 0 : ((firstHalfPnl - secondHalfPnl) / Math.abs(firstHalfPnl)) * 100;

    // Lineage Registration (Regra 3)
    this.lineage.recordMetricLineage('KPI_Sharpe_Annual', sharpeRatio.toFixed(2), 'Blind Shadow Returns', 'InstitutionalKPIEngine', 'Annualized Return vs RiskFree / StdDev');
    this.lineage.recordMetricLineage('KPI_Sortino_Annual', sortinoRatio.toFixed(2), 'Blind Shadow Returns', 'InstitutionalKPIEngine', 'Downside Deviation Adjusted Return');
    this.lineage.recordMetricLineage('KPI_Calmar_Ratio', calmarRatio.toFixed(2), 'Blind Shadow Returns', 'InstitutionalKPIEngine', 'Annual Return / Max Drawdown Perc');
    this.lineage.recordMetricLineage('KPI_Max_Drawdown_Perc', maxDrawdownPerc.toFixed(2), 'Blind Shadow Returns', 'InstitutionalKPIEngine', 'Peak to Trough %');
    this.lineage.recordMetricLineage('KPI_Max_Recovery_Days', maxRecoveryDays.toString(), 'Blind Shadow Returns', 'InstitutionalKPIEngine', 'Longest Drawdown Duration in Days');
    this.lineage.recordMetricLineage('KPI_VaR_99_Daily', var99Perc.toFixed(2), 'Blind Shadow Returns', 'InstitutionalKPIEngine', '1st Percentile Daily Loss %');
    this.lineage.recordMetricLineage('KPI_Alpha_Decay_Perc', alphaDecayRate.toFixed(1), 'Blind Shadow Returns', 'InstitutionalKPIEngine', 'H1 PnL vs H2 PnL Degradation');

    const isInstitutionalGrade = sharpeRatio >= 1.0 && maxDrawdownPerc < 10.0 && maxRecoveryDays <= 45;

    return {
      status: 'COMPLETED',
      institutionalGrade: isInstitutionalGrade,
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
      calmarRatio: parseFloat(calmarRatio.toFixed(2)),
      maxDrawdownPerc: parseFloat(maxDrawdownPerc.toFixed(2)),
      maxRecoveryDays,
      var99Perc: parseFloat(var99Perc.toFixed(2)),
      alphaDecayRate: parseFloat(alphaDecayRate.toFixed(1)),
      summary: `Sharpe: ${sharpeRatio.toFixed(2)} | Sortino: ${sortinoRatio.toFixed(2)} | Calmar: ${calmarRatio.toFixed(2)} | Max DD: ${maxDrawdownPerc.toFixed(2)}% | Recovery: ${maxRecoveryDays}d | VaR 99%: ${var99Perc.toFixed(2)}%`
    };
  }
}
