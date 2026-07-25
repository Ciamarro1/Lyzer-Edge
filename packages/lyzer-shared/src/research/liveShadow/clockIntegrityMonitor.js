/**
 * ⏱️ CLOCK INTEGRITY MONITOR — L15 OBSERVATION LAYER
 *
 * Monitora a integridade temporal de pacotes recebidos de feeds de exchange.
 * Detecta timestamps futuros, atrasados, NTP drift e gaps temporais.
 * Ações: WARNING para desvios leves, HALT falha-fechada para violações críticas (>500ms ou futuro >100ms).
 */

export class ClockIntegrityMonitor {
  constructor(config = {}) {
    this.maxFutureDriftMs = config.maxFutureDriftMs || 100;     // Máximo tolerado no futuro (100ms)
    this.warningDelayedMs = config.warningDelayedMs || 250;     // Alarme de latência (250ms)
    this.haltDelayedMs = config.haltDelayedMs || 1000;          // Corte por atraso de relógio/rede (1000ms)
    this.lastTimestamp = 0;
    this.state = 'GREEN'; // 'GREEN' | 'WARNING' | 'HALT'
    this.incidents = [];
  }

  /**
   * Avalia o timestamp de um pacote entrante
   * @param {number} packetTimestampMs Timestamp do pacote da exchange (ms)
   * @param {number} currentSystemMs Timestamp local atual (opcional para testes)
   */
  validateTimestamp(packetTimestampMs, currentSystemMs = Date.now()) {
    const drift = currentSystemMs - packetTimestampMs; // Positivo = atrasado; Negativo = futuro

    // 1. Detecção de Timestamp Futuro (Relógio de exchange adiantado ou relógio local atrasado / NTP drift)
    if (drift < -this.maxFutureDriftMs) {
      this.state = 'HALT';
      const incident = {
        type: 'FUTURE_TIMESTAMP_DRIFT',
        severity: 'CRITICAL',
        driftMs: drift,
        packetTimestampMs,
        currentSystemMs,
        message: `[CLOCK INTEGRITY HALT] Timestamp futuro detectado! Drift: ${drift}ms (Lim: -${this.maxFutureDriftMs}ms)`
      };
      this.incidents.push(incident);
      console.error(`🚨 ${incident.message}`);
      return { status: 'HALT', incident };
    }

    // 2. Detecção de Atraso Crítico / Desconexão velada (Drift positivo excessivo)
    if (drift > this.haltDelayedMs) {
      this.state = 'HALT';
      const incident = {
        type: 'CRITICAL_LATENCY_DELAY',
        severity: 'CRITICAL',
        driftMs: drift,
        packetTimestampMs,
        currentSystemMs,
        message: `[CLOCK INTEGRITY HALT] Atraso de rede/NTP crítico detectado! Atraso: ${drift}ms (Lim: ${this.haltDelayedMs}ms)`
      };
      this.incidents.push(incident);
      console.error(`🚨 ${incident.message}`);
      return { status: 'HALT', incident };
    }

    // 3. Detecção de Gaps ou Retrocessos Temporais (Out of order packets)
    if (this.lastTimestamp > 0 && packetTimestampMs < this.lastTimestamp) {
      const backwardGap = this.lastTimestamp - packetTimestampMs;
      const severity = backwardGap > 500 ? 'CRITICAL' : 'WARNING';
      this.state = severity === 'CRITICAL' ? 'HALT' : 'WARNING';
      const incident = {
        type: 'BACKWARD_TIMESTAMP_GAP',
        severity,
        backwardGapMs: backwardGap,
        packetTimestampMs,
        lastTimestampMs: this.lastTimestamp,
        message: `[CLOCK INTEGRITY ${severity}] Retrocesso temporal (pacote fora de ordem)! Gap: -${backwardGap}ms`
      };
      this.incidents.push(incident);
      if (severity === 'CRITICAL') {
        console.error(`🚨 ${incident.message}`);
        return { status: 'HALT', incident };
      }
      console.warn(`⚠️ ${incident.message}`);
      return { status: 'WARNING', incident };
    }

    // 4. Detecção de Latência Moderada (Warning)
    if (drift > this.warningDelayedMs) {
      this.state = 'WARNING';
      const incident = {
        type: 'MODERATE_LATENCY_WARNING',
        severity: 'WARNING',
        driftMs: drift,
        packetTimestampMs,
        currentSystemMs,
        message: `[CLOCK INTEGRITY WARNING] Latência elevada no feed: ${drift}ms`
      };
      this.incidents.push(incident);
      console.warn(`⚠️ ${incident.message}`);
      this.lastTimestamp = Math.max(this.lastTimestamp, packetTimestampMs);
      return { status: 'WARNING', incident };
    }

    // Estado normal
    this.state = 'GREEN';
    this.lastTimestamp = packetTimestampMs;
    return { status: 'GREEN', driftMs: drift };
  }

  getMonitorState() {
    return {
      state: this.state,
      incidentsCount: this.incidents.length,
      lastTimestamp: this.lastTimestamp
    };
  }
}
