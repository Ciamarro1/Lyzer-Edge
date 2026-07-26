import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UniversalMetricsEngine } from '../../../../src/components/commandCenter/sdk/lacw/observability/UniversalMetricsEngine.js';
import { CognitiveTraceEngine } from '../../../../src/components/commandCenter/sdk/lacw/observability/CognitiveTraceEngine.js';
import { StructuredLogIntelligenceEngine } from '../../../../src/components/commandCenter/sdk/lacw/observability/StructuredLogIntelligenceEngine.js';
import { SystemicHealthManagerEngine, SYSTEM_HEALTH_STATES } from '../../../../src/components/commandCenter/sdk/lacw/observability/SystemicHealthManagerEngine.js';
import { RootCauseAnomalyEngine } from '../../../../src/components/commandCenter/sdk/lacw/observability/RootCauseAnomalyEngine.js';
import { MultiLevelExplainabilityEngine } from '../../../../src/components/commandCenter/sdk/lacw/observability/MultiLevelExplainabilityEngine.js';
import { DecisionCertificateSigner } from '../../../../src/components/commandCenter/sdk/lacw/observability/DecisionCertificateSigner.js';
import { InstitutionalEvidenceGraphEngine } from '../../../../src/components/commandCenter/sdk/lacw/observability/InstitutionalEvidenceGraphEngine.js';
import { PolicyRiskConstraintEngine } from '../../../../src/components/commandCenter/sdk/lacw/observability/PolicyRiskConstraintEngine.js';
import { IncidentPostmortemEngine } from '../../../../src/components/commandCenter/sdk/lacw/observability/IncidentPostmortemEngine.js';

