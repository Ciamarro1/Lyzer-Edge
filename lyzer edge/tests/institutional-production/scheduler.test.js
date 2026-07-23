import { describe, test, expect } from 'vitest';
import { CognitiveScheduler } from '../../src/institutional-production/CognitiveScheduler.js';

describe('Fase 14 — CognitiveScheduler Verification', () => {
  test('registers multi-cadence schedules and triggers tasks', () => {
    const scheduler = new CognitiveScheduler();

    const statusList = scheduler.getScheduleStatus();
    expect(statusList.length).toBe(5);

    const runRecord = scheduler.trigger('Portfolio');
    expect(runRecord.schedule).toBe('Portfolio');
    expect(runRecord.run_count).toBe(1);
    expect(runRecord.triggered_at).toBeGreaterThan(0);
  });
});
