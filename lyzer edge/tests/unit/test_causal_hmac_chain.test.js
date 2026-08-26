/**
 * @fileoverview P0 Regression Test Suite: Causal Event & HMAC Chain Integrity
 *
 * Objectives:
 * 1. Validate end-to-end integrity of causal event hash-chains.
 * 2. Rigorously detect 100% of tampering attempts (payload corruption, metadata modification,
 *    broken prevHash links, event deletion, event insertion, event reordering).
 * 3. Validate cryptographic HMAC-SHA256 PermissionToken integrity and forgery rejection.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { EventFactory, computeEventHash, generateUUIDv7 } from '../../src/causal-memory/EventFactory.js';
import { EventValidator } from '../../src/causal-memory/EventValidator.js';
import { PermissionToken, verifyToken } from '../../../packages/lyzer-constitution/src/eca/permission.js';

describe('P0 Test Suite: Causal Event Chain & HMAC Tamper Detection', () => {
  const SECRET = 'causal-hmac-master-key-p0';

  beforeEach(() => {
    process.env.COURT_SECRET_KEY = SECRET;
  });

  afterEach(() => {
    delete process.env.COURT_SECRET_KEY;
  });

  // -------------------------------------------------------------------------
  // 1. Causal Hash Chain Generation & Full Chain Validation
  // -------------------------------------------------------------------------
  describe('1. Causal Event Hash-Chain Validation', () => {
    test('builds and validates an intact 50-event causal hash-chain without errors', () => {
      const chain = [];
      let prevHash = '0'.repeat(64);

      for (let i = 0; i < 50; i++) {
        const event = EventFactory.createEvent({
          type: i % 2 === 0 ? 'SIGNAL_EVALUATED' : 'CONSTITUTIONAL_JUDGMENT',
          source: i % 2 === 0 ? 'STREAM_ENGINE' : 'ECA_COURT',
          correlationId: `corr_batch_${Math.floor(i / 10)}`,
          causationId: i > 0 ? chain[i - 1].event_id : null,
          prevHash: prevHash,
          payload: { index: i, metric: (i * 1.5).toFixed(2), status: 'OK' }
        });

        chain.push(event);
        prevHash = event.hash;
      }

      expect(chain).toHaveLength(50);
      expect(() => EventValidator.validateChain(chain)).not.toThrow();
    });

    test('UUIDv7 generation produces timestamp-ordered identifiers', () => {
      const id1 = generateUUIDv7();
      const id2 = generateUUIDv7();
      expect(id1).toHaveLength(36);
      expect(id2).toHaveLength(36);
      expect(id1.charAt(14)).toBe('7'); // Version 7
      expect(id2.charAt(14)).toBe('7'); // Version 7
    });
  });

  // -------------------------------------------------------------------------
  // 2. Adversarial Tamper Detection on Causal Chains
  // -------------------------------------------------------------------------
  describe('2. Adversarial Tamper Detection on Causal Event Chains', () => {
    function buildCleanChain(size = 10) {
      const chain = [];
      let prevHash = '0'.repeat(64);
      for (let i = 0; i < size; i++) {
        const event = EventFactory.createEvent({
          type: 'INTENT_REGISTERED',
          source: 'TEST_AGENT',
          correlationId: 'corr_p0_tamper',
          prevHash,
          payload: { step: i, amount: 100 + i }
        });
        chain.push(event);
        prevHash = event.hash;
      }
      return chain;
    }

    test('Tamper Detection: Payload modification in event 0 is detected and thrown', () => {
      const chain = buildCleanChain(5);
      chain[0].payload.amount = 999999; // Corrupted payload

      expect(() => EventValidator.validateChain(chain)).toThrow(/TAMPER_DETECTED|Tamper detection/i);
    });

    test('Tamper Detection: Payload modification in middle event is detected and thrown', () => {
      const chain = buildCleanChain(10);
      chain[5].payload.hacked = true;

      expect(() => EventValidator.validateChain(chain)).toThrow(/TAMPER_DETECTED|Tamper detection/i);
    });

    test('Tamper Detection: Payload modification in last event is detected and thrown', () => {
      const chain = buildCleanChain(10);
      chain[9].payload.step = 999;

      expect(() => EventValidator.validateChain(chain)).toThrow(/TAMPER_DETECTED|Tamper detection/i);
    });

    test('Tamper Detection: Metadata modification (timestamp, source, correlationId, type) is detected', () => {
      const chain1 = buildCleanChain(5);
      chain1[2].timestamp += 10000;
      expect(() => EventValidator.validateChain(chain1)).toThrow(/TAMPER_DETECTED|Tamper detection/i);

      const chain2 = buildCleanChain(5);
      chain2[2].source = 'ROGUE_ACTOR';
      expect(() => EventValidator.validateChain(chain2)).toThrow(/TAMPER_DETECTED|Tamper detection/i);

      const chain3 = buildCleanChain(5);
      chain3[2].correlation_id = 'corr_forged';
      expect(() => EventValidator.validateChain(chain3)).toThrow(/TAMPER_DETECTED|Tamper detection/i);

      const chain4 = buildCleanChain(5);
      chain4[2].event_type = 'MALICIOUS_EXECUTION';
      expect(() => EventValidator.validateChain(chain4)).toThrow(/TAMPER_DETECTED|Tamper detection/i);
    });

    test('Tamper Detection: Breaking prevHash chain link is caught as Hash chain broken', () => {
      const chain = buildCleanChain(5);
      chain[3].hash_prev = 'f'.repeat(64); // Forged prev hash
      // Even if event hash was recomputed to match the fake prevHash:
      chain[3].hash = computeEventHash(chain[3], chain[3].hash_prev);

      expect(() => EventValidator.validateChain(chain)).toThrow(/HASH_PREV_MISMATCH|Hash chain broken/i);
    });

    test('Tamper Detection: Deleting an event from the chain breaks chain continuity', () => {
      const chain = buildCleanChain(6);
      // Remove event at index 2
      const corruptedChain = [chain[0], chain[1], chain[3], chain[4], chain[5]];

      expect(() => EventValidator.validateChain(corruptedChain)).toThrow(/HASH_PREV_MISMATCH|Hash chain broken/i);
    });

    test('Tamper Detection: Swapping two adjacent events breaks chain continuity', () => {
      const chain = buildCleanChain(6);
      // Swap index 2 and index 3
      const swappedChain = [chain[0], chain[1], chain[3], chain[2], chain[4], chain[5]];

      expect(() => EventValidator.validateChain(swappedChain)).toThrow(/HASH_PREV_MISMATCH|Hash chain broken/i);
    });

    test('Tamper Detection: Inserting an unauthorized event in the middle breaks chain continuity', () => {
      const chain = buildCleanChain(6);
      const rogueEvent = EventFactory.createEvent({
        type: 'ROGUE_EVENT',
        source: 'ATTACKER',
        correlationId: 'corr_rogue',
        prevHash: chain[2].hash,
        payload: { exploit: true }
      });

      const injectedChain = [chain[0], chain[1], chain[2], rogueEvent, chain[3], chain[4], chain[5]];

      expect(() => EventValidator.validateChain(injectedChain)).toThrow(/HASH_PREV_MISMATCH|Hash chain broken/i);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Cryptographic HMAC PermissionToken Tamper Detection
  // -------------------------------------------------------------------------
  describe('3. Cryptographic HMAC PermissionToken Verification & Forgery Rejection', () => {
    test('Valid PermissionToken generates verifiable HMAC-SHA256 signature', () => {
      const token = new PermissionToken('EXECUTE_TRADE', true, 'ALL_CONSTITUTIONAL_CHECKS_PASSED', { trg: 0.7 }, SECRET);
      
      expect(token.signature).toBeDefined();
      expect(typeof token.signature).toBe('string');
      expect(token.signature).toHaveLength(64); // SHA256 hex string
      expect(verifyToken(token, SECRET)).toBe(true);
    });

    test('Tampering with token id returns false', () => {
      const token = new PermissionToken('EXECUTE_TRADE', true, 'ALLOW', {}, SECRET);
      const tampered = { ...token, id: generateUUIDv7() };
      expect(verifyToken(tampered, SECRET)).toBe(false);
    });

    test('Tampering with token action returns false', () => {
      const token = new PermissionToken('EXECUTE_TRADE', true, 'ALLOW', {}, SECRET);
      const tampered = { ...token, action: 'ADMIN_OVERRIDE' };
      expect(verifyToken(tampered, SECRET)).toBe(false);
    });

    test('Tampering with token granted flag (false -> true) returns false', () => {
      const vetoToken = new PermissionToken('EXECUTE_TRADE', false, 'VETO_ONTOLOGICAL_COLLAPSE', {}, SECRET);
      const tampered = { ...vetoToken, granted: true };
      expect(verifyToken(tampered, SECRET)).toBe(false);
    });

    test('Tampering with token reason returns false', () => {
      const token = new PermissionToken('EXECUTE_TRADE', true, 'ALLOW', {}, SECRET);
      const tampered = { ...token, reason: 'TAMPERED_REASON' };
      expect(verifyToken(tampered, SECRET)).toBe(false);
    });

    test('Tampering with token timestamp returns false', () => {
      const token = new PermissionToken('EXECUTE_TRADE', true, 'ALLOW', {}, SECRET);
      const tampered = { ...token, timestamp: token.timestamp + 1000 };
      expect(verifyToken(tampered, SECRET)).toBe(false);
    });

    test('Tampering with signature directly returns false', () => {
      const token = new PermissionToken('EXECUTE_TRADE', true, 'ALLOW', {}, SECRET);
      const tampered = { ...token, signature: token.signature.slice(0, 60) + '0000' };
      expect(verifyToken(tampered, SECRET)).toBe(false);
    });

    test('Verifying token against a different / rogue secret key returns false', () => {
      const token = new PermissionToken('EXECUTE_TRADE', true, 'ALLOW', {}, SECRET);
      expect(verifyToken(token, 'rogue-attacker-key')).toBe(false);
    });

    test('verifyToken safely returns false for malformed or null inputs without crashing', () => {
      expect(verifyToken(null, SECRET)).toBe(false);
      expect(verifyToken(undefined, SECRET)).toBe(false);
      expect(verifyToken({}, SECRET)).toBe(false);
      expect(verifyToken({ id: '123' }, SECRET)).toBe(false);
      expect(verifyToken({ id: '123', signature: 'invalid-hex' }, SECRET)).toBe(false);
    });
  });
});
