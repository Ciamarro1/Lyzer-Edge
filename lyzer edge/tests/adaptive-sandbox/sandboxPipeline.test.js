import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { AdaptiveSandboxFacade } from '../../src/adaptive-sandbox/index.js';

describe('Fase 7.0 — Adaptive Sandbox Full Pipeline Verification', () => {
  test('executes end-to-end sandbox proposal, shadow comparison, ACS scoring, and parameter versioning', async () => {
    const dbPath = `/tmp/data/test_sandbox_pipeline_${Date.now()}_${Math.floor(Math.random() * 1000)}.db`;
    const db = new CausalMemoryDB(dbPath);
    const sandbox = new AdaptiveSandboxFacade(db);
    const ver = `v1.2.${Math.floor(Math.random() * 1000)}`;

    // 1. Create Proposal
    const proposal = sandbox.createProposal({
      module: 'CSRL',
      parameter: 'LHDS_THRESHOLD',
      currentValue: 0.90,
      proposedValue: 0.85
    });

    expect(proposal.status).toBe('PENDING_SANDBOX');

    // 2. Run Shadow Comparison
    const comparison = await sandbox.runShadowComparison({
      proposal,
      realDecision: 'ALLOW',
      candle: { open: 50000, close: 50500 }
    });

    expect(comparison.event_type).toBe('SHADOW_COMPARISON_EVENT');

    // 3. Calculate ACS Score
    const acs = sandbox.calculateACS({
      historicalStability: 0.98,
      riskRewardGain: 0.97,
      multiRegimeConsistency: 0.96,
      absenceOfConflicts: 0.98,
      recencyScore: 0.95
    });

    expect(acs.is_eligible_for_eca).toBe(true);

    // 4. Save Version
    const versionRecord = await sandbox.saveParameterVersion({
      module: 'CSRL',
      parameter: 'LHDS_THRESHOLD',
      version: ver,
      value: proposal.proposed_value,
      proposalId: proposal.proposal_id
    });

    expect(versionRecord.version).toBe(ver);

    db.close();
  });
});
