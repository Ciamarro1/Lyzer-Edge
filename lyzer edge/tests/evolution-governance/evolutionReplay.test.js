import { describe, test, expect } from 'vitest';
import { EvolutionReplayEngine } from '../../src/evolution-governance/EvolutionReplayEngine.js';

describe('Fase 7.4 — EvolutionReplayEngine Verification', () => {
  test('reconstructs historical parameter state deterministically from ledger entries', async () => {
    const replayEngine = new EvolutionReplayEngine();

    const mockEntries = [
      {
        ledger_id: 'evo_001',
        event_type: 'PROMOTION',
        module: 'TruthKernel',
        parameter: 'LHDS_VETO_LIMIT',
        from_value: 0.90,
        to_value: 0.85,
        created_at: 1000
      },
      {
        ledger_id: 'evo_002',
        event_type: 'PROMOTION',
        module: 'CSRL',
        parameter: 'CONSENSUS_LIMIT',
        from_value: 0.40,
        to_value: 0.35,
        created_at: 2000
      },
      {
        ledger_id: 'evo_003',
        event_type: 'ROLLBACK',
        module: 'CSRL',
        parameter: 'CONSENSUS_LIMIT',
        from_value: 0.35,
        to_value: 0.40,
        reason: 'DRAWDOWN_EXCEEDED',
        created_at: 3000
      }
    ];

    const result = await replayEngine.replay({
      entries: mockEntries,
      initialParameters: {
        'TruthKernel.LHDS_VETO_LIMIT': 0.90,
        'CSRL.CONSENSUS_LIMIT': 0.40
      }
    });

    expect(result.integrity_verified).toBe(true);
    expect(result.total_steps_replayed).toBe(3);
    expect(result.reconstructed_parameters['TruthKernel.LHDS_VETO_LIMIT']).toBe(0.85);
    expect(result.reconstructed_parameters['CSRL.CONSENSUS_LIMIT']).toBe(0.40);
  });

  test('respects targetTimestamp cutoff during replay', async () => {
    const replayEngine = new EvolutionReplayEngine();

    const mockEntries = [
      { ledger_id: 'evo_1', event_type: 'PROMOTION', module: 'TK', parameter: 'LHDS', from_value: 0.9, to_value: 0.85, created_at: 1000 },
      { ledger_id: 'evo_2', event_type: 'PROMOTION', module: 'TK', parameter: 'LHDS', from_value: 0.85, to_value: 0.80, created_at: 5000 }
    ];

    const result = await replayEngine.replay({
      entries: mockEntries,
      targetTimestamp: 3000,
      initialParameters: { 'TK.LHDS': 0.9 }
    });

    expect(result.total_steps_replayed).toBe(1);
    expect(result.reconstructed_parameters['TK.LHDS']).toBe(0.85);
  });
});
