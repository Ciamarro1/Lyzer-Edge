/**
 * Lyzer Edge — UserIntentEngine
 * User Intent Detection & Classification Engine.
 * Supports 10 Intent Categories:
 *   EXPLORE, ANALYZE, CREATE, MODIFY, EXECUTE, MONITOR, LEARN, COMPARE, OPTIMIZE, EXPLAIN
 */

export const INTENT_CATEGORIES = Object.freeze([
  'EXPLORE',
  'ANALYZE',
  'CREATE',
  'MODIFY',
  'EXECUTE',
  'MONITOR',
  'LEARN',
  'COMPARE',
  'OPTIMIZE',
  'EXPLAIN'
]);

export class UserIntentEngine {
  constructor() {
    this._disposed = false;
  }

  /**
   * Classifies user prompt or action into an intent record.
   * @param {string} rawInput - e.g. "I need to fix this error in TruthKernel"
   */
  classifyIntent(rawInput) {
    this._assertNotDisposed();

    let type = 'ANALYZE';
    const lower = rawInput.toLowerCase();

    if (lower.includes('fix') || lower.includes('modify') || lower.includes('change')) type = 'MODIFY';
    else if (lower.includes('explore') || lower.includes('find')) type = 'EXPLORE';
    else if (lower.includes('explain') || lower.includes('why')) type = 'EXPLAIN';
    else if (lower.includes('optimize') || lower.includes('improve')) type = 'OPTIMIZE';
    else if (lower.includes('compare')) type = 'COMPARE';

    return Object.freeze({
      rawInput,
      type,
      confidence: 0.95,
      urgency: lower.includes('urgent') ? 'HIGH' : 'NORMAL',
      expectedOutcome: `Execute intent strategy for '${type}'`,
      classifiedAt: new Date().toISOString()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_USER_INTENT_ENGINE_DISPOSED: User Intent Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
