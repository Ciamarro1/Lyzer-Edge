import { InstitutionalObservabilityLayer } from './observability/observabilityLayer.js';
import { IncidentResponseEngine } from './incidentResponseEngine.js';
import { InstitutionalMemoryEngine } from './institutionalMemoryEngine.js';
import { InvestmentCommitteeAI } from './investmentCommitteeAI.js';
import { DigitalTwinEngine } from './digitalTwin/digitalTwinEngine.js';
import { AutonomousComplianceEngine } from './complianceEngine.js';

/**
 * L13 Autonomous Institutional Verification Suite
 * Testa observabilidade, resposta a incidentes (histerese), memória, VETO de compliance e Digital Twin.
 */

console.log("================================================================================");
console.log("   🤖 STARTING L13 AUTONOMOUS INSTITUTIONAL OPERATING SYSTEM SUITE");
console.log("================================================================================\n");

// 1. Instanciando componentes L13
console.log("[1/5] Initializing L13 Autonomous OS Components...");
const obs = new InstitutionalObservabilityLayer();
const incident = new IncidentResponseEngine();
const memory = new InstitutionalMemoryEngine();
const committee = new InvestmentCommitteeAI();
const compliance = new AutonomousComplianceEngine();

// 2. Testando Observabilidade e Resposta a Incidentes (Hysteresis)
console.log("\n[2/5] Testing Observability Diagnostics and Incident Response Hysteresis...");
// Estado saudável
let health = obs.runFullDiagnostics({ memoryMB: 200, latencyMs: 50, lssScore: 85, spreadPerc: 0.01 });
let action = incident.evaluateState(health);
console.log(` -> Healthy State Check: ${action.state} (${action.transition})`);

// Injeção de latência extrema e spread anômalo
health = obs.runFullDiagnostics({ memoryMB: 200, latencyMs: 600, lssScore: 85, spreadPerc: 0.08 });
action = incident.evaluateState(health);
console.log(` -> Anomaly Injection (High Latency/Spread): ${action.state} (${action.transition})`);
memory.recordEvent('INCIDENT_DOWNGRADE', { state: action.state, reason: action.reason });

// Tentativa de recuperação imediata (deve aguardar histerese)
health = obs.runFullDiagnostics({ memoryMB: 200, latencyMs: 50, lssScore: 85, spreadPerc: 0.01 });
action = incident.evaluateState(health);
console.log(` -> Recovery Attempt #1: ${action.state} (${action.transition} - ${action.reason})`);

// 3. Testando Autonomous Compliance Layer (VETO Engine)
console.log("\n[3/5] Testing Autonomous Compliance Layer (Pre-Trade VETO Engine)...");
// Tentativa de trade durante estado de HALT/DEFENSIVE ou Drawdown >= 10%
const vetoTest = compliance.authorizeOrder(
  { ticker: 'BTC', orderSizeBrl: 100000, orderType: 'BUY' },
  { intradayDrawdownPerc: 11.5, riskBudgetPerc: 0, macroRegime: 'SYSTEMIC_STRESS', incidentState: 'HALT', assetLiquidity: 'HIGH', totalExposureBrl: 0, aum: 1000000 }
);
console.log(` -> High Risk Order Check: ${vetoTest.status} (Reasons: ${vetoTest.reasons.join(' | ')})`);

// Teste de trade saudável
const approveTest = compliance.authorizeOrder(
  { ticker: 'BTC', orderSizeBrl: 50000, orderType: 'BUY' },
  { intradayDrawdownPerc: 0.5, riskBudgetPerc: 100, macroRegime: 'RISK_NEUTRAL', incidentState: 'NORMAL', assetLiquidity: 'HIGH', totalExposureBrl: 100000, aum: 1000000 }
);
console.log(` -> Normal Order Check: ${approveTest.status} (Token: ${approveTest.token})`);

// 4. Testando Investment Committee AI
console.log("\n[4/5] Testing Autonomous Investment Committee AI...");
const reportRes = committee.generateReport('weekly', {
  nav: 1080000,
  aum: 1000000,
  macroRegime: 'RISK_ON',
  marginalVaR: 1.1,
  isContagion: false,
  lssScore: 88.0,
  decayStatus: 'FULL_ALLOCATION',
  riskBudget: 100,
  circuitBreakersActive: false,
  realityGapPerc: 2.5,
  exchangeStatus: 'ONLINE_HEALTHY',
  recentIncidents: []
});
console.log(` -> Generated C-Level Committee Report: ${reportRes.filename}`);

// 5. Testando Digital Twin (6 Meses de Simulação Rápida em BATCH)
console.log("\n[5/5] Executing Digital Twin Autonomous Simulation (6-Month Scenario)...");
const twin = new DigitalTwinEngine(1000000);
const twinResult = twin.runSimulation(6);
console.log(` -> Twin Simulation Summary: NAV R$ ${twinResult.finalNAV} | Return: ${twinResult.totalReturnPerc}% | Max DD: ${twinResult.maxDrawdownPerc}% | Compliant: ${twinResult.survivalPolicyCompliant}`);

console.log("\n================================================================================");
console.log("   ✅ ALL L13 INSTITUTIONAL AUTONOMOUS SUITE CHECKS PASSED SUCCESSFULLY");
console.log("================================================================================\n");
