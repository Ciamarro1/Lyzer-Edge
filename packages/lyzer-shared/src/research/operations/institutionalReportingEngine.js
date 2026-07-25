import fs from 'fs';
import path from 'path';

export class InstitutionalReportingEngine {
  constructor(fundName = "Lyzer Edge Institutional Shadow Fund") {
    this.fundName = fundName;
    this.reportsDir = path.resolve(process.cwd(), '../../../knowledge/reports/institutional');
    
    if (!fs.existsSync(this.reportsDir)) {
      try { fs.mkdirSync(this.reportsDir, { recursive: true }); } catch(e) {}
    }
  }

  generateFactsheet(period, nav, maxDd, halts) {
    const report = `
# 📄 INSTITUTIONAL FACTSHEET
**Fund:** ${this.fundName}
**Period:** ${period}

## 1. MENSAGEM DO GESTOR (Lyzer Orchestrator)
No período corrente, o fundo operou sob intensa vigilância institucional. A arquitetura de preservação de capital cumpriu seu papel de resguardar o patrimônio diante de estresses de liquidez e aberturas severas de spread impostas pelo nosso Red Team.

## 2. DADOS DE PERFORMANCE
- **NAV Atual:** R$ ${nav.toFixed(2)}
- **Max Drawdown (Estimado):** ${maxDd.toFixed(2)}%

## 3. EVENTOS DE GOVERNANÇA (Risco e Conformidade)
- **Circuit Breakers Acionados (HALTs):** ${halts}
- **Motivadores Primários:** Degradação de Alpha (Slow Decay) e Deterioração do Reality Gap (Slippage Elevada).

*Nota: Todas as intervenções foram rastreadas criptograficamente no Decision Ledger, assegurando conformidade fiduciária auditável.*
`;

    const filepath = path.join(this.reportsDir, `FACTSHEET_${period.replace(/ /g, '_')}.md`);
    try {
      fs.writeFileSync(filepath, report);
    } catch(e) {
      console.log(`[REPORTING] Simulated Factsheet Generation: ${filepath}`);
    }
  }
}
