import { CapitalGovernor } from '../execution/capitalGovernor.js';

function runGovernorRedTeam() {
  console.log("==================================================");
  console.log("🛡️ L8.5 CAPITAL GOVERNOR RED TEAM");
  console.log("==================================================\n");

  const governor = new CapitalGovernor();
  
  // Cenário 1: Sequência de Perdas (Loss Velocity)
  const lossTrades = [ { pnl: -0.015 }, { pnl: -0.010 }, { pnl: -0.012 } ];
  const c1 = governor.allocateRisk({
    lssScore: 90, alphaDecayPercent: 5, regimeProbability: 0.8,
    currentDrawdown: 4, liquidityScore: 0.9, realityGap: 2,
    dailyLossRealized: -0.037, recentTrades: lossTrades
  });
  console.log(`Cenário 1 (Sequência de perdas): Expected FREEZE. Result: ${c1.risk_state}`);

  const gov2 = new CapitalGovernor();
  // Cenário 2: Drawdown Acelerado (Anti-Martingale / Recovery)
  const c2 = gov2.allocateRisk({
    lssScore: 90, alphaDecayPercent: 5, regimeProbability: 0.8,
    currentDrawdown: 12, liquidityScore: 0.9, realityGap: 2,
    dailyLossRealized: -0.01, recentTrades: []
  });
  console.log(`Cenário 2 (Drawdown acelerado): Expected RECOVERY_MODE. Result: ${c2.risk_state}`);

  const gov3 = new CapitalGovernor();
  // Cenário 3: Dados Atrasados (Reality Gap Alto)
  const c3 = gov3.allocateRisk({
    lssScore: 90, alphaDecayPercent: 5, regimeProbability: 0.8,
    currentDrawdown: 2, liquidityScore: 0.9, realityGap: 20,
    dailyLossRealized: -0.01, recentTrades: []
  });
  console.log(`Cenário 3 (Dados atrasados / Gap alto): Expected VETO_REALITY_GAP. Result: ${c3.risk_state}`);

  const gov4 = new CapitalGovernor();
  // Cenário 4: Regime Desconhecido (Baixa probabilidade de regime)
  const c4 = gov4.allocateRisk({
    lssScore: 90, alphaDecayPercent: 5, regimeProbability: 0.4,
    currentDrawdown: 2, liquidityScore: 0.9, realityGap: 2,
    dailyLossRealized: -0.01, recentTrades: []
  });
  console.log(`Cenário 4 (Regime desconhecido): Expected CAUTIOUS (REDUCE). Result: ${c4.risk_state}`);

  const gov5 = new CapitalGovernor();
  // Cenário 5: Spread Extremo (Liquidez baixa)
  const c5 = gov5.allocateRisk({
    lssScore: 90, alphaDecayPercent: 5, regimeProbability: 0.8,
    currentDrawdown: 2, liquidityScore: 0.3, realityGap: 2,
    dailyLossRealized: -0.01, recentTrades: []
  });
  console.log(`Cenário 5 (Spread extremo / Sem liquidez): Expected VETO_ILLIQUID. Result: ${c5.risk_state}`);
}

runGovernorRedTeam();
