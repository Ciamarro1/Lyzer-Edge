import { ProviderRegistry } from '../providers/ProviderRegistry.js';
import { RealityTransitionGuard } from './RealityTransitionGuard.js';
import { ProviderTelemetry } from './ProviderTelemetry.js';
import { RealityStateMachine } from './RealityStateMachine.js';
import { RealityStates, RealityEvents } from './realityTypes.js';

export class RealityOrchestrator {
  constructor(runtime, registry = new ProviderRegistry()) {
    this._runtime = runtime;
    this._registry = registry;
    
    // Core governance modules
    this._stateMachine = new RealityStateMachine();
    // Assuming runtime has an eventBus; if not, pass a mock for tests
    this._guard = new RealityTransitionGuard(runtime?.eventBus || { emit: () => {} });
    this._telemetry = new ProviderTelemetry(runtime);
    
    this._activeProvider = null;
  }

  get activeProvider() {
    return this._activeProvider;
  }

  get state() {
    return this._stateMachine.currentState;
  }

  get telemetry() {
    return this._telemetry.getMetrics();
  }

  get auditTrail() {
    return this._guard.getAuditTrail();
  }

  registerProvider(provider) {
    this._registry.register(provider);
  }

  async switchReality(providerId, reason = 'user_requested') {
    const targetProvider = this._registry.get(providerId);
    if (!targetProvider) {
      throw new Error(`ProviderNotFoundError: Provider ${providerId} not found in registry.`);
    }

    // 1. Guard check
    const transitionRequest = this._guard.requestTransition(this._activeProvider, targetProvider, reason);
    if (!transitionRequest.approved) {
      throw new Error(`[ERR_TRANSITION_REJECTED] ${transitionRequest.error}`);
    }

    // 2. Disconnect old provider safely
    if (this._activeProvider) {
      await this._activeProvider.disconnect();
      this._telemetry.detach();
    }

    // 3. Connect new provider
    try {
      await targetProvider.connect();
    } catch (err) {
      // Transition failed
      if (this._runtime?.eventBus) {
         this._runtime.eventBus.emit(RealityEvents.TRANSITION_FAILED, { error: err.message });
      }
      this._stateMachine.transitionTo(RealityStates.ERROR);
      throw err;
    }

    // 4. Finalize transition
    const oldProvider = this._activeProvider;
    this._activeProvider = targetProvider;
    
    // Map RealityTag to State
    const stateMap = {
      'OBSERVED_REALITY': RealityStates.OBSERVED,
      'RECONSTRUCTED_REALITY': RealityStates.RECONSTRUCTED,
      'SYNTHETIC_REALITY': RealityStates.SYNTHETIC
    };
    
    const targetState = stateMap[targetProvider.realityTag] || RealityStates.ERROR;
    
    // This will throw if invalid according to state machine rules
    this._stateMachine.transitionTo(targetState);
    
    this._guard.commitTransition(oldProvider, targetProvider, reason);
    this._telemetry.attachTo(this._activeProvider);
    
    // Record immutable decision entry in DecisionLedger
    try {
      const { decisionLedger } = await import('../governance/DecisionLedger.js');
      decisionLedger.recordDecision({
        component: 'RealityOrchestrator',
        decision: 'ALLOW_TRANSITION',
        from: oldProvider ? oldProvider.realityTag : 'UNINITIALIZED',
        to: targetProvider.realityTag,
        reason,
        confidence: 0.98,
        evidence: [
          { key: 'providerId', value: targetProvider.id },
          { key: 'healthStatus', value: targetProvider.healthStatus || 'HEALTHY' }
        ]
      });
    } catch (e) {
      // Ignore if dynamically loading decisionLedger fails
    }

    return true;
  }

  assertTimelineOwnership(providerId) {
    this._guard.assertTimelineOwnership(providerId);
  }
}
