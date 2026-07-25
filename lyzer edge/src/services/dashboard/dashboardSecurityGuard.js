/**
 * Lyzer Edge Command Center v2 — Security Guard (ETAPA 7)
 * Enforces Zero-Trust Presentation Layer and Alpha Freeze Absolute.
 * Blocks any mutation attempts (POST, PUT, PATCH, DELETE or forbidden actions).
 */

export class DashboardSecurityGuard {
  constructor() {
    this.vetoLogs = [];
    this.forbiddenActions = [
      'WRITE_ALPHA',
      'MODIFY_PARAMETERS',
      'CHANGE_ALLOCATION',
      'EXECUTE_ORDER',
      'OPTIMIZE_MODEL'
    ];
    this.forbiddenMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  }

  /**
   * Inspects a request or action attempt from the frontend/UI.
   * @param {Object} request - { method, action, payload, source }
   * @returns {Object} { allowed: boolean, vetoEvent?: Object }
   */
  inspect(request) {
    const method = (request.method || 'GET').toUpperCase();
    const action = (request.action || '').toUpperCase();

    const isForbiddenMethod = this.forbiddenMethods.includes(method);
    const isForbiddenAction = this.forbiddenActions.includes(action);

    if (isForbiddenMethod || isForbiddenAction) {
      const vetoEvent = {
        event: "DASHBOARD_CONTROL_VETO",
        reason: isForbiddenAction 
          ? `Attempted forbidden action: ${action}` 
          : `Attempted forbidden HTTP method: ${method}`,
        attempted_action: action || method,
        timestamp: new Date().toISOString(),
        security_level: "CRITICAL_VIOLATION",
        source: request.source || "PresentationLayer"
      };

      this.vetoLogs.push(vetoEvent);

      return {
        allowed: false,
        status: 403,
        error: "🚨 [DASHBOARD_CONTROL_VETO] READ-ONLY FIDUCIARY VIOLATION: Mutações não são permitidas via Command Center v2.",
        vetoEvent
      };
    }

    return { allowed: true };
  }

  getVetoLogs() {
    return [...this.vetoLogs];
  }

  getVetoCount() {
    return this.vetoLogs.length;
  }
}

export const securityGuard = new DashboardSecurityGuard();
