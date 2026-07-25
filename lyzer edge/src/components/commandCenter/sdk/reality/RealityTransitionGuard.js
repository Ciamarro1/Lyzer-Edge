import { RealityEvents } from './realityTypes.js';

export class RealityTransitionGuard {
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._auditTrail = [];
    this._activeTimelineId = null;
  }

  getAuditTrail() {
    return [...this._auditTrail];
  }

  requestTransition(currentProvider, targetProvider, reason) {
    this._emit(RealityEvents.TRANSITION_REQUESTED, {
      from: currentProvider ? currentProvider.id : null,
      to: targetProvider.id,
      reason
    });

    const validationResult = this._validateTransition(currentProvider, targetProvider);

    if (validationResult.valid) {
      this._emit(RealityEvents.TRANSITION_VALIDATED, {
        target: targetProvider.id,
        timelineId: targetProvider.id // using provider ID as timeline owner
      });
      return { approved: true };
    } else {
      this._emit(RealityEvents.TRANSITION_FAILED, {
        target: targetProvider.id,
        error: validationResult.error
      });
      return { approved: false, error: validationResult.error };
    }
  }

  assertTimelineOwnership(providerId) {
    if (this._activeTimelineId && this._activeTimelineId !== providerId) {
      throw new Error(`[ERR_TIMELINE_CONFLICT] Provider ${providerId} cannot write to timeline owned by ${this._activeTimelineId}`);
    }
  }

  commitTransition(fromProvider, toProvider, reason) {
    this._activeTimelineId = toProvider.id;
    
    const auditRecord = {
      from: fromProvider ? fromProvider.realityTag : null,
      to: toProvider.realityTag,
      reason,
      timestamp: Date.now(),
      approved: true
    };
    
    this._auditTrail.push(auditRecord);
    this._emit(RealityEvents.TRANSITION_COMPLETED, auditRecord);
  }

  _validateTransition(currentProvider, targetProvider) {
    if (!targetProvider) {
      return { valid: false, error: 'Target provider cannot be null' };
    }
    
    if (currentProvider && currentProvider.id === targetProvider.id) {
      return { valid: false, error: 'Cannot transition to the same provider' };
    }

    // Advanced timeline checks could go here (e.g. checking timestamps to prevent overlap)
    return { valid: true };
  }

  _emit(topic, payload) {
    if (this._eventBus) {
      this._eventBus.emit(topic, payload);
    }
  }
}
