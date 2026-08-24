import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import { CausalMemoryDB } from "../../backend/db.js";

let activeDbs = [];

function getTestDbPath(label = "wal_stress") {
  return path.join(
    os.tmpdir(),
    `test_causal_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.db`
  );
}

function createDb(dbPath, options = {}) {
  const db = new CausalMemoryDB(dbPath, options);
  activeDbs.push(db);
  return db;
}

async function cleanupAllDbs() {
  for (const db of activeDbs) {
    try {
      await db.close();
    } catch {
      // Ignore already closed
    }
  }
  activeDbs = [];
}

function generateHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

describe("Empirical Challenger 4 — Causal Memory & Concurrent WAL Stress Suite", () => {
  beforeEach(() => {
    activeDbs = [];
  });

  afterEach(async () => {
    await cleanupAllDbs();
  });

  it("1. Concurrent WAL Checkpointing under massive asynchronous write storm (PASSIVE, FULL, RESTART, TRUNCATE)", async () => {
    const dbPath = getTestDbPath("wal_storm");
    const db = createDb(dbPath, {
      batchSize: 10,
      flushIntervalMs: 25,
    });
    await db.ensureReady();

    const NUM_PRODUCERS = 5;
    const EVENTS_PER_PRODUCER = 150; // 750 total events
    const CHECKPOINT_MODES = ["PASSIVE", "FULL", "RESTART", "TRUNCATE"];
    let stopCheckpointers = false;
    let checkpointsCompleted = 0;
    let checkpointErrors = 0;

    // Concurrent WAL Checkpoint worker
    const checkpointerPromise = (async () => {
      let modeIdx = 0;
      while (!stopCheckpointers) {
        const mode = CHECKPOINT_MODES[modeIdx % CHECKPOINT_MODES.length];
        modeIdx++;
        try {
          await db.walCheckpoint(mode);
          checkpointsCompleted++;
        } catch (err) {
          checkpointErrors++;
          console.error(`[Stress] WAL checkpoint ${mode} error:`, err);
        }
        await new Promise((r) => setTimeout(r, 15));
      }
    })();

    // Concurrent Producers
    const producerPromises = Array.from({ length: NUM_PRODUCERS }, async (_, prodIdx) => {
      let prevHash = "0".repeat(64);
      for (let i = 0; i < EVENTS_PER_PRODUCER; i++) {
        const eventId = `EVT-PROD${prodIdx}-${i.toString().padStart(4, "0")}`;
        const payload = { producer: prodIdx, seq: i, timestamp: Date.now() };
        const currentHash = generateHash({ eventId, payload, prevHash });

        await db.insertCausalEvent({
          event_id: eventId,
          timestamp: 1000000 + (prodIdx * 1000) + i,
          event_type: "STRESS_TICK",
          source: `PRODUCER_${prodIdx}`,
          correlation_id: `CORR-PROD-${prodIdx}`,
          hash_prev: prevHash,
          payload,
          context: { prodIdx },
          hash: currentHash,
        });

        prevHash = currentHash;
        if (i % 20 === 0) {
          await new Promise((r) => setTimeout(r, 2));
        }
      }
    });

    await Promise.all(producerPromises);
    stopCheckpointers = true;
    await checkpointerPromise;

    // Final flush to guarantee buffer is empty
    await db.flushCausalEvents();
    expect(db._causalBuffer.length).toBe(0);
    expect(checkpointsCompleted).toBeGreaterThanOrEqual(3);
    expect(checkpointErrors).toBe(0);

    // Verify all 750 events persisted across all producers with 100% hash chain integrity
    for (let prodIdx = 0; prodIdx < NUM_PRODUCERS; prodIdx++) {
      const rows = await db.getCausalEventsByCorrelation(`CORR-PROD-${prodIdx}`);
      expect(rows).toHaveLength(EVENTS_PER_PRODUCER);

      for (let i = 0; i < EVENTS_PER_PRODUCER; i++) {
        expect(rows[i].event_id).toBe(`EVT-PROD${prodIdx}-${i.toString().padStart(4, "0")}`);
        expect(rows[i].payload.producer).toBe(prodIdx);
        expect(rows[i].payload.seq).toBe(i);
        if (i > 0) {
          expect(rows[i].hash_prev).toBe(rows[i - 1].hash);
        }
      }
    }

    await db.close();
  });

  it("2. Zero Unhandled Promise Rejections & Lock Resilience under Error Injection", async () => {
    const unhandledRejections = [];
    const rejectionHandler = (reason, promise) => {
      unhandledRejections.push({ reason, promise });
    };
    process.on("unhandledRejection", rejectionHandler);

    try {
      const dbPath = getTestDbPath("unhandled_rejection_audit");
      const db = createDb(dbPath, {
        batchSize: 50,
        flushIntervalMs: 10000,
      });
      await db.ensureReady();

      // Seed event
      await db.insertCausalEvent({
        event_id: "COLLISION-ID-1",
        timestamp: 100,
        event_type: "SEED",
        source: "AUDIT",
        correlation_id: "CORR-AUDIT",
        hash: "HASH-SEED",
      });
      await db.flushCausalEvents();

      // Provoke 10 concurrent failing flushes due to duplicate event_id
      for (let round = 0; round < 5; round++) {
        await db.insertCausalEvent({
          event_id: "COLLISION-ID-1", // duplicate!
          timestamp: 200 + round,
          event_type: "DUP",
          source: "AUDIT",
          correlation_id: "CORR-AUDIT",
          hash: `HASH-DUP-${round}`,
        });

        // Fire multiple simultaneous flushes on failing buffer
        const flushTasks = [
          db.flushCausalEvents(),
          db.flushCausalEvents(),
          db.flushCausalEvents(),
        ];

        const results = await Promise.allSettled(flushTasks);
        for (const res of results) {
          expect(res.status).toBe("rejected");
        }

        // Lock must be released
        expect(db._isFlushing).toBe(false);
        expect(db._flushPromise).toBeNull();

        // Clear failing buffer
        db._causalBuffer = [];
      }

      // Allow microtasks & event loop ticks to settle
      await new Promise((r) => setTimeout(r, 100));

      // Assert ZERO unhandled rejections occurred
      expect(unhandledRejections).toHaveLength(0);

      // Verify normal operations recover seamlessly
      await db.insertCausalEvent({
        event_id: "RECOVERED-AUDIT-1",
        timestamp: 300,
        event_type: "RECOVERED",
        source: "AUDIT",
        correlation_id: "CORR-AUDIT",
        hash: "HASH-REC",
      });
      await db.flushCausalEvents();

      const events = await db.getCausalEventsByCorrelation("CORR-AUDIT");
      expect(events).toHaveLength(2);
      expect(events[1].event_id).toBe("RECOVERED-AUDIT-1");

      await db.close();
    } finally {
      process.removeListener("unhandledRejection", rejectionHandler);
    }
  });

  it("3. High-Volume Memory & Buffer Allocation Leak Audit (10,000+ batched events)", async () => {
    const dbPath = getTestDbPath("memory_leak_audit");
    const db = createDb(dbPath, {
      batchSize: 100,
      flushIntervalMs: 50,
    });
    await db.ensureReady();

    const TOTAL_EVENTS = 10000;
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < TOTAL_EVENTS; i++) {
      await db.insertCausalEvent({
        event_id: `EVT-MEM-${i}`,
        timestamp: 10000000 + i,
        event_type: "MEM_TEST",
        source: "MEM_STRESS",
        correlation_id: `CORR-MEM-${i % 20}`,
        payload: {
          index: i,
          randomData: "A".repeat(128),
          metadata: { nested: true, iter: i },
        },
        context: { worker: i % 4 },
        hash: `HASH-MEM-${i}`,
      });
    }

    await db.flushCausalEvents();
    expect(db._causalBuffer.length).toBe(0);

    // Trigger GC if exposed, otherwise check buffer & timer reclamation
    if (global.gc) {
      global.gc();
    }

    const postFlushMemory = process.memoryUsage().heapUsed;
    const memoryDiffMb = (postFlushMemory - initialMemory) / (1024 * 1024);

    // Verify memory growth is well bounded (< 150MB for 10k events in Node.js process)
    expect(memoryDiffMb).toBeLessThan(150);

    // Verify recent events query returns properly
    const recent = await db.getRecentCausalEvents(50);
    expect(recent).toHaveLength(50);
    expect(recent[recent.length - 1].event_id).toBe(`EVT-MEM-${TOTAL_EVENTS - 1}`);

    db.startPeriodicTTLCleanup(10000);
    expect(db._ttlTimer).not.toBeNull();

    await db.close();
    expect(db._causalFlushTimer).toBeNull();
    expect(db._ttlTimer).toBeNull();
  });

  it("4. Rapid Close / Reopen & Atomic State Reconstitution across multiple DB lifecycles", async () => {
    const dbPath = getTestDbPath("lifecycle_stress");

    for (let cycle = 0; cycle < 5; cycle++) {
      const db = createDb(dbPath, {
        batchSize: 20,
        flushIntervalMs: 1000,
      });
      await db.ensureReady();

      // Insert 15 items (< batchSize 20, unflushed)
      for (let i = 0; i < 15; i++) {
        await db.insertCausalEvent({
          event_id: `EVT-CYCLE-${cycle}-${i}`,
          timestamp: 20000000 + (cycle * 100) + i,
          event_type: "LIFECYCLE_TEST",
          source: `CYCLE_${cycle}`,
          correlation_id: `CORR-CYCLE-${cycle}`,
          payload: { cycle, i },
          hash: `HASH-CYCLE-${cycle}-${i}`,
        });
      }

      expect(db._causalBuffer.length).toBe(15);

      // Close must flush automatically
      await db.close();
      expect(db._causalBuffer.length).toBe(0);
    }

    // Reopen and inspect all 5 cycles
    const verifyDb = createDb(dbPath);
    await verifyDb.ensureReady();

    for (let cycle = 0; cycle < 5; cycle++) {
      const rows = await verifyDb.getCausalEventsByCorrelation(`CORR-CYCLE-${cycle}`);
      expect(rows).toHaveLength(15);
      for (let i = 0; i < 15; i++) {
        expect(rows[i].event_id).toBe(`EVT-CYCLE-${cycle}-${i}`);
        expect(rows[i].payload.cycle).toBe(cycle);
      }
    }

    await verifyDb.close();
  });
});
