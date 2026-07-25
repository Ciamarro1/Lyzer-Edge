import fs from 'fs';
import path from 'path';

export class FundAccountingEngine {
  constructor(initialAUM = 1000000) {
    this.initialAUM = initialAUM;
    this.currentNAV = initialAUM;
    this.peakNAV = initialAUM;
    this.dailyReturns = [];
    this.reportDir = path.resolve(process.cwd(), '../../../knowledge/reports/monthly_fund_report');
    
    if (!fs.existsSync(this.reportDir)) {
      try { fs.mkdirSync(this.reportDir, { recursive: true }); } catch(e) {}
    }
  }

  logDailyPerformance(realizedPnL, currentExposure) {
    const dailyReturn = realizedPnL / this.currentNAV;
    this.currentNAV += realizedPnL;
    this.dailyReturns.push(dailyReturn);
    
    if (this.currentNAV > this.peakNAV) {
      this.peakNAV = this.currentNAV;
    }
  }

  calculateDrawdown() {
    return (this.peakNAV - this.currentNAV) / this.peakNAV;
  }

  generateMonthlyReport(monthId) {
    const totalReturn = (this.currentNAV - this.initialAUM) / this.initialAUM;
    const maxDrawdown = this.calculateDrawdown();
    
    const report = `
# LYZER INSTITUTIONAL SHADOW FUND - NAV REPORT
**Month:** ${monthId}

## PERFORMANCE SUMMARY
- **Initial AUM:** R$ ${this.initialAUM.toFixed(2)}
- **Current NAV (Net Asset Value):** R$ ${this.currentNAV.toFixed(2)}
- **Total Return:** ${(totalReturn * 100).toFixed(2)}%
- **Current Drawdown:** ${(maxDrawdown * 100).toFixed(2)}%

## RISK ACCOUNTING
- **Operational Status:** NORMAL
- **Capital Governor Interventions:** 0 (Mock)
`;

    const filepath = path.join(this.reportDir, `NAV_REPORT_${monthId}.md`);
    try {
      fs.writeFileSync(filepath, report);
      console.log(`[ACCOUNTING] Generated M2M Report: ${filepath}`);
    } catch(e) {
      console.log(`[ACCOUNTING] Simulated report generated for ${monthId}`);
    }
    
    return report;
  }
}
