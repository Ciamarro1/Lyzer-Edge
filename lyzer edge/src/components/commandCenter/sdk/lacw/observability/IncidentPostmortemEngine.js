/**
 * Lyzer Edge — IncidentPostmortemEngine
 * Incident Management & Postmortem Learning Generator.
 * Workflow: Detection -> Classification -> Investigation -> Mitigation -> Resolution -> Postmortem Learning
 */

let _incIdCounter = 0;

export class IncidentPostmortemEngine {
  constructor() {
    this._disposed = false;
    this._incidents = new Map();
  }

  /**
   * Registers a systemic incident.
   * @param {string} title
   * @param {string} severity - 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
   * @param {Record<string, unknown>} [details]
   */
  registerIncident(title, severity = 'HIGH', details = {}) {
    this._assertNotDisposed();

    const incidentId = `inc_${Date.now()}_${++_incIdCounter}`;

    const record = {
      incidentId,
      title,
      severity,
      componentId: details.componentId || 'ExecutionTriggerLayer',
      status: 'INVESTIGATING',
      registeredAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    this._incidents.set(incidentId, record);
    return record;
  }

  /**
   * Resolves an incident and generates an immutable Postmortem Report.
   * @param {string} incidentId
   * @param {object} resolutionDetails
   */
  generatePostmortemReport(incidentId, resolutionDetails = {}) {
    this._assertNotDisposed();

    const inc = this._incidents.get(incidentId);
    if (!inc) throw new Error(`ERR_INCIDENT_NOT_FOUND: Incident '${incidentId}' not found.`);

    inc.status = 'RESOLVED';

    return Object.freeze({
      postmortemId: `pm_${incidentId}`,
      incidentId,
      title: inc.title,
      severity: inc.severity,
      rootCause: resolutionDetails.rootCause || 'Latency spike in websocket stream',
      mitigationApplied: resolutionDetails.mitigationApplied || 'Failed over to NATS backup queue',
      systemicLearningLesson: resolutionDetails.systemicLearningLesson || 'Increase ring buffer capacity to 4096 entries',
      resolvedAt: new Date().toISOString()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_INCIDENT_POSTMORTEM_ENGINE_DISPOSED: Incident Postmortem Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._incidents.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
