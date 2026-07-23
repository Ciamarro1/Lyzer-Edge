import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { ParameterVersionStore } from '../../src/adaptive-sandbox/ParameterVersionStore.js';

describe('Fase 7.0.4 — ParameterVersionStore Verification', () => {
  test('stores parameter versions and executes proactive rollback', async () => {
    const dbPath = `/tmp/data/test_version_store_${Date.now()}_${Math.floor(Math.random() * 1000)}.db`;
    const db = new CausalMemoryDB(dbPath);
    const store = new ParameterVersionStore(db);
    const ver = `v1.1.${Math.floor(Math.random() * 1000)}`;

    // Save version
    await store.saveVersion({
      module: 'CSRL',
      parameter: 'LHDS_THRESHOLD',
      version: ver,
      value: 0.85,
      proposalId: 'prop_ver_1'
    });

    const active = await store.getActiveVersion('CSRL', 'LHDS_THRESHOLD');
    expect(active.version).toBe(ver);
    expect(active.value).toBe(0.85);

    // Rollback
    const rollbackResult = await store.rollback(ver, 'DRAWDOWN_THRESHOLD_EXCEEDED');
    expect(rollbackResult.status).toBe('ROLLED_BACK');
    expect(rollbackResult.reason).toBe('DRAWDOWN_THRESHOLD_EXCEEDED');

    db.close();
  });
});
