/**
 * @fileoverview CognitiveScheduler — Phase 14 (ADR-031)
 *
 * Dedicated multi-cadence scheduler replacing ad-hoc timers:
 *   - Telemetry: every 10s
 *   - Portfolio Optimization: every 5m
 *   - Reflection: every 30m
 *   - Evolution: every 12h
 *   - Research: every 24h
 */
export class CognitiveScheduler {
  constructor() {
    this.schedules = new Map();
    this.history = [];
    this._initDefaultSchedules();
  }

  _initDefaultSchedules() {
    this.registerSchedule('Telemetry', 10);        // 10 seconds
    this.registerSchedule('Portfolio', 300);       // 5 minutes
    this.registerSchedule('Reflection', 1800);     // 30 minutes
    this.registerSchedule('Evolution', 43200);     // 12 hours
    this.registerSchedule('Research', 86400);      // 24 hours
  }

  registerSchedule(name, intervalSeconds) {
    this.schedules.set(name, {
      name,
      interval_seconds: intervalSeconds,
      last_run: null,
      run_count: 0
    });
  }

  /**
   * Triggers execution of a scheduled task.
   *
   * @param {string} name - Schedule key
   * @returns {Object} Schedule run record
   */
  trigger(name) {
    const sched = this.schedules.get(name);
    if (!sched) throw new Error(`Schedule '${name}' not found`);

    sched.last_run = Date.now();
    sched.run_count++;

    const record = {
      schedule: name,
      run_count: sched.run_count,
      triggered_at: sched.last_run
    };

    this.history.push(record);
    return record;
  }

  getScheduleStatus() {
    return [...this.schedules.values()];
  }
}
