import { RealityStates } from './realityTypes.js';

export class RealityStateMachine {
  constructor() {
    this._currentState = RealityStates.INITIALIZING;
    this._listeners = new Set();
  }

  get currentState() {
    return this._currentState;
  }

  canTransitionTo(targetState) {
    const validTransitions = {
      [RealityStates.INITIALIZING]: [RealityStates.OBSERVED, RealityStates.RECONSTRUCTED, RealityStates.SYNTHETIC, RealityStates.ERROR],
      [RealityStates.OBSERVED]: [RealityStates.RECONSTRUCTED, RealityStates.SYNTHETIC, RealityStates.DEGRADED, RealityStates.ERROR],
      [RealityStates.RECONSTRUCTED]: [RealityStates.OBSERVED, RealityStates.SYNTHETIC, RealityStates.ERROR],
      [RealityStates.SYNTHETIC]: [RealityStates.OBSERVED, RealityStates.RECONSTRUCTED, RealityStates.ERROR],
      [RealityStates.DEGRADED]: [RealityStates.OBSERVED, RealityStates.ERROR, RealityStates.RECOVERY],
      [RealityStates.RECOVERY]: [RealityStates.OBSERVED, RealityStates.RECONSTRUCTED, RealityStates.ERROR],
      [RealityStates.ERROR]: [RealityStates.RECOVERY]
    };

    const allowed = validTransitions[this._currentState];
    return allowed ? allowed.includes(targetState) : false;
  }

  transitionTo(targetState) {
    if (!this.canTransitionTo(targetState)) {
      throw new Error(`[ERR_INVALID_STATE_TRANSITION] Cannot transition from ${this._currentState} to ${targetState}`);
    }
    
    const previousState = this._currentState;
    this._currentState = targetState;
    
    this._notifyListeners({ previousState, currentState: this._currentState });
  }

  subscribe(callback) {
    this._listeners.add(callback);
    return {
      dispose: () => {
        this._listeners.delete(callback);
      }
    };
  }

  _notifyListeners(event) {
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[RealityStateMachine] Listener error:', err);
      }
    }
  }
}
