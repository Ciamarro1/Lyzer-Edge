import { ShadowFundEngine } from './shadowFundEngine.js';
import { IndependentValidationEngine } from './independentValidationEngine.js';
import { InstitutionalKPIEngine } from './institutionalKPIEngine.js';
import { BlackSwanCertification2 } from './blackSwanCertification2.js';
import { HumanOversightSimulator } from './humanOversightSimulator.js';

/**
 * Official L14 Verification Suite
 * Executes in the exact Executive Governance Order:
 * 1. Shadow Fund (Completamente Cego)
 * 2. Independent Validation Engine (Estatístico sem Alpha Core metadata)
 * 3. Institutional KPI Engine (Risco e Sobrevivência, sem retorno como KPI primário)
 * 4. Black Swan Certification 2.0 (14 Cenários incluindo Governança)
 * 5. Human Oversight Simulator (Papel Fiduciário: Comitê, Auditor, Regulador)
 */

async function runL14ValidationSuite() {
  console.log("================================================================================");
  console.log("🏛️ LYZER EDGE — L14 INSTITUTIONAL VALIDATION & REAL-WORLD READINESS SUITE");
  console.log("================================================================================\n");

  let totalScore = 0;
  const maxScore = 100;

  // STEP 1: SHADOW FUND 365 DAYS (REGRA 1)
  console.log("--- [STEP 1/5] SHADOW FUND 365 DAYS BLIND ENDURANCE ---");
  const shadowEngine = new ShadowFundEngine(1000000);
  const shadowReport = shadowEngine.runShadowEndurance(365);
  const blindRecords = shadowEngine.blindAuditor.blindRecords;
  
  if (blindRecords.length === 730 && shadowReport.maxDrawdownPerc < 10.0) {
    console.log("✅ Step 1 Passed: 365 Days Blind Execution verified without Alpha metadata leakage.\n");
    totalScore += 20;
  } else {
    console.error("❌ Step 1 Failed: Shadow endurance or drawdown violation.\n");
  }

  // STEP 2: INDEPENDENT VALIDATION ENGINE (REGRA 2)
  console.log("--- [STEP 2/5] INDEPENDENT STATISTICAL VALIDATION (ZERO-KNOWLEDGE) ---");
  const validator = new IndependentValidationEngine();
  const validationReport = validator.runStatisticalAudit(blindRecords);
  
  if (validationReport.passed && !validationReport.isOverfitted) {
    console.log("✅ Step 2 Passed: Statistical distribution verified (No Lookahead Bias or Overfitting).\n");
    totalScore += 20;
  } else {
    console.error("❌ Step 2 Failed: Statistical anomalies detected.\n");
  }

  // STEP 3: INSTITUTIONAL KPI ENGINE (REGRA 4)
  console.log("--- [STEP 3/5] INSTITUTIONAL SURVIVAL & RISK KPI COMPUTATION ---");
  const kpiEngine = new InstitutionalKPIEngine();
  const kpiReport = kpiEngine.calculateInstitutionalKPIs(blindRecords, 1000000);
  
  if (kpiReport.status === 'COMPLETED' && kpiReport.institutionalGrade) {
    console.log(`✅ Step 3 Passed: Institutional Grade confirmed (${kpiReport.summary}).\n`);
    totalScore += 20;
  } else {
    console.error("❌ Step 3 Failed: Survival KPI thresholds not met.\n");
  }

  // STEP 4: BLACK SWAN CERTIFICATION 2.0 (REGRA 5)
  console.log("--- [STEP 4/5] BLACK SWAN 2.0 & GOVERNANCE ATTACK SUITE ---");
  const blackSwan = new BlackSwanCertification2();
  const bsReport = blackSwan.runAdversarialSuite();
  
  if (bsReport.status === 'PASSED_ALL' && bsReport.selfImpedimentVerified) {
    console.log(`✅ Step 4 Passed: 14/14 Extreme Scenarios Defended. Self-Impediment Rule Verified.\n`);
    totalScore += 20;
  } else {
    console.error("❌ Step 4 Failed: Vulnerability in governance or chaos defense.\n");
  }

  // STEP 5: HUMAN OVERSIGHT SIMULATOR (REGRA 6)
  console.log("--- [STEP 5/5] HUMAN OVERSIGHT FIDUCIARY INQUIRY SUITE ---");
  const oversight = new HumanOversightSimulator();
  const oversightReport = oversight.runFiduciaryInquirySuite(kpiReport, bsReport);
  
  if (oversightReport.allSatisfied) {
    console.log("✅ Step 5 Passed: All 3 Fiduciary Roles (Committee, Risk Auditor, Regulator) satisfied.\n");
    totalScore += 20;
  } else {
    console.error("❌ Step 5 Failed: Human oversight inquiry unanswered or rejected.\n");
  }

  console.log("================================================================================");
  console.log(`🏆 FINAL L14 INSTITUTIONAL SCORE: ${totalScore} / ${maxScore}`);
  console.log(`🛡️ GOVERNANCE STATUS: ${totalScore === 100 ? '🟢 100% COMPLIANT - READY FOR LIVE SHADOW (L15)' : '🔴 REJECTED - AUDIT FAILURES DETECTED'}`);
  console.log("================================================================================\n");

  if (totalScore !== 100) {
    process.exit(1);
  }
}

runL14ValidationSuite().catch(err => {
  console.error("Fatal Error running L14 suite:", err);
  process.exit(1);
});
