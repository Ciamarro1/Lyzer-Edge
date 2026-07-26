/**
 * Lyzer Edge — ProgressivePersonalizationEngine
 * Progressive Personalization & Behavioral Learning Engine.
 * Tracks user interaction frequency and gradually adapts workspace preferences without abrupt UI jarring.
 */

export class ProgressivePersonalizationEngine {
  constructor() {
    this._disposed = false;
    this._preferences = new Map();
  }

  /**
   * Records a user interaction preference signal.
   * @param {string} userId
   * @param {string} preferenceKey - e.g. 'preferredPanel', 'defaultTheme'
   * @param {unknown} value
   */
  recordPreferenceSignal(userId, preferenceKey, value) {
    this._assertNotDisposed();

    const userMap = this._preferences.get(userId) || new Map();
    const current = userMap.get(preferenceKey) || { frequency: 0, confidence: 0 };

    const newFreq = current.frequency + 1;
    const newConf = Math.min(1.0, Math.round((newFreq / 10) * 100) / 100);

    const record = Object.freeze({
      userId,
      preferenceKey,
      value,
      frequency: newFreq,
      confidence: newConf,
      updatedAt: Date.now()
    });

    userMap.set(preferenceKey, record);
    this._preferences.set(userId, userMap);
    return record;
  }

  /**
   * Returns active preferences for a user.
   * @param {string} userId
   */
  getUserPreferences(userId) {
    this._assertNotDisposed();
    const userMap = this._preferences.get(userId);
    if (!userMap) return Object.freeze([]);
    return Object.freeze(Array.from(userMap.values()));
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_PROGRESSIVE_PERSONALIZATION_DISPOSED: Progressive Personalization Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._preferences.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
