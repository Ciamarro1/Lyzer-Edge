/**
 * @fileoverview P0 Regression Test Suite: Sovereign Veto Gate & Triple Gate Architecture
 *
 * Objectives:
 * 1. Triple Gate validation (Portão 1: Pre-flight, Portão 2: Constitutional Court, Portão 3: Execution Adapter).
 * 2. 100% rejection under VETO, RECOVERY, UNKNOWN states.
 * 3. 100% rejection for calls without HMAC token, tampered token, or rogue signature.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { ConstitutionalCourt } from '../../../packages/lyzer-constitution/src/eca/court.js';
import { PermissionToken, verifyToken, getCourtSecret } from '../../../packages/lyzer-constitution/src/eca/permission.js';

// Mock observability to prevent side-effects
vi.mock('../../src/observability/index.js', () => {
  const dummy = () => {};
  return {
    register: { contentType: 'text/plain', metrics: async () => '' },
    recordTickReceived: dummy,
    recordTickDuration: dummy,
    recordCsrlDuration: dummy,
    recordCclistEvaluation: dummy,
    recordEcaEvaluation: dummy,
    recordSystemError: dummy,
    recordSignalGenerated: dummy,
    recordKernelEvaluated: dummy,
    recordBreakEvenTrade: dummy,
    recordRiskGatewayLatency: dummy,
    recordDailyCapitalUsage: dummy,
    recordPositionOpened: dummy,
    recordPositionClosed: dummy,
    recordSqliteLockWait: dummy,
    recordSqliteWrite: dummy,
  };
});

/**
 * Institutional Execution Adapter Gate (Portão 3)
 * Simulates strict cryptographic validation before forwarding orders to exchange.
 */
export function sovereignAdapterAuthorize(permissionToken, orderPayload, secretKey = getCourtSecret()) {
  // Gate 3.1: Token Existence
  if (!permissionToken) {
    throw new Error('[ADAPTER_GATE_VETO] Missing permission token. Zero-trust execution strictly requires HMAC token.');
  }

  // Gate 3.2: Cryptographic Signature & Tamper Check
  const isValidSig = verifyToken(permissionToken, secretKey);
  if (!isValidSig) {
    throw new Error('[ADAPTER_GATE_VETO] Invalid or tampered HMAC signature on PermissionToken.');
  }

  // Gate 3.3: Constitutional Grant Check
  if (permissionToken.granted !== true) {
    throw new Error(`[ADAPTER_GATE_VETO] Execution rejected: Token not granted. Reason: ${permissionToken.reason}`);
  }

  // Gate 3.4: Action Compatibility
  if (permissionToken.action !== 'EXECUTE_TRADE') {
    throw new Error(`[ADAPTER_GATE_VETO] Incompatible action: ${permissionToken.action}`);
  }

  return { authorized: true, orderId: permissionToken.id, timestamp: permissionToken.timestamp };
}

/**
 * Institutional Pre-Flight Gate (Portão 1)
 */
export function sovereignPreFlightCheck(kernelResult, riskGatewayResult = { approved: true }) {
  if (!kernelResult) {
    return { approved: false, reason: 'PREFLIGHT_NO_KERNEL_DATA' };
  }

  // Epistemic authority VETO
  if (kernelResult.epistemic_authority === 'VETO') {
    return { approved: false, reason: kernelResult.reason_codes?.[0] || 'VETO_EPISTEMIC_AUTHORITY' };
  }

  // Execution Enable Flag false
  if (kernelResult.eef === false) {
    return { approved: false, reason: 'VETO_EEF_DISABLED' };
  }

  // Risk Gateway check
  if (!riskGatewayResult.approved) {
    return { approved: false, reason: riskGatewayResult.rejectionReason || 'VETO_RISK_GATEWAY' };
  }

  // LHDS / TRG bounds check
  if ((kernelResult.lhds || 0) > 0.8) {
    return { approved: false, reason: 'VETO_LHDS_LIMIT_EXCEEDED' };
  }

  return { approved: true, reason: 'PREFLIGHT_OK' };
}

