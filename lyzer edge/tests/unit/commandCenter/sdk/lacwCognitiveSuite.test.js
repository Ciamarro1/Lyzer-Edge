import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LACWEventBus } from '../../../../src/components/commandCenter/sdk/lacw/LACWEventBus.js';
import { CognitiveRuntimeEngine } from '../../../../src/components/commandCenter/sdk/lacw/cognitive/CognitiveRuntimeEngine.js';
import { ContextEngine } from '../../../../src/components/commandCenter/sdk/lacw/cognitive/ContextEngine.js';
import { CognitiveStateEngine } from '../../../../src/components/commandCenter/sdk/lacw/cognitive/CognitiveStateEngine.js';
import { ObservationEngine } from '../../../../src/components/commandCenter/sdk/lacw/cognitive/ObservationEngine.js';
import { CognitiveKnowledgeEngine } from '../../../../src/components/commandCenter/sdk/lacw/cognitive/CognitiveKnowledgeEngine.js';
import { CognitiveMemoryEngine, MEMORY_TIERS } from '../../../../src/components/commandCenter/sdk/lacw/cognitive/CognitiveMemoryEngine.js';
import { ReasoningEngine } from '../../../../src/components/commandCenter/sdk/lacw/cognitive/ReasoningEngine.js';
import { CertificationEngine } from '../../../../src/components/commandCenter/sdk/lacw/cognitive/CertificationEngine.js';
import { CapabilityEngine } from '../../../../src/components/commandCenter/sdk/lacw/cognitive/CapabilityEngine.js';
import { CognitiveWorkflowEngine } from '../../../../src/components/commandCenter/sdk/lacw/cognitive/CognitiveWorkflowEngine.js';

