import { describe, test, expect } from 'vitest';
import { CognitiveTelemetryAggregator } from '../../src/cognitive-operations/CognitiveTelemetryAggregator.js';

describe('Fase 12 — CognitiveTelemetryAggregator Verification', () => {
  test('aggregates 6 cognitive scores and calculates GCHI in HEALTHY zone', () => {
    const aggregator = new CognitiveTelemetryAggregator();

    const report = aggregator.aggregate({
      ccs: 100.0,
      ces: 92.0,
      ehs: 95.0,
      ars: 15.0,
      cas: 88.0,
      mas: 90.0
    });

    expect(report.gchi).toBeGreaterThanOrEqual(90.0);
    expect(report.system_status).toBe('HEALTHY');
    expect(report.is_operational).toBe(true);
    expect(report.scores_snapshot.ars_adaptive_risk).toBe(15.0);
  });

  test('triggers CRITICAL_RISK when ARS exceeds 80 or GCHI drops below 60', () => {
    const aggregator = new CognitiveTelemetryAggregator();

    const report = aggregator.aggregate({
      ccs: 50.0,
      ces: 40.0,
      ehs: 50.0,
      ars: 85.0, // high risk
      cas: 40.0,
      mas: 40.0
    });

    expect(report.gchi).toBeLessThan(60.0);
    expect(report.system_status).toBe('CRITICAL_RISK');
    expect(report.is_operational).toBe(false);
  });
});