describe('P0 Test Suite: Sovereign Veto Gate (Triple Gate Architecture)', () => {
  const SECRET = 'sovereign-court-master-key-2026';

  beforeEach(() => {
    process.env.COURT_SECRET_KEY = SECRET;
  });

  afterEach(() => {
    delete process.env.COURT_SECRET_KEY;
  });

  // -------------------------------------------------------------------------
  // Portão 1: Pre-Flight Gate Verification
  // -------------------------------------------------------------------------
  describe('1. Portão 1: Pre-Flight Gate', () => {
    test('100% Rejection when epistemic_authority is VETO', () => {
      const kernelResult = {
        eef: true,
        epistemic_authority: 'VETO',
        reason_codes: ['VETO_ONTOLOGICAL_COLLAPSE']
      };
      const res = sovereignPreFlightCheck(kernelResult);
      expect(res.approved).toBe(false);
      expect(res.reason).toBe('VETO_ONTOLOGICAL_COLLAPSE');
    });

    test('100% Rejection when eef is false', () => {
      const kernelResult = {
        eef: false,
        epistemic_authority: 'OBSERVED',
        reason_codes: ['TRG_DEFICIT']
      };
      const res = sovereignPreFlightCheck(kernelResult);
      expect(res.approved).toBe(false);
      expect(res.reason).toBe('VETO_EEF_DISABLED');
    });

    test('100% Rejection when RiskGateway fails or rejects', () => {
      const kernelResult = { eef: true, epistemic_authority: 'OBSERVED' };
      const riskGatewayResult = { approved: false, rejectionReason: 'RISK_CAPITAL_EXCEEDED' };
      const res = sovereignPreFlightCheck(kernelResult, riskGatewayResult);
      expect(res.approved).toBe(false);
      expect(res.reason).toBe('RISK_CAPITAL_EXCEEDED');
    });

    test('Passes pre-flight when all quantitative conditions are strictly met', () => {
      const kernelResult = { eef: true, epistemic_authority: 'OBSERVED', lhds: 0.1 };
      const res = sovereignPreFlightCheck(kernelResult);
      expect(res.approved).toBe(true);
      expect(res.reason).toBe('PREFLIGHT_OK');
    });
  });

  // -------------------------------------------------------------------------
  // Portão 2: Constitutional Court Gate
  // -------------------------------------------------------------------------
  describe('2. Portão 2: Constitutional Court Gate', () => {
    function createCourt() {
      return new ConstitutionalCourt({}, { sclThreshold: 3, minCooldown: 3 });
    }

    test('100% Rejection under epistemic_authority = "VETO" -> token.granted is false with valid HMAC', () => {
      const court = createCourt();
      const kernelResult = {
        eef: false,
        epistemic_authority: 'VETO',
        reason_codes: ['VETO_REALITY_DIVERGENCE'],
        raw_metrics: { scale_divergence: 0.85 }
      };

      const token = court.requestPermission('EXECUTE_TRADE', kernelResult, { eef: false, reason: 'VETO_REALITY_DIVERGENCE' });

      expect(court.mol.state).toBe('VETO');
      expect(token.granted).toBe(false);
      expect(token.reason).toBe('VETO_REALITY_DIVERGENCE');
      expect(token.signature).toBeDefined();
      expect(verifyToken(token, SECRET)).toBe(true);
    });

    test('100% Rejection under MOL state = "RECOVERY" -> token.granted is false (VETO_MOL_RECOVERY_PENDING)', () => {
      const court = createCourt();
      // First trigger VETO to transition into RECOVERY
      court.requestPermission('EXECUTE_TRADE', { scale_divergence: 0.9 }, { eef: false, epistemic_authority: 'VETO', reason_codes: ['VETO_INIT'] });
      expect(court.mol.state).toBe('VETO');

      // Now send an OBSERVED tick during recovery
      const recoveryToken = court.requestPermission(
        'EXECUTE_TRADE',
        { trg: 0.3, dvf: 0, scale_divergence: 0.05, eef: true, epistemic_authority: 'OBSERVED', reason_codes: ['OK'] },
        { eef: true, reason: 'OK' }
      );

      expect(court.mol.state).toBe('RECOVERY');
      expect(recoveryToken.granted).toBe(false);
      expect(recoveryToken.reason).toBe('VETO_MOL_RECOVERY_PENDING');
      expect(verifyToken(recoveryToken, SECRET)).toBe(true);
    });

    test('100% Rejection under epistemic_authority = "UNKNOWN" or unhandled state', () => {
      const court = createCourt();
      const token = court.requestPermission(
        'EXECUTE_TRADE',
        { trg: 0.3, epistemic_authority: 'UNKNOWN' },
        { eef: false, epistemic_authority: 'UNKNOWN', reason_codes: ['UNKNOWN_EPISTEMIC_STATE'] }
      );

      expect(token.granted).toBe(false);
      expect(verifyToken(token, SECRET)).toBe(true);
    });

    test('Throws fail-closed error if COURT_SECRET_KEY is missing during token creation', () => {
      delete process.env.COURT_SECRET_KEY;
      expect(() => {
        new PermissionToken('EXECUTE_TRADE', true, 'TEST');
      }).toThrow(/COURT_SECRET_KEY environment variable is required/);
    });

    test('Grants permission only under validated OBSERVED state with intact structural coherence', () => {
      const court = createCourt();
      const rawState = { trg: 0.5, dvf: 0.05, scale_divergence: 0.02, epistemic_authority: 'OBSERVED', reason_codes: ['OK'] };
      const token = court.requestPermission('EXECUTE_TRADE', rawState, { eef: true, reason: 'OK' });

      expect(token.granted).toBe(true);
      expect(token.action).toBe('EXECUTE_TRADE');
      expect(verifyToken(token, SECRET)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Portão 3: Execution Adapter Gate (Zero-Trust & HMAC Enforcement)
  // -------------------------------------------------------------------------
  describe('3. Portão 3: Execution Adapter Gate & HMAC Verification', () => {
    test('100% Rejection if called without a PermissionToken (null or undefined)', () => {
      expect(() => sovereignAdapterAuthorize(null, { symbol: 'BTCUSDT', qty: 0.1 })).toThrow(/Missing permission token/);
      expect(() => sovereignAdapterAuthorize(undefined, { symbol: 'BTCUSDT', qty: 0.1 })).toThrow(/Missing permission token/);
    });

    test('100% Rejection if token.granted is false', () => {
      const rejectedToken = new PermissionToken('EXECUTE_TRADE', false, 'VETO_CONFIDENCE_ARROGANCE', {}, SECRET);
      expect(() => sovereignAdapterAuthorize(rejectedToken, { symbol: 'BTCUSDT', qty: 0.1 }, SECRET)).toThrow(/Execution rejected: Token not granted/);
    });

    test('100% Rejection if token payload was tampered with (e.g. changing granted false -> true)', () => {
      const rejectedToken = new PermissionToken('EXECUTE_TRADE', false, 'VETO_TEST', {}, SECRET);
      
      // Attacker attempts to forge grant
      const tamperedToken = {
        ...rejectedToken,
        granted: true // Forgery attempt
      };

      expect(() => sovereignAdapterAuthorize(tamperedToken, { symbol: 'BTCUSDT', qty: 0.1 }, SECRET)).toThrow(/Invalid or tampered HMAC signature/);
    });

    test('100% Rejection if token is signed with a rogue/wrong secret key', () => {
      const rogueSecret = 'rogue-attacker-secret-key';
      const forgedToken = new PermissionToken('EXECUTE_TRADE', true, 'FORGED_ALLOW', {}, rogueSecret);

      expect(() => sovereignAdapterAuthorize(forgedToken, { symbol: 'BTCUSDT', qty: 0.1 }, SECRET)).toThrow(/Invalid or tampered HMAC signature/);
    });

    test('100% Rejection if token timestamp or id is modified', () => {
      const validToken = new PermissionToken('EXECUTE_TRADE', true, 'ALLOW', {}, SECRET);
      
      const modifiedTimestampToken = {
        ...validToken,
        timestamp: validToken.timestamp + 5000
      };
      expect(() => sovereignAdapterAuthorize(modifiedTimestampToken, { symbol: 'BTCUSDT', qty: 0.1 }, SECRET)).toThrow(/Invalid or tampered HMAC signature/);

      const modifiedIdToken = {
        ...validToken,
        id: '00000000-0000-7000-8000-000000000000'
      };
      expect(() => sovereignAdapterAuthorize(modifiedIdToken, { symbol: 'BTCUSDT', qty: 0.1 }, SECRET)).toThrow(/Invalid or tampered HMAC signature/);
    });

    test('Full End-to-End Triple Gate: Passes and authorizes execution ONLY when all 3 gates succeed', () => {
      // 1. Pre-Flight Gate
      const kernelResult = { eef: true, epistemic_authority: 'OBSERVED', lhds: 0.1, trg: 0.6 };
      const preFlight = sovereignPreFlightCheck(kernelResult, { approved: true });
      expect(preFlight.approved).toBe(true);

      // 2. Constitutional Court Gate
      const court = new ConstitutionalCourt();
      const token = court.requestPermission('EXECUTE_TRADE', kernelResult, { eef: true, reason: 'OK' });
      expect(token.granted).toBe(true);

      // 3. Adapter Gate
      const authResult = sovereignAdapterAuthorize(token, { symbol: 'BTCUSDT', qty: 0.05 }, SECRET);
      expect(authResult.authorized).toBe(true);
      expect(authResult.orderId).toBe(token.id);
    });
  });
});
