import { RealityStates, RealityEvents } from './realityTypes.js';

export class RealityOrchestrator {
  constructor(context = {}, registry = null) {
    this._eventBus = context.eventBus || null;
    this._registry = registry;
    this._currentProvider = null;
    this._state = RealityStates.INITIALIZING;
    this._auditTrail = [];
  }

  get state() {
    return this._state;
  }

  get activeProvider() {
    return this._currentProvider;
  }

  get auditTrail() {
    return this._auditTrail;
  }

  assertTimelineOwnership(providerId) {
    if (this._currentProvider && this._currentProvider.id !== providerId) {
      throw new Error(`[ERR_TIMELINE_CONFLICT] Provider ${providerId} cannot write to timeline owned by ${this._currentProvider.id}`);
    }
  }

  async switchReality(providerId, reason = 'Transition requested') {
    if (this._eventBus) {
      this._eventBus.emit(RealityEvents.TRANSITION_REQUESTED, { providerId, reason });
    }

    const provider = this._registry ? this._registry.get(providerId) : null;
    if (!provider) {
      throw new Error(`ProviderNotFoundError: Provider ${providerId} not found in registry.`);
    }

    if (this._eventBus) {
      this._eventBus.emit(RealityEvents.TRANSITION_VALIDATED, { providerId, realityTag: provider.realityTag });
    }

    try {
      const fromTag = this._currentProvider ? this._currentProvider.realityTag : null;
      if (this._currentProvider) {
        await this._currentProvider.disconnect();
      }

      await provider.connect();
      this._currentProvider = provider;
      this._state = provider.realityTag === 'OBSERVED_REALITY' ? RealityStates.OBSERVED : RealityStates.RECONSTRUCTED;

      this._auditTrail.push({
        from: fromTag,
        to: provider.realityTag,
        reason,
        approved: true,
        timestamp: Date.now()
      });

      if (this._eventBus) {
        this._eventBus.emit(RealityEvents.TRANSITION_COMPLETED, { providerId, realityTag: provider.realityTag });
      }
    } catch (err) {
      this._state = RealityStates.ERROR;
      if (this._eventBus) {
        this._eventBus.emit(RealityEvents.TRANSITION_FAILED, { providerId, error: err.message });
      }
      throw err;
    }
  }
}
