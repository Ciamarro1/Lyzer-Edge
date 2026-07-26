/**
 * Lyzer Edge — HumanFeedbackEngine
 * Human Operator Feedback & Supervision Pipeline.
 * Collects operator approvals, corrections, interventions, and feedback attributions.
 */

let _fbIdCounter = 0;

export class HumanFeedbackEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._feedbackRecords = [];
  }

  /**
   * Records human operator feedback for an agent decision or output.
   * @param {string} targetId - Decision or output ID
   * @param {string} feedbackType - e.g. 'APPROVE', 'CORRECT', 'OVERRIDE', 'REJECT'
   * @param {Record<string, unknown>} [details]
   */
  recordFeedback(targetId, feedbackType, details = {}) {
    this._assertNotDisposed();

    const feedbackId = `fb_${Date.now()}_${++_fbIdCounter}`;

    const record = Object.freeze({
      feedbackId,
      targetId,
      feedbackType,
      operatorRole: details.operatorRole || 'PRINCIPAL_ARCHITECT',
      comments: details.comments || 'Approved for shadow mode execution',
      impactScore: details.impactScore || 1.0,
      recordedAt: new Date().toISOString(),
      timestamp: Date.now()
    });

    this._feedbackRecords.push(record);

    if (this._eventBus) {
      this._eventBus.publish('human:feedback:recorded', { feedbackId, targetId, feedbackType });
    }

    return record;
  }

  /**
   * Returns recorded feedback history.
   * @param {number} [limit=20]
   */
  getFeedbackHistory(limit = 20) {
    this._assertNotDisposed();
    return this._feedbackRecords.slice(-limit);
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_HUMAN_FEEDBACK_ENGINE_DISPOSED: Human Feedback Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._feedbackRecords = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
