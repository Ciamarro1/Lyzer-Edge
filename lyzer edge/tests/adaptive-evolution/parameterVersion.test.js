import { describe, test, expect } from 'vitest';
import { ParameterVersionManager } from '../../src/adaptive-evolution/ParameterVersionManager.js';

describe('Fase 7.3.2 — ParameterVersionManager Verification', () => {
  test('creates cognitive snapshots and computes diff', () => {
    const mgr = new ParameterVersionManager();

    mgr.createSnapshot('v1.0.0', {
      'TruthKernel.LHDS_VETO_LIMIT': 0.90,
      'CSRL.CONSENSUS_LIMIT': 0.40,
      'ExecutionTrigger.TRG_THRESHOLD': 0.45
    });

    mgr.createSnapshot('v1.1.0', {
      'TruthKernel.LHDS_VETO_LIMIT': 0.85,
      'CSRL.CONSENSUS_LIMIT': 0.40,
      'ExecutionTrigger.TRG_THRESHOLD': 0.45
    });

    const d = mgr.diff('v1.0.0', 'v1.1.0');
    expect(d.changes_count).toBe(1);
    expect(d.unchanged_count).toBe(2);
    expect(d.changes[0].parameter).toBe('TruthKernel.LHDS_VETO_LIMIT');
    expect(d.changes[0].from).toBe(0.90);
    expect(d.changes[0].to).toBe(0.85);
    expect(d.changes[0].delta_pct).toBeCloseTo(-5.56, 1);
  });

  test('records lineage between versions', () => {
    const mgr = new ParameterVersionManager();

    mgr.createSnapshot('v1.0.0', { 'LHDS': 0.90 });
    mgr.createSnapshot('v1.1.0', { 'LHDS': 0.85 });
    mgr.recordLineage('v1.0.0', 'v1.1.0', 'COUNTERFACTUAL_IMPROVEMENT');

    const lineage = mgr.getLineage();
    expect(lineage.length).toBe(1);
    expect(lineage[0].from).toBe('v1.0.0');
    expect(lineage[0].to).toBe('v1.1.0');
  });

  test('detects ADDED and REMOVED parameters in diff', () => {
    const mgr = new ParameterVersionManager();

    mgr.createSnapshot('v1.0.0', { 'LHDS': 0.90, 'OLD_PARAM': 1.0 });
    mgr.createSnapshot('v1.1.0', { 'LHDS': 0.85, 'NEW_PARAM': 2.0 });

    const d = mgr.diff('v1.0.0', 'v1.1.0');
    expect(d.changes.some(c => c.type === 'ADDED' && c.parameter === 'NEW_PARAM')).toBe(true);
    expect(d.changes.some(c => c.type === 'REMOVED' && c.parameter === 'OLD_PARAM')).toBe(true);
  });
});
