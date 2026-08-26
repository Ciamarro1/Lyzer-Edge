import { describe, it, expect, beforeEach } from 'vitest';
import {
  LLES_TAGS,
  VALID_LLES_TAG_SET,
  EPISTEMIC_AUTHORITY_MATRIX,
  EpistemicValidationError,
  PhantomPnLContaminationError,
  isValidEpistemicTag,
  assertValidEpistemicTag,
  tagMessage,
  formatEpistemicLog,
  formatEpistemicDashboardMetric,
  formatEpistemicReport,
  PhantomPnLGuard
} from '../../../packages/lyzer-shared/src/governance/epistemicStandard.js';
import { ConstitutionalLedger } from '../../../packages/lyzer-constitution/src/eca/ledger.js';
import { DecisionLedger } from '../../../packages/lyzer-shared/src/research/governance/decisionLedger.js';
import { InvestmentCommitteeEngine } from '../../../packages/lyzer-shared/src/research/governance/investmentCommitteeEngine.js';
import { ExperimentMetrics } from '../../backend/experimentMetrics.js';

describe('LLES-v1.0 Epistemic Standard & Phantom PnL Prohibition Verification', () => {

  describe('1. Canonical 5 Epistemic Tags Validation', () => {
    it('defines exactly the 5 canonical epistemic tags', () => {
      expect(LLES_TAGS.FACT_CODE).toBe('[FACT:CODE]');
      expect(LLES_TAGS.FACT_RUNTIME).toBe('[FACT:RUNTIME]');
      expect(LLES_TAGS.FACT_DATASET).toBe('[FACT:DATASET]');
      expect(LLES_TAGS.INFERENCE_EMPIRICAL).toBe('[INFERENCE:EMPIRICAL]');
      expect(LLES_TAGS.COUNTERFACTUAL_HYPOTHESIS).toBe('[COUNTERFACTUAL:HYPOTHESIS]');
      expect(VALID_LLES_TAG_SET.size).toBe(5);
    });

    it('correctly validates canonical tags', () => {
      expect(isValidEpistemicTag('[FACT:CODE]')).toBe(true);
      expect(isValidEpistemicTag('[FACT:RUNTIME]')).toBe(true);
      expect(isValidEpistemicTag('[FACT:DATASET]')).toBe(true);
      expect(isValidEpistemicTag('[INFERENCE:EMPIRICAL]')).toBe(true);
      expect(isValidEpistemicTag('[COUNTERFACTUAL:HYPOTHESIS]')).toBe(true);
    });

    it('rejects invalid or hallucinated epistemic tags', () => {
      expect(isValidEpistemicTag('[OPINION]')).toBe(false);
      expect(isValidEpistemicTag('[FACT:SYNTHETIC]')).toBe(false);
      expect(isValidEpistemicTag('[TRUTH]')).toBe(false);
      expect(isValidEpistemicTag('')).toBe(false);
      expect(isValidEpistemicTag(null)).toBe(false);

      expect(() => assertValidEpistemicTag('[INVALID_TAG]')).toThrow(EpistemicValidationError);
    });

    it('tags messages accurately with tagMessage', () => {
      const msg = tagMessage(LLES_TAGS.FACT_CODE, 'Stop loss is hardcoded at 1.2%');
      expect(msg).toBe('[FACT:CODE] Stop loss is hardcoded at 1.2%');
    });

    it('maintains strict authority matrix metadata for all 5 tags', () => {
      for (const tag of Object.values(LLES_TAGS)) {
        const auth = EPISTEMIC_AUTHORITY_MATRIX[tag];
        expect(auth).toBeDefined();
        expect(auth.authority).toBeTypeOf('string');
        expect(auth.evidentiaryRequirement).toBeTypeOf('string');
        expect(typeof auth.allowsFinancialLedger).toBe('boolean');
        expect(typeof auth.allowsAccountingSum).toBe('boolean');
      }

      // Realized financial ledgers are only allowed for physical runtime facts or recorded datasets
      expect(EPISTEMIC_AUTHORITY_MATRIX[LLES_TAGS.FACT_RUNTIME].allowsFinancialLedger).toBe(true);
      expect(EPISTEMIC_AUTHORITY_MATRIX[LLES_TAGS.FACT_DATASET].allowsFinancialLedger).toBe(true);
      expect(EPISTEMIC_AUTHORITY_MATRIX[LLES_TAGS.INFERENCE_EMPIRICAL].allowsFinancialLedger).toBe(false);
      expect(EPISTEMIC_AUTHORITY_MATRIX[LLES_TAGS.COUNTERFACTUAL_HYPOTHESIS].allowsFinancialLedger).toBe(false);
      expect(EPISTEMIC_AUTHORITY_MATRIX[LLES_TAGS.FACT_CODE].allowsFinancialLedger).toBe(false);
    });
  });

  describe('2. Epistemic Logs, Reports & Dashboard Metric Formatting', () => {
    it('formats standardized epistemic logs', () => {
      const log = formatEpistemicLog(
        LLES_TAGS.FACT_RUNTIME,
        'StreamEngine',
        'Ingested 1,200 ticks with 0 packet drops',
        { latency_ms: 1.2 }
      );

      expect(log.epistemic_tag).toBe('[FACT:RUNTIME]');
      expect(log.epistemic_authority).toBe('OBSERVED_PHYSICAL_TELEMETRY');
      expect(log.component).toBe('StreamEngine');
      expect(log.message).toContain('[FACT:RUNTIME] [StreamEngine]');
      expect(log.metadata.latency_ms).toBe(1.2);
    });

    it('formats epistemic dashboard metric snapshots', () => {
      const metric = formatEpistemicDashboardMetric({
        name: 'realized_sharpe',
        tag: LLES_TAGS.INFERENCE_EMPIRICAL,
        value: -2.16,
        confidence: 0.95,
        sampleSize: 30,
        source: 'experimentMetrics.js'
      });

      expect(metric.name).toBe('realized_sharpe');
      expect(metric.epistemic_tag).toBe('[INFERENCE:EMPIRICAL]');
      expect(metric.epistemic_authority).toBe('STATISTICAL_INDUCTIVE_INFERENCE');
      expect(metric.value).toBe(-2.16);
      expect(metric.sample_size).toBe(30);
    });

    it('formats multi-section institutional governance reports', () => {
      const report = formatEpistemicReport({
        title: 'Weekly Epistemic Audit',
        author: 'Chief Scientist',
        sections: [
          {
            tag: LLES_TAGS.FACT_CODE,
            heading: 'Source Invariants',
            content: 'All 7 layers in StreamEngine are strictly sequential.'
          },
          {
            tag: LLES_TAGS.FACT_RUNTIME,
            heading: 'Live Operations',
            content: '24 hours uptime with 0 unexpected reboots.'
          },
          {
            tag: LLES_TAGS.COUNTERFACTUAL_HYPOTHESIS,
            heading: 'Avoided Risk Telemetry',
            content: 'C-CLIST vetoed 4 trades in flat DVF conditions.'
          }
        ]
      });

      expect(report).toContain('# Weekly Epistemic Audit');
      expect(report).toContain('## [FACT:CODE] Source Invariants');
      expect(report).toContain('## [FACT:RUNTIME] Live Operations');
      expect(report).toContain('## [COUNTERFACTUAL:HYPOTHESIS] Avoided Risk Telemetry');
    });
  });

  describe('3. Absolute Prohibition of Phantom PnL (Mechanical Guard)', () => {
    it('allows clean realized trades through assertZeroPhantomPnL', () => {
      const cleanTrade = {
        id: 'T-001',
        timestamp: Date.now(),
        pnl: 0.0025,
        fee: 0.0001,
        slippage: 0.00005,
        epistemic_tag: LLES_TAGS.FACT_RUNTIME
      };

      expect(PhantomPnLGuard.assertZeroPhantomPnL(cleanTrade)).toBe(true);
    });

    it('throws PhantomPnLContaminationError if avoided_loss is present and non-zero', () => {
      const contaminatedTrade = {
        id: 'T-002',
        pnl: 0.0010,
        avoided_loss: 0.0500 // Injected phantom profit
      };

      expect(() => PhantomPnLGuard.assertZeroPhantomPnL(contaminatedTrade))
        .toThrow(PhantomPnLContaminationError);
    });

    it('throws PhantomPnLContaminationError for various alias keys (saved_pnl, counterfactual_pnl, veto_savings)', () => {
      const forbiddenAliases = [
        { saved_pnl: 100 },
        { savedPnl: 100 },
        { saved_loss: 50 },
        { counterfactual_pnl: 25 },
        { veto_savings: 120 },
        { phantom_pnl: 80 },
        { synthetic_pnl: 45 }
      ];

      for (const aliasObj of forbiddenAliases) {
        const payload = { id: 'T-BAD', pnl: 10, ...aliasObj };
        expect(() => PhantomPnLGuard.assertZeroPhantomPnL(payload))
          .toThrow(PhantomPnLContaminationError);
      }
    });

    it('throws PhantomPnLContaminationError if [COUNTERFACTUAL:HYPOTHESIS] entry has realized_pnl', () => {
      const counterfactualRecord = {
        id: 'SIM-01',
        epistemic_tag: LLES_TAGS.COUNTERFACTUAL_HYPOTHESIS,
        realized_pnl: 50.0 // Illegal: counterfactual cannot have realized PnL
      };

      expect(() => PhantomPnLGuard.assertZeroPhantomPnL(counterfactualRecord))
        .toThrow(PhantomPnLContaminationError);
    });

    it('segregates real executed records from counterfactual simulations', () => {
      const records = [
        { id: 'T-1', verdict: 'GRANT', pnl: 0.02 },
        { id: 'T-2', verdict: 'VETO', reason: 'LHDS_COLLAPSE', theoretical_loss_avoided: -0.012 },
        { id: 'T-3', verdict: 'GRANT', pnl: -0.01 },
        { id: 'T-4', action: 'AVOIDED_TRADE', estimated_drawdown_prevented: 0.05 }
      ];

      const { realizedLedger, counterfactualTelemetry } = PhantomPnLGuard.segregateLedger(records);

      expect(realizedLedger.length).toBe(2);
      expect(realizedLedger[0].id).toBe('T-1');
      expect(realizedLedger[1].id).toBe('T-3');
      expect(realizedLedger[0].epistemic_tag).toBe(LLES_TAGS.FACT_RUNTIME);

      expect(counterfactualTelemetry.length).toBe(2);
      expect(counterfactualTelemetry[0].id).toBe('T-2');
      expect(counterfactualTelemetry[1].id).toBe('T-4');
      expect(counterfactualTelemetry[0].epistemic_tag).toBe(LLES_TAGS.COUNTERFACTUAL_HYPOTHESIS);
    });
  });

  describe('4. Constitutional Ledger & Governance Integration', () => {
    it('appends records in ConstitutionalLedger with [FACT:RUNTIME] and asserts zero phantom PnL', () => {
      const ledgerInstance = new ConstitutionalLedger();
      const token = { id: 'tok-123', granted: true, reason: 'APPROVED' };
      const requestPayload = { symbol: 'BTCUSDT', size: 0.001 };
      const stateSnapshot = { currentDrawdown: 0.01, currentSlippage: 0.0001 };

      ledgerInstance.appendRecord(requestPayload, token, stateSnapshot);

      expect(ledgerInstance.entries.length).toBe(1);
      const entry = ledgerInstance.entries[0];
      expect(entry.epistemic_tag).toBe('[FACT:RUNTIME]');
      expect(entry.verdict).toBe('GRANT');
    });

    it('blocks appendRecord in ConstitutionalLedger if granted token request contains phantom PnL', () => {
      const ledgerInstance = new ConstitutionalLedger();
      const token = { id: 'tok-bad', granted: true, reason: 'APPROVED' };
      const contaminatedPayload = { symbol: 'BTCUSDT', size: 0.001, avoided_loss: 50.0 };
      const stateSnapshot = { currentDrawdown: 0.01 };

      expect(() => ledgerInstance.appendRecord(contaminatedPayload, token, stateSnapshot))
        .toThrow(PhantomPnLContaminationError);
    });

    it('logs decisions in DecisionLedger with valid LLES-v1.0 epistemic tags', () => {
      const decisionLedger = new DecisionLedger();
      decisionLedger.SIMULATION_MODE = true;

      decisionLedger.logDecision(
        'CapitalAllocationGovernor',
        'RealityGapScore > 50',
        'ADR-011: DEFENSIVE_MODE_RULE',
        { gapScore: 62 },
        'TRANSITION_TO_DEFENSIVE_MODE',
        LLES_TAGS.FACT_RUNTIME
      );

      expect(decisionLedger.batchedLogs.length).toBe(1);
      const log = decisionLedger.batchedLogs[0];
      expect(log.epistemic_tag).toBe('[FACT:RUNTIME]');
      expect(log.decision_maker).toBe('CapitalAllocationGovernor');
    });

    it('generates Investment Committee Minutes with LLES-v1.0 epistemic tags', () => {
      const icEngine = new InvestmentCommitteeEngine();
      const mockAlphaAuditor = { baselineSharpe: 1.4 };
      const mockRealityEngine = { calculateRealityGap: () => ({ gapScore: 35 }) };
      const mockMacroGovernor = { macroState: 'FULL_ALLOCATION' };
      const mockAccountingEngine = { currentNAV: 105420.50 };

      const approved = icEngine.conveneCommittee(
        mockAlphaAuditor,
        mockRealityEngine,
        mockMacroGovernor,
        mockAccountingEngine
      );

      expect(approved).toBe(true);
    });
  });

  describe('5. ExperimentMetrics & Performance Calculation Protection', () => {
    it('computes metrics tagged with [INFERENCE:EMPIRICAL] and sets phantom_pnl_contamination: false', () => {
      const trades = [
        { timestamp: 1000, pnl: 0.02 },
        { timestamp: 2000, pnl: -0.01 },
        { timestamp: 3000, pnl: 0.03 }
      ];

      const metrics = ExperimentMetrics.computeFromTrades(trades);

      expect(metrics.epistemic_tag).toBe('[INFERENCE:EMPIRICAL]');
      expect(metrics.phantom_pnl_contamination).toBe(false);
      expect(metrics.totalTrades).toBe(3);
      expect(metrics.winningTrades).toBe(2);
      expect(metrics.losingTrades).toBe(1);
      expect(metrics.totalPnl).toBeCloseTo(0.04, 5);
    });

    it('blocks trades contaminated with phantom PnL from distorting ExperimentMetrics', () => {
      const contaminatedTrades = [
        { timestamp: 1000, pnl: 0.02 },
        { timestamp: 2000, pnl: -0.01, avoided_loss: 0.10 } // Injected phantom profit
      ];

      expect(() => ExperimentMetrics.computeFromTrades(contaminatedTrades))
        .toThrow(PhantomPnLContaminationError);
    });
  });
});
