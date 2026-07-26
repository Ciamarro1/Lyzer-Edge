/**
 * Lyzer Edge Command Center V2 — DecisionLedger
 * Immutable audit ledger recording all institutional governance decisions,
 * reality transitions, court vetoes, and causal evidence.
 */

import { createDisposable } from '../DisposableStack.js';
import { freezePayload } from '../types.js';

export class DecisionLedger {
  constructor(maxEntries = 500) {
    this._maxEntries = maxEntries;
    this._entries = [];
    this._listeners = new Set();
  }

  get size() {
    return this._entries.length;
  }

  /**
   * Records a new immutable decision entry in the ledger.
   * @param {Object} rawEntry 
   * @returns {Object} Frozen recorded entry
   */
  recordDecision(rawEntry) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      throw new Error('[DecisionLedger] Invalid decision entry.');
    }

    const entryId = rawEntry.id || `dec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = rawEntry.timestamp || Date.now();

    const entry = freezePayload({
      id: entryId,
      timestamp,
      component: rawEntry.component || 'UnknownComponent',
      decision: rawEntry.decision || 'UNDECIDED',
      from: rawEntry.from || null,
      to: rawEntry.to || null,
      reason: rawEntry.reason || 'No reason provided',
      confidence: typeof rawEntry.confidence === 'number' ? rawEntry.confidence : 1.0,
      evidence: rawEntry.evidence || []
    });

    this._entries.push(entry);
    if (this._entries.length > this._maxEntries) {
      this._entries.shift();
    }

    this._notifyListeners(entry);
    return entry;
  }

  /**
   * Retrieves recorded entries matching optional filter criteria.
   * @param {Object} [filter] 
   * @returns {Array<Object>}
   */
  getEntries(filter = {}) {
    let result = [...this._entries];

    if (filter.component) {
      result = result.filter(e => e.component === filter.component);
    }
    if (filter.decision) {
      result = result.filter(e => e.decision === filter.decision);
    }
    if (filter.limit && typeof filter.limit === 'number') {
      result = result.slice(-filter.limit);
    }

    return Object.freeze(result);
  }

  /**
   * Subscribes to new decision entry emissions.
   * @param {Function} callback 
   * @returns {Object} Disposable handle
   */
  onDecision(callback) {
    if (typeof callback !== 'function') return createDisposable(() => {});
    this._listeners.add(callback);

    return createDisposable(() => {
      this._listeners.delete(callback);
    });
  }

  _notifyListeners(entry) {
    for (const listener of this._listeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error('[DecisionLedger] Listener error:', err);
      }
    }
  }

  clear() {
    this._entries = [];
  }
}

export const decisionLedger = new DecisionLedger();
