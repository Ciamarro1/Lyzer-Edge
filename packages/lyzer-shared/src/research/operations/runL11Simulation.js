import { FundAccountingEngine } from './fundAccountingEngine.js';
import { InstitutionalRealityEngine } from './institutionalRealityEngine.js';
import { ContinuousAlphaAuditor } from './continuousAlphaAuditor.js';
import { CapitalAllocationGovernor } from '../governance/capitalAllocationGovernor.js';
import { InvestmentCommitteeEngine } from '../governance/investmentCommitteeEngine.js';
import { DecisionLedger } from '../governance/decisionLedger.js';

// Setup de ambiente simulado
process.env.SIMULATION_MODE = 'true';

const DAYS = 180;
const TRADES_PER_DAY = 10;
const INITIAL_AUM = 1000000;

console.log(`\n=== INITIATING L11 INSTITUTIONAL SHADOW FUND SIMULATION (${DAYS} DAYS) ===\n`);

const accounting = new FundAccountingEngine(INITIAL_AUM);
const reality = new InstitutionalRealityEngine();
const alphaAuditor = new ContinuousAlphaAuditor(1.5, 0.45);
const ledger = new DecisionLedger();
const governor = new CapitalAllocationGovernor({}, false); // Audit mode false to actually halt in simulation
const committee = new InvestmentCommitteeEngine();

let currentScenario = 'A'; // Normal
let haltCount = 0;
let falsePositives = 0; // Se haltou num cenário normal (A)

for (let day = 1; day <= DAYS; day++) {
  // Alteração de regime
  if (day === 30) currentScenario = 'B'; // Spread Dobrado
  if (day === 60) currentScenario = 'C'; // Liquidez Seca
  if (day === 90) currentScenario = 'D'; // Exchange Instável
  if (day === 120) currentScenario = 'E'; // Alpha Decay Lento
  if (day === 150) currentScenario = 'A'; // Recuperação

  let expectedPnL = 0;
  let realizedPnL = 0;
  let simulatedSlippage = 0;
  let simulatedLatency = 0;
  
  // Roda trades no dia
  for (let t = 0; t < TRADES_PER_DAY; t++) {
    const baseWin = Math.random() > 0.5 ? 500 : -200; // Base strategy theoretical
    
    switch (currentScenario) {
      case 'A': // Normal
        simulatedSlippage = Math.random() * 0.0005;
        simulatedLatency = 20 + Math.random() * 30;
        realizedPnL = baseWin - (baseWin * simulatedSlippage);
        break;
      case 'B': // Spread Dobrado
        simulatedSlippage = Math.random() * 0.0020;
        simulatedLatency = 30;
        realizedPnL = baseWin - (baseWin * simulatedSlippage);
        break;
      case 'C': // Liquidez Seca (Pula entradas)
        simulatedSlippage = Math.random() * 0.0050; // Slippage altíssimo
        simulatedLatency = 100;
        realizedPnL = baseWin > 0 ? baseWin * 0.5 : baseWin; // Ganha metade, perde igual
        break;
      case 'D': // Exchange Instável
        simulatedSlippage = Math.random() * 0.0010;
        simulatedLatency = 500; // Latency gigante
        realizedPnL = baseWin;
        break;
      case 'E': // Alpha Decay (O modelo perdeu aderência)
        simulatedSlippage = Math.random() * 0.0005;
        simulatedLatency = 20;
        realizedPnL = baseWin - 300; // Viés negativo forçado
        break;
    }
    
    expectedPnL = baseWin;
    
    // Telemetria (Se o sistema não estiver em HALT)
    if (governor.macroState !== 'HALT') {
       reality.logExecution(simulatedSlippage, simulatedLatency, 1, expectedPnL, realizedPnL);
       alphaAuditor.auditTrade(realizedPnL);
       accounting.logDailyPerformance(realizedPnL, 1.0);
    }
  }
  
  // No fim do dia, a governança checa
  const gapData = reality.calculateRealityGap();
  let classification = null;
  // Fallback auditor classification logic
  if (alphaAuditor.baselineSharpe - 0.5 < 1.0) classification = 'DECAY_WARNING';
  if (gapData.gapScore > 75) classification = 'HALT_RECOMMENDED';
  else classification = 'HEALTHY';
  
  const oldState = governor.macroState;
  governor.evaluateMacroState({ classification: classification === 'DECAY_WARNING' ? 'DECAY_WARNING' : 'HEALTHY'}, gapData.gapScore > 75 ? 'HALT' : 'MAINTAIN');
  
  if (oldState !== governor.macroState) {
    ledger.logDecision('CapitalGovernor', 'RealityGap/AlphaDecay', 'Risk Limits', { gapScore: gapData.gapScore }, governor.macroState);
    if (governor.macroState === 'HALT') {
      haltCount++;
      if (currentScenario === 'A') falsePositives++;
    }
  }
  
  // Reunião semanal do Comitê
  if (day % 7 === 0) {
    committee.conveneCommittee(alphaAuditor, reality, governor, accounting);
  }
  
  // Fechamento mensal
  if (day % 30 === 0) {
    accounting.generateMonthlyReport(day / 30);
    console.log(`[DAY ${day}] Scenario: ${currentScenario} | NAV: R$ ${accounting.currentNAV.toFixed(2)} | MACRO: ${governor.macroState}`);
  }
}

ledger.flushBatch();

console.log("\n=== L11 SIMULATION COMPLETED ===");
console.log(`Final NAV: R$ ${accounting.currentNAV.toFixed(2)}`);
console.log(`Total HALTs triggados: ${haltCount} (Falsos Positivos: ${falsePositives})`);
