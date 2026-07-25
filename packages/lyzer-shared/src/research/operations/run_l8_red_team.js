import { CapitalGovernor } from '../execution/capitalGovernor.js';
import { LiquiditySurvivalEngine } from '../execution/liquiditySurvivalEngine.js';
import { MonteCarloExecutionWar } from './monteCarloExecutionWar.js';
import { InstitutionalRealityScore } from './institutionalRealityScore.js';

async function runL8RedTeam() {
  console.log("==================================================");
  console.log("🛡️ L8 NUCLEAR RED TEAM: INSTITUTIONAL SURVIVAL");
  console.log("==================================================\n");

  const governor = new CapitalGovernor();
  const liquidityEngine = new LiquiditySurvivalEngine();
  const warEngine = new MonteCarloExecutionWar(governor, liquidityEngine);
  const irsEngine = new InstitutionalRealityScore();

  console.log("[STAGE 1] Monte Carlo Execution War (Infrasctructure Attacks)");
  const warResults = warEngine.runAdversarialScenarios();
  
  let survived = true;
  for (const res of warResults) {
    console.log(`- Scenario [${res.scenario}]: System Decision -> ${res.system_response}`);
    if (res.system_response === "TRADE" && res.scenario !== "Normal") {
      // Se operou no caos, o escudo quebrou
      console.log(`  [FATAL] System traded during catastrophic conditions (${res.scenario}).`);
      survived = false;
    }
  }

  console.log("\n[STAGE 2] Capital Governor Stress (Loss Velocity & Recovery)");
  // Simular uma sequência brutal de perdas rápidas para testar o Anti-Martingale
  const catastrophicTrades = [
    { pnl: -0.015 }, // -1.5%
    { pnl: -0.010 }, // -1.0%
    { pnl: -0.012 }  // -1.2%
  ];
  
  // Total Loss = -3.7% (> Daily Budget 3%)
  const decision = governor.allocateRisk({
    lssScore: 90,
    alphaDecayPercent: 5,
    regimeProbability: 0.8,
    currentDrawdown: 4,
    liquidityScore: 0.9,
    realityGap: 2,
    dailyLossRealized: -0.037,
    recentTrades: catastrophicTrades
  });

  console.log(`- Governor Allocation post-catastrophe: ${decision.allocation} (State: ${decision.risk_state})`);
  if (decision.allocation > 0 || decision.risk_state !== "VETO_DAILY_BUDGET_EXCEEDED") {
    console.log(`  [FATAL] Governor failed to freeze capital after Daily Budget breach.`);
    survived = false;
  }

  console.log("\n[STAGE 3] Institutional Reality Score (IRS) Degradation");
  const irsResult = irsEngine.calculateIRS({
    alphaSurvivalScore: 10,
    executionQuality: 5, // Terrível
    liquidityHealth: 15,
    regimeAccuracy: 10,
    operationalRiskPenalty: 30 // Risco imenso
  });

  console.log(`- IRS Score: ${irsResult.score} (State: ${irsResult.state})`);
  if (irsResult.state !== "HALT") {
    console.log(`  [FATAL] System allowed shadow/live operation with degraded IRS.`);
    survived = false;
  }

  console.log("\n==================================================");
  if (survived) {
    console.log("✅ L8 RED TEAM PASS: Architecture preserved capital under extreme distress.");
  } else {
    console.log("❌ L8 RED TEAM FAIL: Catastrophic capital loss potential detected.");
    process.exit(1);
  }
}

runL8RedTeam();
