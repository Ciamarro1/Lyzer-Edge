/**
 * Lyzer Edge — CognitiveNotificationEngine
 * Non-Intrusive Cognitive Notification Engine.
 * Decides whether to interrupt, when to interrupt, how to interrupt, and who to interrupt—preventing visual notification spam.
 */

let _notifIdCounter = 0;

export class CognitiveNotificationEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._notifications = [];
  }

  /**
   * Evaluates and dispatches a notification.
   * @param {object} notificationSpec
   * @param {string} notificationSpec.title
   * @param {string} notificationSpec.message
   * @param {number} [notificationSpec.urgency=0.5]
   * @param {number} [notificationSpec.criticality=0.5]
   */
  dispatchNotification(notificationSpec = {}) {
    this._assertNotDisposed();

    const urgency = notificationSpec.urgency ?? 0.5;
    const criticality = notificationSpec.criticality ?? 0.5;
    const isInterruptive = urgency >= 0.8 || criticality >= 0.8;

    const notif = Object.freeze({
      id: `notif_${Date.now()}_${++_notifIdCounter}`,
      title: notificationSpec.title || 'System Notification',
      message: notificationSpec.message || '',
      urgency,
      criticality,
      isInterruptive,
      deliveryChannel: isInterruptive ? 'INTERRUPTIVE_MODAL' : 'SILENT_STREAM',
      dispatchedAt: new Date().toISOString(),
      timestamp: Date.now()
    });

    this._notifications.push(notif);

    if (this._eventBus) {
      this._eventBus.publish('notification:dispatched', {
        id: notif.id,
        isInterruptive,
        title: notif.title
      }, { priority: isInterruptive ? 'HIGH' : 'NORMAL' });
    }

    return notif;
  }

  /**
   * Returns dispatched notification history.
   * @param {number} [limit=20]
   */
  getHistory(limit = 20) {
    this._assertNotDisposed();
    return this._notifications.slice(-limit);
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_COGNITIVE_NOTIFICATION_ENGINE_DISPOSED: Cognitive Notification Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._notifications = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
