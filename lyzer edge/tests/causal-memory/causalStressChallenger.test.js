import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import { CausalMemoryDB } from "../../backend/db.js";

const STRESS_DB_PATH = path.join(process.cwd(), "test_causal_stress.db");

function cleanupDb() {
  try { fs.rmSync(STRESS_DB_PATH, { force: true }); } catch {}
  try { fs.rmSync(`${STRESS_DB_PATH}-wal`, { force: true }); } catch {}
  try { fs.rmSync(`${STRESS_DB_PATH}-shm`, { force: true }); } catch {}
}

describe("Causal Memory Empirical Stress Harness (Challenger 2)", () => {
  beforeEach(() => cleanupDb());
  afterEach(() => cleanupDb());

  it("STRESS 1: Error recovery & Rollback on constraint violation restores _causalBuffer without loss or corruption", async () => {
    const db = new CausalMemoryDB(STRESS_DB_PATH, {
      batchSize: 100,
      flushIntervalMs: 60000, // disabled background timer for deterministic testing
    });
    await db.ensureReady();

    // 1. Pre-insert an existing event to setup a duplicate collision
    await db.insertCausalEvent({
      event_id: "EVT-EXISTING",
      timestamp: 1000,
      event_type: "SEED",
      source: "TEST",
      correlation_id: "CORR-SEED",
      hash: "HASH-SEED",
    });
    await db.flushCausalEvents();

    const initialEvents = await db.getCausalEventsByCorrelation("CORR-SEED");
    expect(initialEvents).toHaveLength(1);

    // 2. Add 4 events to buffer: EVT-A, EVT-B, EVT-EXISTING (collision!), EVT-C
    const evtA = { event_id: "EVT-A", timestamp: 1001, event_type: "T", source: "TEST", correlation_id: "CORR-FAIL", hash: "H-A" };
    const evtB = { event_id: "EVT-B", timestamp: 1002, event_type: "T", source: "TEST", correlation_id: "CORR-FAIL", hash: "H-B" };
    const evtDup = { event_id: "EVT-EXISTING", timestamp: 1003, event_type: "T", source: "TEST", correlation_id: "CORR-FAIL", hash: "H-DUP" };
    const evtC = { event_id: "EVT-C", timestamp: 1004, event_type: "T", source: "TEST", correlation_id: "CORR-FAIL", hash: "H-C" };

    await db.insertCausalEvent(evtA);
    await db.insertCausalEvent(evtB);
    await db.insertCausalEvent(evtDup);
    await db.insertCausalEvent(evtC);

    expect(db._causalBuffer).toHaveLength(4);

    // 3. Attempt flush -> should fail due to UNIQUE constraint on event_id
    let errorCaught = null;
    try {
      const flushPromise = db.flushCausalEvents();
      if (db._flushPromise) {
        db._flushPromise.catch(() => {}); // prevent node unhandledRejection from raw internal mutex promise
      }
      await flushPromise;
    } catch (err) {
      errorCaught = err;
    }

    expect(errorCaught).not.toBeNull();
    expect(errorCaught.message).toMatch(/UNIQUE constraint failed/i);

    // 4. Verify SQLite rollback: None of EVT-A, EVT-B, EVT-C should be committed in DB
    const failedCorr = await db.db.all ? await new Promise(r => db.db.all("SELECT * FROM causal_events_log WHERE correlation_id = 'CORR-FAIL'", (e, rows) => r(rows))) : [];
    expect(failedCorr).toHaveLength(0);

    // 5. Verify buffer restoration: _causalBuffer must retain all 4 events in exact order
    expect(db._causalBuffer).toHaveLength(4);
    expect(db._causalBuffer[0].event_id).toBe("EVT-A");
    expect(db._causalBuffer[1].event_id).toBe("EVT-B");
    expect(db._causalBuffer[2].event_id).toBe("EVT-EXISTING");
    expect(db._causalBuffer[3].event_id).toBe("EVT-C");

    // 6. Fix buffer by replacing duplicate with unique event, then flush
    db._causalBuffer[2].event_id = "EVT-FIXED";
    await db.flushCausalEvents();
    expect(db._causalBuffer).toHaveLength(0);

    const recoveredRows = await db.getCausalEventsByCorrelation("CORR-FAIL");
    expect(recoveredRows).toHaveLength(4);
    expect(recoveredRows.map(r => r.event_id)).toEqual(["EVT-A", "EVT-B", "EVT-FIXED", "EVT-C"]);

    await db.close();
  });

  it("STRESS 2: WAL Checkpoint integration flushes active memory buffer before checkpointing", async () => {
    const db = new CausalMemoryDB(STRESS_DB_PATH, {
      batchSize: 50,
      flushIntervalMs: 60000,
    });
    await db.ensureReady();

    // Fill buffer with 10 events (< batchSize 50)
    for (let i = 1; i <= 10; i++) {
      await db.insertCausalEvent({
        event_id: `EVT-WAL-${i}`,
        timestamp: 2000 + i,
        event_type: "WAL_TEST",
        source: "TEST",
        correlation_id: "CORR-WAL",
        hash: `HASH-WAL-${i}`,
      });
    }

    expect(db._causalBuffer).toHaveLength(10);

    // Trigger WAL checkpoint in TRUNCATE mode
    await db.walCheckpoint("TRUNCATE");

    // Buffer must be empty after checkpoint
    expect(db._causalBuffer).toHaveLength(0);

    // Verify all 10 events were flushed to DB prior to checkpoint
    const rows = await db.getCausalEventsByCorrelation("CORR-WAL");
    expect(rows).toHaveLength(10);
    expect(rows[9].event_id).toBe("EVT-WAL-10");

    await db.close();
  });

  it("STRESS 3: TTL cleanup integration flushes memory buffer before purging expired records", async () => {
    const db = new CausalMemoryDB(STRESS_DB_PATH, {
      batchSize: 50,
      flushIntervalMs: 60000,
    });
    await db.ensureReady();

    const now = Date.now();
    const fortyDaysAgo = now - (40 * 24 * 60 * 60 * 1000);

    // Insert 3 expired events into memory buffer
    for (let i = 1; i <= 3; i++) {
      await db.insertCausalEvent({
        event_id: `EVT-EXPIRED-${i}`,
        timestamp: fortyDaysAgo + (i * 1000),
        event_type: "TTL_EXPIRED",
        source: "TEST",
        correlation_id: "CORR-TTL",
        hash: `HASH-EXP-${i}`,
      });
    }

    // Insert 2 fresh events into memory buffer
    for (let i = 1; i <= 2; i++) {
      await db.insertCausalEvent({
        event_id: `EVT-FRESH-${i}`,
        timestamp: now - 1000 + i,
        event_type: "TTL_FRESH",
        source: "TEST",
        correlation_id: "CORR-TTL",
        hash: `HASH-FRESH-${i}`,
      });
    }

    expect(db._causalBuffer).toHaveLength(5);

    // Run TTL cleanup (default 30 days retention for causal events)
    const cleanupResult = await db.runTTLCleanup({ causalEventsTtlDays: 30 });

    // Buffer must be flushed to 0
    expect(db._causalBuffer).toHaveLength(0);
    expect(cleanupResult.deleted.causal_events_log).toBe(3);

    // Only fresh events should remain in the database
    const remaining = await db.getCausalEventsByCorrelation("CORR-TTL");
    expect(remaining).toHaveLength(2);
    expect(remaining.map(r => r.event_id)).toEqual(["EVT-FRESH-1", "EVT-FRESH-2"]);

    await db.close();
  });

  it("STRESS 4: High-throughput concurrent asynchronous bursts under extreme load", async () => {
    const db = new CausalMemoryDB(STRESS_DB_PATH, {
      batchSize: 20,
      flushIntervalMs: 25,
    });
    await db.ensureReady();

    const NUM_WORKERS = 10;
    const EVENTS_PER_WORKER = 30; // 300 total events
    const allWorkerPromises = [];

    for (let w = 0; w < NUM_WORKERS; w++) {
      const workerId = w;
      allWorkerPromises.push((async () => {
        for (let i = 0; i < EVENTS_PER_WORKER; i++) {
          await db.insertCausalEvent({
            event_id: `EVT-CONC-W${workerId}-${i}`,
            timestamp: 5000 + (workerId * 1000) + i,
            event_type: "CONCURRENCY_TEST",
            source: `WORKER-${workerId}`,
            correlation_id: "CORR-CONCURRENCY",
            payload: { workerId, seq: i },
            hash: `HASH-W${workerId}-${i}`,
          });
          // Micro-yield to trigger concurrency interleaving
          if (i % 5 === 0) {
            await new Promise(r => setImmediate(r));
          }
        }
      })());
    }

    await Promise.all(allWorkerPromises);

    // Query hash to ensure flush and consistency
    const rows = await db.getCausalEventsByCorrelation("CORR-CONCURRENCY");
    expect(rows).toHaveLength(NUM_WORKERS * EVENTS_PER_WORKER);

    // Verify all 300 unique IDs are present
    const eventIds = new Set(rows.map(r => r.event_id));
    expect(eventIds.size).toBe(NUM_WORKERS * EVENTS_PER_WORKER);

    await db.close();
  });

  it("STRESS 5: Hash chaining and temporal ordering preserved across multiple batch boundaries", async () => {
    const db = new CausalMemoryDB(STRESS_DB_PATH, {
      batchSize: 7, // Prime number batch size to stress fractional chunks
      flushIntervalMs: 5000,
    });
    await db.ensureReady();

    const TOTAL_EVENTS = 50;
    let prevHash = "0".repeat(64);

    for (let i = 1; i <= TOTAL_EVENTS; i++) {
      const currentHash = `HASH_CHAIN_${i}_` + "x".repeat(50);
      await db.insertCausalEvent({
        event_id: `EVT-CHAIN-${i}`,
        timestamp: 10000 + i,
        event_type: "CHAIN_EVENT",
        source: "TEST_CHAIN",
        correlation_id: "CORR-CHAIN",
        hash_prev: prevHash,
        hash: currentHash,
      });
      prevHash = currentHash;
    }

    const lastHash = await db.getLastCausalEventHash();
    expect(lastHash).toBe(prevHash);

    const chainRows = await db.getCausalEventsByCorrelation("CORR-CHAIN");
    expect(chainRows).toHaveLength(TOTAL_EVENTS);

    // Verify hash integrity chain
    for (let i = 0; i < chainRows.length; i++) {
      if (i === 0) {
        expect(chainRows[i].hash_prev).toBe("0".repeat(64));
      } else {
        expect(chainRows[i].hash_prev).toBe(chainRows[i - 1].hash);
      }
    }

    await db.close();
  });

  it("STRESS 6: Concurrent callers during flush failure receive proper rejection propagation and lock reset", async () => {
    const db = new CausalMemoryDB(STRESS_DB_PATH, {
      batchSize: 100,
      flushIntervalMs: 60000,
    });
    await db.ensureReady();

    // Pre-insert seed
    await db.insertCausalEvent({
      event_id: "DUP-SEED",
      timestamp: 500,
      event_type: "SEED",
      source: "TEST",
      correlation_id: "CORR-CONC-FAIL",
      hash: "H-SEED",
    });
    await db.flushCausalEvents();

    // Insert duplicate into buffer to provoke failure
    await db.insertCausalEvent({
      event_id: "DUP-SEED",
      timestamp: 600,
      event_type: "SEED-DUP",
      source: "TEST",
      correlation_id: "CORR-CONC-FAIL",
      hash: "H-DUP",
    });

    // Start flush 1 (which will fail)
    const flush1Promise = db.flushCausalEvents();

    // Concurrently start flush 2 while flush 1 is in progress
    const flush2Promise = db.flushCausalEvents();

    // Both should reject or complete without hanging
    const results = await Promise.allSettled([flush1Promise, flush2Promise]);
    expect(results[0].status).toBe("rejected");
    expect(results[1].status).toBe("rejected");

    // Ensure lock is cleanly released
    expect(db._isFlushing).toBe(false);
    expect(db._flushPromise).toBeNull();

    // Fix the buffer
    db._causalBuffer = [];
    await db.insertCausalEvent({
      event_id: "EVT-CLEAN-AFTER-FAIL",
      timestamp: 700,
      event_type: "CLEAN",
      source: "TEST",
      correlation_id: "CORR-CONC-FAIL",
      hash: "H-CLEAN",
    });

    // New flush should succeed without lock deadlock
    await expect(db.flushCausalEvents()).resolves.toBeUndefined();

    const rows = await db.getCausalEventsByCorrelation("CORR-CONC-FAIL");
    expect(rows.map(r => r.event_id)).toEqual(["DUP-SEED", "EVT-CLEAN-AFTER-FAIL"]);

    await db.close();
  });
});