describe('LACW Phase 2 — Cognitive Core Architecture Engine Suite', () => {
  let eventBus;
  let runtime;
  let contextEngine;
  let stateEngine;
  let obsEngine;
  let knowledgeEngine;
  let memoryEngine;
  let reasoningEngine;
  let certEngine;
  let capabilityEngine;
  let workflowEngine;

  beforeEach(() => {
    eventBus = new LACWEventBus();
    runtime = new CognitiveRuntimeEngine(eventBus);
    contextEngine = new ContextEngine(eventBus);
    stateEngine = new CognitiveStateEngine(eventBus);
    obsEngine = new ObservationEngine(eventBus);
    knowledgeEngine = new CognitiveKnowledgeEngine(eventBus);
    memoryEngine = new CognitiveMemoryEngine();
    reasoningEngine = new ReasoningEngine(eventBus);
    certEngine = new CertificationEngine(eventBus);
    capabilityEngine = new CapabilityEngine(eventBus);
    workflowEngine = new CognitiveWorkflowEngine(eventBus);
  });

  afterEach(() => {
    eventBus.dispose();
    runtime.dispose();
    contextEngine.dispose();
    stateEngine.dispose();
    obsEngine.dispose();
    knowledgeEngine.dispose();
    memoryEngine.dispose();
    reasoningEngine.dispose();
    certEngine.dispose();
    capabilityEngine.dispose();
    workflowEngine.dispose();
  });

  it('1. CognitiveRuntimeEngine should register agents and return system diagnostics', () => {
    const agent = runtime.registerAgent('orchestrator', { role: 'COGNITIVE_DIRECTOR' });
    expect(agent.agentId).toBe('orchestrator');

    const diag = runtime.getRuntimeDiagnostic();
    expect(diag.status).toBe('NOMINAL');
    expect(diag.activeAgentsCount).toBe(1);
  });

  it('2. ContextEngine should return immutable context snapshot and handle updates', () => {
    const snap = contextEngine.getContextSnapshot();
    expect(snap.user.role).toBe('PRINCIPAL_ARCHITECT');
    expect(snap.activeWorkspacePreset).toBe('RESEARCH');

    contextEngine.updateContext('activeWorkspacePreset', 'OBSERVABILITY');
    expect(contextEngine.getContextSnapshot().activeWorkspacePreset).toBe('OBSERVABILITY');
  });

  it('3. CognitiveStateEngine should manage states, track audit trail, and increment versions', () => {
    const state1 = stateEngine.setState('threatLevel', 'LOW', { confidence: 0.99 });
    expect(state1.version).toBe(1);

    const state2 = stateEngine.setState('threatLevel', 'ELEVATED', { confidence: 0.85 });
    expect(state2.version).toBe(2);

    const audit = stateEngine.getAuditTrail();
    expect(audit).toHaveLength(2);
    expect(audit[1].previousValue).toBe('LOW');
  });

  it('4. ObservationEngine should transform raw data into structured observations', () => {
    const obs = obsEngine.processRawData('MARKET_DATA', { tickPrice: 65400, volume: 14.2 });
    expect(obs.observationId).toBeDefined();
    expect(obs.processedFeatureCount).toBe(2);
    expect(obs.realityTag).toBe('OBSERVED_REALITY');
  });

  it('5. CognitiveKnowledgeEngine should assert and retrieve living knowledge nodes', () => {
    const node = knowledgeEngine.assertKnowledge('regime_reversion', {
      fact: 'Market exhibits mean reversion in low volatility',
      confidence: 0.96
    });

    expect(node.conceptId).toBe('regime_reversion');
    expect(node.confidence).toBe(0.96);
    expect(knowledgeEngine.getKnowledge('regime_reversion')).toBeDefined();
  });

  it('6. CognitiveMemoryEngine should support all 8 memory tiers', () => {
    expect(MEMORY_TIERS).toHaveLength(8);

    memoryEngine.store('WORKING', 'scratchpad_1', { task: 'Feature Discovery' });
    memoryEngine.store('SEMANTIC', 'vec_881', { vector: [0.1, 0.4, 0.9] });

    expect(memoryEngine.recall('WORKING', 'scratchpad_1').value.task).toBe('Feature Discovery');
    expect(memoryEngine.getTierStats().WORKING).toBe(1);
    expect(memoryEngine.getTierStats().SEMANTIC).toBe(1);
  });

  it('7. ReasoningEngine should evaluate auditable step-by-step reasoning chains', () => {
    const chain = reasoningEngine.evaluateReasoningChain(
      ['Premise A: BOS detected', 'Premise B: Volume spike'],
      [{ step: 'Inspect Order Book', output: 'Liquidity imbalance +40%' }],
      { finalOutput: 'Hypothesis Approved', confidence: 0.95 }
    );

    expect(chain.chainId).toBeDefined();
    expect(chain.premises).toHaveLength(2);
    expect(chain.steps).toHaveLength(1);
    expect(chain.confidence).toBe(0.95);
  });

  it('8. CertificationEngine should issue and cryptographically verify certificates', () => {
    const cert = certEngine.issueCertificate('DECISION', 'dec_991', { courtApproved: true });
    expect(cert.certId).toBeDefined();
    expect(cert.issuedBy).toBe('ConstitutionalCourt_Authority');

    const verification = certEngine.verifyCertificate(cert.certId);
    expect(verification.valid).toBe(true);
  });

  it('9. CapabilityEngine should register and discover capabilities', () => {
    capabilityEngine.registerCapability('market_data:read', { version: '1.0.0' });
    const cap = capabilityEngine.discoverCapability('market_data:read');
    expect(cap.capabilityId).toBe('market_data:read');
    expect(cap.version).toBe('1.0.0');
  });

  it('10. CognitiveWorkflowEngine should execute declarative workflows', async () => {
    const wf = workflowEngine.defineWorkflow('alpha_pipeline', [
      { stepId: 'step1', action: 'ingest', handler: async (ctx) => ({ count: 100 }) }
    ]);

    const result = await workflowEngine.executeWorkflow(wf.workflowId);
    expect(result.status).toBe('COMPLETED');
    expect(result.finalContext.step1.count).toBe(100);
  });

  it('11. TC39 Symbol.dispose compliance across all cognitive engines', () => {
    expect(typeof runtime[Symbol.dispose]).toBe('function');
    expect(typeof memoryEngine[Symbol.dispose]).toBe('function');

    runtime[Symbol.dispose]();
    memoryEngine[Symbol.dispose]();

    expect(() => runtime.getRuntimeDiagnostic()).toThrow('ERR_COGNITIVE_RUNTIME_DISPOSED');
    expect(() => memoryEngine.store('WORKING', 'k', 'v')).toThrow('ERR_COGNITIVE_MEMORY_ENGINE_DISPOSED');
  });
});
