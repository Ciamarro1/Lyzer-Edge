import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { CausalMemoryDB } from '../../backend/db.js';
import {
  computeCausalHash,
  verifyCausalHash,
  verifyCausalChain,
  GENESIS_PREV_HASH
} from '../../src/causal-memory/causalCrypto.js';
import { canonicalJson } from '../../src/causal-memory/canonicalJson.js';
import { generateUUIDv7 } from '../../src/causal-memory/EventFactory.js';

let testDbPath;
let activeDbs = [];

function getTestDbPath() {
  return path.join(
    os.tmpdir(),
    `test_causal_restart_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
  );
}

function createDb(dbPath, options = {}) {
  const db = new CausalMemoryDB(dbPath, options);
  activeDbs.push(db);
  return db;
}

async function cleanupDb(dbPath) {
  for (const db of activeDbs) {
    try {
      await db.close();
    } catch (_err) {
      // ignore
    }
  }
  activeDbs = [];

  if (dbPath) {
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.rmSync(`${dbPath}${suffix}`, { force: true });
      } catch (_err) {
        // ignore
      }
    }
  }
}

describe('Causal Cryptographic Ledger & Restart Continuity Suite', () => {
  beforeEach(() => {
    testDbPath = getTestDbPath();
    activeDbs = [];
  });

  afterEach(async () => {
    await cleanupDb(testDbPath);
  });

  it('1. Canonical JSON produces deterministic output regardless of key order', () => {
    const objA = { z: 100, a: 'alpha', m: { y: true, x: false } };
    const objB = { a: 'alpha', m: { x: false, y: true }, z: 100 };

    const canonicalA = canonicalJson(objA);
    const canonicalB = canonicalJson(objB);

    expect(canonicalA).toBe(canonicalB);
    expect(canonicalA).toBe('{"a":"alpha","m":{"x":false,"y":true},"z":100}');
  });

  it('2. Computes 64-character SHA-256 hash chaining correctly', () => {
    const event1 = {
      event_id: generateUUIDv7(),
      timestamp: 1700000000000,
      event_type: 'REALITY_SNAPSHOT_CREATED',
      source: 'StreamEngine',
      correlation_id: 'corr_test_1',
      payload: { sds: 0.12, lhds: 0.05 },
      context: { symbol: 'BTCUSDT' }
    };

    const hash1 = computeCausalHash(event1, GENESIS_PREV_HASH);
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);

    event1.hash_prev = GENESIS_PREV_HASH;
    event1.hash = hash1;
    expect(verifyCausalHash(event1, GENESIS_PREV_HASH)).toBe(true);

    const event2 = {
      event_id: generateUUIDv7(),
      timestamp: 1700000001000,
      event_type: 'KERNEL_VERDICT',
      source: 'TruthKernel',
      correlation_id: 'corr_test_1',
      parent_event: event1.event_id,
      payload: { eef: true, epistemic_authority: 'ALLOW' },
      context: { symbol: 'BTCUSDT' }
    };

    const hash2 = computeCausalHash(event2, hash1);
    event2.hash_prev = hash1;
    event2.hash = hash2;

    expect(verifyCausalHash(event2, hash1)).toBe(true);

    const chainValidation = verifyCausalChain([event1, event2]);
    expect(chainValidation.valid).toBe(true);
    expect(chainValidation.count).toBe(2);
  });

  it('3. Preserves uninterrupted SHA-256 cryptographic chain continuity across DB restart', async () => {
    // Phase 1: First DB instance (Pre-restart)
    const db1 = createDb(testDbPath, { batchSize: 2 });
    await db1.ensureReady();

    const corrId = 'corr_continuity_001';

    // Insert 4 events in Session 1
    for (let i = 1; i <= 4; i++) {
      await db1.insertCausalEvent({
        event_id: `EVT_SESSION1_${i}_${generateUUIDv7()}`,
        timestamp: 1000000 + i * 100,
        event_type: i % 2 === 1 ? 'REALITY_SNAPSHOT_CREATED' : 'KERNEL_VERDICT',
        source: i % 2 === 1 ? 'StreamEngine' : 'TruthKernel',
        correlation_id: corrId,
        payload: { tickIndex: i, price: 50000 + i * 10 },
        context: { symbol: 'BTCUSDT' }
      });
    }

    const lastHashBeforeClose = await db1.getLastCausalEventHash();
    expect(lastHashBeforeClose).toHaveLength(64);
    expect(lastHashBeforeClose).not.toBe(GENESIS_PREV_HASH);

    // Cleanly close DB1 (flushes all buffers and WAL)
    await db1.close();

    // Phase 2: Restart database by opening a fresh CausalMemoryDB on the same SQLite file
    const db2 = createDb(testDbPath, { batchSize: 2 });
    await db2.ensureReady();

    const lastHashAfterRestart = await db2.getLastCausalEventHash();
    // Memory pointer in restarted DB must equal the last persisted hash
    expect(lastHashAfterRestart).toBe(lastHashBeforeClose);

    // Insert 4 events in Session 2 (Post-restart)
    for (let i = 5; i <= 8; i++) {
      await db2.insertCausalEvent({
        event_id: `EVT_SESSION2_${i}_${generateUUIDv7()}`,
        timestamp: 1000000 + i * 100,
        event_type: i % 2 === 1 ? 'REALITY_SNAPSHOT_CREATED' : 'KERNEL_VERDICT',
        source: i % 2 === 1 ? 'StreamEngine' : 'TruthKernel',
        correlation_id: corrId,
        payload: { tickIndex: i, price: 50000 + i * 10 },
        context: { symbol: 'BTCUSDT' }
      });
    }

    // Flush and retrieve all 8 events across both lifetimes
    const allEvents = await db2.getCausalEventsByCorrelation(corrId);
    expect(allEvents).toHaveLength(8);

    // Verify session boundary link: Event #5 (first after restart) must have hash_prev == Event #4 (last before restart)
    expect(allEvents[4].hash_prev).toBe(allEvents[3].hash);
    expect(allEvents[4].hash_prev).toBe(lastHashBeforeClose);

    // Validate full 8-event cryptographic chain end-to-end
    const validationResult = verifyCausalChain(allEvents);
    expect(validationResult.valid).toBe(true);
    expect(validationResult.count).toBe(8);

    await db2.close();
  });

  it('4. Supports HMAC-SHA256 keyed ledger hashing across restarts', async () => {
    const secretKey = 'institutional-super-secret-causal-key-2026';
    process.env.CAUSAL_HMAC_KEY = secretKey;

    try {
      const db1 = createDb(testDbPath, { batchSize: 1 });
      await db1.ensureReady();

      const eventA = {
        event_id: `EVT_HMAC_1_${generateUUIDv7()}`,
        timestamp: Date.now(),
        event_type: 'CONSTITUTIONAL_JUDGMENT',
        source: 'ECA_COURT',
        correlation_id: 'corr_hmac_test',
        payload: { verdict: 'ALLOW', confidence: 0.99 },
        context: { symbol: 'ETHUSDT' }
      };

      await db1.insertCausalEvent(eventA);
      const hmac1 = await db1.getLastCausalEventHash();
      expect(hmac1).toHaveLength(64);

      // Verify it was computed using HMAC-SHA256
      const expectedHmac1 = computeCausalHash(eventA, GENESIS_PREV_HASH, { hmacKey: secretKey });
      expect(hmac1).toBe(expectedHmac1);

      await db1.close();

      // Reopen
      const db2 = createDb(testDbPath);
      await db2.ensureReady();

      const eventB = {
        event_id: `EVT_HMAC_2_${generateUUIDv7()}`,
        timestamp: Date.now() + 1000,
        event_type: 'TRADE_INTENT_AUTHORIZED',
        source: 'RISK_GATEWAY',
        correlation_id: 'corr_hmac_test',
        payload: { authorized: true },
        context: { symbol: 'ETHUSDT' }
      };

      await db2.insertCausalEvent(eventB);

      const chain = await db2.getCausalEventsByCorrelation('corr_hmac_test');
      expect(chain).toHaveLength(2);

      const chainValidation = verifyCausalChain(chain, GENESIS_PREV_HASH, { hmacKey: secretKey });
      expect(chainValidation.valid).toBe(true);

      await db2.close();
    } finally {
      delete process.env.CAUSAL_HMAC_KEY;
    }
  });

  it('5. Detects database tampering between restarts', async () => {
    // 1. Create DB and insert 3 events
    const db1 = createDb(testDbPath);
    await db1.ensureReady();

    const corrId = 'corr_tamper_audit';
    for (let i = 1; i <= 3; i++) {
      await db1.insertCausalEvent({
        event_id: `EVT_AUDIT_${i}_${generateUUIDv7()}`,
        timestamp: 1000 + i,
        event_type: 'MARKET_OBSERVATION_RECEIVED',
        source: 'StreamEngine',
        correlation_id: corrId,
        payload: { close: 60000 + i },
        context: { symbol: 'BTCUSDT' }
      });
    }
    await db1.close();

    // 2. Adversarial Tamper: Directly alter SQLite database row behind the system's back
    const sqlite3 = (await import('sqlite3')).default;
    const rawDb = new sqlite3.Database(testDbPath);
    await new Promise((resolve, reject) => {
      rawDb.run(
        `UPDATE causal_events_log SET payload = '{"close":999999}' WHERE id = 2`,
        (err) => (err ? reject(err) : resolve())
      );
    });
    await new Promise((resolve) => rawDb.close(resolve));

    // 3. Restart DB and verify chain validation detects tampering
    const db2 = createDb(testDbPath);
    await db2.ensureReady();

    const allEvents = await db2.getCausalEventsByCorrelation(corrId);
    expect(allEvents).toHaveLength(3);

    const validationResult = verifyCausalChain(allEvents);
    expect(validationResult.valid).toBe(false);
    expect(validationResult.brokenIndex).toBe(1); // Row 2 (0-indexed 1) was tampered
    expect(validationResult.reason).toContain('TAMPER_DETECTED');

    await db2.close();
  });
});
