import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdaptiveRenderingBudgetEngine } from '../../../../src/components/commandCenter/sdk/lacw/infrastructure/AdaptiveRenderingBudgetEngine.js';
import { WidgetPerformanceProfiler } from '../../../../src/components/commandCenter/sdk/lacw/infrastructure/WidgetPerformanceProfiler.js';
import { MultiTierStorageRouterEngine } from '../../../../src/components/commandCenter/sdk/lacw/infrastructure/MultiTierStorageRouterEngine.js';
import { AIModelRouterEngine } from '../../../../src/components/commandCenter/sdk/lacw/infrastructure/AIModelRouterEngine.js';
import { ZeroTrustIdentityGateway } from '../../../../src/components/commandCenter/sdk/lacw/infrastructure/ZeroTrustIdentityGateway.js';
import { SupplyChainSecurityScanner } from '../../../../src/components/commandCenter/sdk/lacw/infrastructure/SupplyChainSecurityScanner.js';
import { FinOpsCostManagementEngine } from '../../../../src/components/commandCenter/sdk/lacw/infrastructure/FinOpsCostManagementEngine.js';
import { DisasterRecoveryFailoverEngine } from '../../../../src/components/commandCenter/sdk/lacw/infrastructure/DisasterRecoveryFailoverEngine.js';
import { ChaosEngineeringSimulator } from '../../../../src/components/commandCenter/sdk/lacw/infrastructure/ChaosEngineeringSimulator.js';
import { CICDPipelineValidator } from '../../../../src/components/commandCenter/sdk/lacw/infrastructure/CICDPipelineValidator.js';

describe('LACW Phase 8 — Performance Engineering, Security Architecture & Deployment Suite', () => {
  let renderingEngine;
  let widgetProfiler;
  let storageRouter;
  let modelRouter;
  let zeroTrustGateway;
  let securityScanner;
  let finopsEngine;
  let disasterRecovery;
  let chaosSimulator;
  let cicdValidator;

  beforeEach(() => {
    renderingEngine = new AdaptiveRenderingBudgetEngine();
    widgetProfiler = new WidgetPerformanceProfiler();
    storageRouter = new MultiTierStorageRouterEngine();
    modelRouter = new AIModelRouterEngine();
    zeroTrustGateway = new ZeroTrustIdentityGateway();
    securityScanner = new SupplyChainSecurityScanner();
    finopsEngine = new FinOpsCostManagementEngine(1000);
    disasterRecovery = new DisasterRecoveryFailoverEngine();
    chaosSimulator = new ChaosEngineeringSimulator();
    cicdValidator = new CICDPipelineValidator();
  });

  afterEach(() => {
    renderingEngine.dispose();
    widgetProfiler.dispose();
    storageRouter.dispose();
    modelRouter.dispose();
    zeroTrustGateway.dispose();
    securityScanner.dispose();
    finopsEngine.dispose();
    disasterRecovery.dispose();
    chaosSimulator.dispose();
    cicdValidator.dispose();
  });

  it('1. AdaptiveRenderingBudgetEngine should evaluate 60 FPS frame rendering priorities', () => {
    const priority = renderingEngine.evaluateRenderPriority('widget_chart', true, 3.2);
    expect(priority.canRenderThisFrame).toBe(true);
    expect(priority.renderStrategy).toBe('IMMEDIATE_RENDER');
  });

  it('2. WidgetPerformanceProfiler should profile and store 7 widget resource attributes', () => {
    const profile = widgetProfiler.profileWidget('w_orderbook', { priority: 'HIGH', memory_cost: 'LOW_15MB' });
    expect(profile.widgetId).toBe('w_orderbook');

    const fetched = widgetProfiler.getProfile('w_orderbook');
    expect(fetched.priority).toBe('HIGH');
  });

  it('3. MultiTierStorageRouterEngine should route storage requests across specialized storage layers', () => {
    const routed = storageRouter.routeStorageRequest('VECTOR', 'WRITE', { vectorId: 'v100' });
    expect(routed.status).toBe('ROUTED_SUCCESSFULLY');
    expect(routed.destinationAdapter).toBe('VECTOR_STORAGE_ADAPTER');
  });

  it('4. AIModelRouterEngine should intelligently route AI prompt requests based on complexity and cost', () => {
    const route1 = modelRouter.routeModelRequest('QUICK_SUMMARY');
    expect(route1.selectedModel).toBe('gemini-3.6-flash');

    const route2 = modelRouter.routeModelRequest('COMPLEX_REASONING', { requireDeepReasoning: true });
    expect(route2.selectedModel).toBe('gemini-3.6-pro');
  });

  it('5. ZeroTrustIdentityGateway should issue and verify zero-trust capability tokens', () => {
    const issued = zeroTrustGateway.issueToken('agent_alpha', 'AGENT', ['market_data:read']);
    expect(issued.token).toBeDefined();

    const verification = zeroTrustGateway.verifyAuthorization(issued.token, 'market_data:read');
    expect(verification.authorized).toBe(true);
  });

  it('6. SupplyChainSecurityScanner should scan dependencies for security vulnerabilities', () => {
    const res = securityScanner.scanDependencies(['vitest', 'express', 'vulnerable-pkg-test']);
    expect(res.scannedCount).toBe(3);
    expect(res.vulnerabilitiesCount).toBe(1);
    expect(res.status).toBe('ACTION_REQUIRED');
  });

  it('7. FinOpsCostManagementEngine should track financial transactions and calculate budget consumption', () => {
    finopsEngine.recordCost('agent_alpha', 'AI_MODEL', 15.50);
    finopsEngine.recordCost('agent_beta', 'COMPUTE', 24.50);

    const summary = finopsEngine.getFinOpsSummary();
    expect(summary.totalSpentUsd).toBe(40.00);
    expect(summary.remainingBudgetUsd).toBe(960.00);
  });

  it('8. DisasterRecoveryFailoverEngine should coordinate automated failover to secondary node', () => {
    const failover = disasterRecovery.triggerFailover('Primary WS disconnect');
    expect(failover.primaryNodeActive).toBe(false);
    expect(failover.failoverStatus).toBe('ACTIVE_SECONDARY_NODE');

    const restored = disasterRecovery.restorePrimaryNode();
    expect(restored.primaryNodeActive).toBe(true);
  });

  it('9. ChaosEngineeringSimulator should inject fault experiments and verify resilience', () => {
    const experiment = chaosSimulator.injectFault('SERVICE_OFFLINE', 'TruthKernel');
    expect(experiment.experimentId).toBeDefined();
    expect(experiment.resilienceResult).toContain('SYSTEM_SURVIVED');
  });

  it('10. CICDPipelineValidator should validate all 8 deployment pipeline stages', async () => {
    const validation = await cicdValidator.validatePipeline('3.9.0');
    expect(validation.pipelineStatus).toBe('APPROVED_FOR_PRODUCTION_RELEASE');
    expect(validation.stages).toHaveLength(8);
  });

  it('11. TC39 Symbol.dispose compliance across all infrastructure & security engines', () => {
    expect(typeof renderingEngine[Symbol.dispose]).toBe('function');
    expect(typeof finopsEngine[Symbol.dispose]).toBe('function');

    renderingEngine[Symbol.dispose]();
    finopsEngine[Symbol.dispose]();

    expect(() => renderingEngine.evaluateRenderPriority('w', true)).toThrow('ERR_ADAPTIVE_RENDERING_BUDGET_DISPOSED');
    expect(() => finopsEngine.getFinOpsSummary()).toThrow('ERR_FINOPS_COST_MANAGEMENT_DISPOSED');
  });
});