describe('LACW Phase 7 — Observability Platform, Explainability Engine & Governance Layer Suite', () => {
  let metricsEngine;
  let traceEngine;
  let logEngine;
  let healthManager;
  let rootCauseEngine;
  let explainabilityEngine;
  let certificateSigner;
  let evidenceGraph;
  let policyEngine;
  let incidentEngine;

  beforeEach(() => {
    metricsEngine = new UniversalMetricsEngine();
    traceEngine = new CognitiveTraceEngine();
    logEngine = new StructuredLogIntelligenceEngine();
    healthManager = new SystemicHealthManagerEngine();
    rootCauseEngine = new RootCauseAnomalyEngine();
    explainabilityEngine = new MultiLevelExplainabilityEngine();
    certificateSigner = new DecisionCertificateSigner();
    evidenceGraph = new InstitutionalEvidenceGraphEngine();
    policyEngine = new PolicyRiskConstraintEngine();
    incidentEngine = new IncidentPostmortemEngine();
  });

  afterEach(() => {
    metricsEngine.dispose();
    traceEngine.dispose();
    logEngine.dispose();
    healthManager.dispose();
    rootCauseEngine.dispose();
    explainabilityEngine.dispose();
    certificateSigner.dispose();
    evidenceGraph.dispose();
    policyEngine.dispose();
    incidentEngine.dispose();
  });

  it('1. UniversalMetricsEngine should record and filter metric categories', () => {
    metricsEngine.recordMetric('m1', 'DecisionQuality', 0.95, 'COGNITIVE');
    metricsEngine.recordMetric('m2', 'CPU_Usage', 12.4, 'SYSTEM');

    const cognitive = metricsEngine.getMetrics('COGNITIVE');
    expect(cognitive).toHaveLength(1);
    expect(cognitive[0].value).toBe(0.95);
  });

  it('2. CognitiveTraceEngine should record end-to-end 11-step cognitive distributed traces', () => {
    const traceId = traceEngine.startTrace('Discover_Alpha', 'Architect');
    traceEngine.appendStep(traceId, 'CapabilitySelection', { capability: 'market_data:read' });
    traceEngine.appendStep(traceId, 'Reasoning', { result: 'BOS_detected' });

    const traceSnapshot = traceEngine.completeTrace(traceId);
    expect(traceSnapshot.status).toBe('COMPLETED');
    expect(traceSnapshot.steps).toHaveLength(2);
  });

  it('3. StructuredLogIntelligenceEngine should log structured entries and analyze log patterns', () => {
    logEngine.log('INFO', 'TruthKernel', 'Initialization started');
    logEngine.log('ERROR', 'TruthKernel', 'LHDS threshold breach');

    const analysis = logEngine.analyzeLogPatterns();
    expect(analysis.totalLogs).toBe(2);
    expect(analysis.errorCount).toBe(1);
  });

  it('4. SystemicHealthManagerEngine should evaluate overall system health across 6 states', () => {
    expect(SYSTEM_HEALTH_STATES).toContain('HEALTHY');
    expect(SYSTEM_HEALTH_STATES).toContain('DEGRADED');

    healthManager.updateComponentHealth('TruthKernel', 'HEALTHY');
    healthManager.updateComponentHealth('OpenMobius', 'DEGRADED');

    const health = healthManager.evaluateOverallHealth();
    expect(health.overallState).toBe('DEGRADED');
    expect(health.degradedComponents).toContain('OpenMobius');
  });

  it('5. RootCauseAnomalyEngine should perform root cause diagnosis on anomalies', () => {
    const diagnosis = rootCauseEngine.diagnoseRootCause('anom_99', { componentId: 'ExecutionTriggerLayer' });
    expect(diagnosis.anomalyId).toBe('anom_99');
    expect(diagnosis.suspectedComponent).toBe('ExecutionTriggerLayer');
  });

  it('6. MultiLevelExplainabilityEngine should generate explanations across 4 detail levels', () => {
    const exec = explainabilityEngine.generateExplanation('dec_100', 'EXECUTIVE', { confidence: 0.95 });
    expect(exec.explanationText).toContain('Executive Summary');

    const fore = explainabilityEngine.generateExplanation('dec_100', 'FORENSIC');
    expect(fore.explanationText).toContain('Forensic Reconstruction');
  });

  it('7. DecisionCertificateSigner should issue cryptographically signed Decision Certificates', () => {
    const cert = certificateSigner.issueDecisionCertificate('dec_881', { confidence: 0.98 });
    expect(cert.certificateId).toBe('cert_dec_dec_881');
    expect(cert.signature).toContain('sig_sha256_');
  });

  it('8. InstitutionalEvidenceGraphEngine should link evidence and solve claim support scores', () => {
    evidenceGraph.linkEvidence('ev_1', 'dec_881', 'SUPPORTS_DECISION', 0.90);
    evidenceGraph.linkEvidence('ev_2', 'dec_881', 'CONTRADICTS_DECISION', 0.10);

    const support = evidenceGraph.evaluateClaimSupport('dec_881');
    expect(support.supportingCount).toBe(1);
    expect(support.netEvidenceStrength).toBeGreaterThan(0.70);
  });

  it('9. PolicyRiskConstraintEngine should enforce policy governance and veto un-sanctioned actions', () => {
    const approved = policyEngine.evaluateGovernancePolicy('ShadowModeSimulation', 'Agent_Alpha');
    expect(approved.approved).toBe(true);

    const vetoed = policyEngine.evaluateGovernancePolicy('LiveTradeExecution', 'Agent_Alpha', { isLiveTrade: true, approvedByCourt: false });
    expect(vetoed.approved).toBe(false);
    expect(vetoed.reason).toContain('ERR_GOVERNANCE_VETO');
  });

  it('10. IncidentPostmortemEngine should register incidents and generate postmortem reports', () => {
    const inc = incidentEngine.registerIncident('High Latency Spike', 'HIGH');
    expect(inc.status).toBe('INVESTIGATING');

    const pm = incidentEngine.generatePostmortemReport(inc.incidentId, { rootCause: 'Queue overflow' });
    expect(pm.postmortemId).toBe(`pm_${inc.incidentId}`);
    expect(pm.rootCause).toBe('Queue overflow');
  });

  it('11. TC39 Symbol.dispose compliance across all observability & governance engines', () => {
    expect(typeof metricsEngine[Symbol.dispose]).toBe('function');
    expect(typeof traceEngine[Symbol.dispose]).toBe('function');

    metricsEngine[Symbol.dispose]();
    traceEngine[Symbol.dispose]();

    expect(() => metricsEngine.getMetrics()).toThrow('ERR_UNIVERSAL_METRICS_ENGINE_DISPOSED');
    expect(() => traceEngine.startTrace('t', 'a')).toThrow('ERR_COGNITIVE_TRACE_ENGINE_DISPOSED');
  });
});
