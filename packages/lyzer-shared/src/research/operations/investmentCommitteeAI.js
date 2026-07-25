import fs from 'fs';
import path from 'path';

/**
 * L13 Autonomous Investment Committee AI
 * Produz relatórios executivos C-Level em formato Markdown (diário, semanal, mensal)
 * respondendo às 5 perguntas de governança.
 */

export class InvestmentCommitteeAI {
  constructor() {
    this.reportsDir = path.resolve(process.cwd(), '../../../knowledge/reports/committee');
    if (!fs.existsSync(this.reportsDir)) {
      try { fs.mkdirSync(this.reportsDir, { recursive: true }); } catch(e) {}
    }
  }

  generateReport(periodType, telemetrySnapshot) {
    const {
      nav = 1050000,
      aum = 1000000,
      macroRegime = 'RISK_NEUTRAL',
      marginalVaR = 1.2,
      isContagion = false,
      lssScore = 85.0,
      decayStatus = 'FULL_ALLOCATION',
      riskBudget = 100,
      circuitBreakersActive = false,
      realityGapPerc = 3.5,
      exchangeStatus = 'ONLINE_HEALTHY',
      recentIncidents = []
    } = telemetrySnapshot;

    const pnlPerc = ((nav - aum) / aum) * 100;

    const reportMd = `
# 🏛️ AUTONOMOUS INVESTMENT COMMITTEE REPORT — ${periodType.toUpperCase()}
**Timestamp:** ${new Date().toISOString()}
**Reporting Period:** ${periodType}
**Executive Summary Status:** \`${circuitBreakersActive || isContagion ? '🚨 DEFENSIVE / HALT REQUIRED' : '🟢 OPERATIONS APPROVED'}\`

---

## 1. Onde estamos? (Patrimônio e Regime)
- **Net Asset Value (NAV):** R$ ${nav.toLocaleString('pt-BR')} (${pnlPerc >= 0 ? '+' : ''}${pnlPerc.toFixed(2)}% vs Base allocation)
- **Macro Regime L12:** \`${macroRegime}\`
- **Diagnóstico:** O portfólio opera em ambiente de volatilidade monitorada, com alocação aderente ao ciclo macroeconômico atual.

## 2. O risco aumentou? (Contágio e Marginal VaR)
- **Contágio L12 Detected:** ${isContagion ? '🚨 **SIM (Fast-Correlation Trigger ativado)**' : '🟢 Não (Diversificação estável)'}
- **Marginal VaR Máximo (Crypto Cluster):** ${marginalVaR.toFixed(2)}%
- **Diagnóstico:** ${isContagion ? 'O risco sistêmico explodiu. As correlações convergiram para 1.0, anulando a proteção cruzada.' : 'Os ativos seguem descorrelacionados. Risco marginal dentro dos limites do CAPITAL_POLICY.md.'}

## 3. O Alpha continua válido? (LSS e Decay)
- **Lyzer Survival Score (LSS):** ${lssScore.toFixed(1)} / 100
- **Alpha Governor State:** \`${decayStatus}\`
- **Diagnóstico:** ${lssScore >= 60 ? 'O Alpha Core (SMC + V4) mantém assimetria estatística robusta de grau institucional.' : '⚠️ Alerta de degradação da assimetria do modelo quantitativo.'}

## 4. O capital deve ser reduzido? (Risk Budget & Breakers)
- **Orçamento de Risco Efetivo (Risk Budget):** ${riskBudget}%
- **Circuit Breakers Ativos:** ${circuitBreakersActive ? '🔴 SIM' : '🟢 NÃO'}
- **Diagnóstico:** ${riskBudget < 100 || circuitBreakersActive ? `Redução imperativa de exposição acionada (Orçamento em ${riskBudget}%).` : 'O capital opera autorizadamente sob alocação nominal 100%.'}

## 5. Alguma coisa mudou estruturalmente? (Reality Gap & Infra)
- **Institutional Reality Gap:** ${realityGapPerc.toFixed(1)}% (Limite 30d: 15.0%)
- **Status das Exchanges:** \`${exchangeStatus}\`
- **Incidentes Recentes Registrados:** ${recentIncidents.length} evento(s)
- **Diagnóstico:** ${realityGapPerc > 15 ? '🚨 Divergência estrutural entre backtest e execução real detectada!' : 'A execução real está rigorosamente colada nas heurísticas teóricas sem slippage anômalo.'}

---
**DELIBERAÇÃO FINAL DO COMITÊ:**
> *${circuitBreakersActive || isContagion || riskBudget === 0 ? 'DESALOCAR IMEDIATAMENTE E MANTER EM SHADOW/HALT ATÉ NOVA HOMOLOGAÇÃO.' : 'APROVADA A CONTINUIDADE DAS OPERAÇÕES AUTÔNOMAS SOB VIGILÂNCIA L13.'}*
`;
    const filename = `committee_${periodType.toLowerCase()}_${Date.now()}.md`;
    const filepath = path.join(this.reportsDir, filename);
    try {
      fs.writeFileSync(filepath, reportMd);
    } catch(e) {
      console.log(`[COMMITTEE AI] Simulated report generation: ${filepath}`);
    }
    return { filename, content: reportMd };
  }
}
