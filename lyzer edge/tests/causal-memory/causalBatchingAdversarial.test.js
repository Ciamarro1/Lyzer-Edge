import { describe, it, expect, afterAll } from "vitest";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { CausalMemoryDB } from "../../backend/db.js";

const createdFiles = [];

function getTestDbPath(name) {
  const p = path.join(
    process.cwd(),
    `test_causal_stress_${name}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.db`,
  );
  createdFiles.push(p);
  return p;
}

function generateHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

describe("Adversarial Stress & Race Condition Suite (Milestone 2 - R2 Challenger)", () => {
  afterAll(() => {
    for (const p of createdFiles) {
      try {
        fs.rmSync(p, { force: true });
      } catch {
        // Ignore unlink error on Windows open file locks
      }
      try {
        fs.rmSync(`${p}-wal`, { force: true });
      } catch {
        // Ignore unlink error on Windows open file locks
      }
      try {
        fs.rmSync(`${p}-shm`, { force: true });
      } catch {
        // Ignore unlink error on Windows open file locks
      }
    }
  });

  it("1. High Concurrency: 1200+ events across 6 concurrent streams with small batch size", async () => {
    const dbPath = getTestDbPath("high_concurrency");
    const db = new CausalMemoryDB(dbPath, {
      batchSize: 15, // Force frequent flushes & transaction cycling
      flushIntervalMs: 50,
    });
    await db.ensureReady();

    const STREAMS = [
      "BTCUSDT",
      "ETHUSDT",
      "SOLUSDT",
      "BNBUSDT",
      "ADAUSDT",
      "XRPUSDT",
    ];
    const EVENTS_PER_STREAM = 200; // Total 1200 events
    const allExpectedEventIds = new Set();

    // Fire all streams concurrently
    const streamPromises = STREAMS.map(async (symbol, streamIdx) => {
      let prevHash = "0".repeat(64);
      for (let i = 0; i < EVENTS_PER_STREAM; i++) {
        const eventId = `EVT-${symbol}-${i.toString().padStart(4, "0")}`;
        allExpectedEventIds.add(eventId);

        const eventData = {
          symbol,
          seq: i,
          price: 50000 + streamIdx * 1000 + i,
          ts: 1700000000000 + i * 10,
        };
        const currentHash = generateHash({ eventId, eventData, prevHash });

        const event = {
          event_id: eventId,
          timestamp: eventData.ts,
          event_type: "STREAM_TICK_SIGNAL",
          source: `ENGINE_${symbol}`,
          causation_id:
            i > 0
              ? `EVT-${symbol}-${(i - 1).toString().padStart(4, "0")}`
              : null,
          correlation_id: `CORR-STREAM-${symbol}`,
          intent_id: `INTENT-${symbol}-${i}`,
          parent_event: null,
          version: "1.0.0",
          hash_prev: prevHash,
          epistemic_regime: "REGIME_A_CONSENSUS",
          payload: eventData,
          context: { streamIdx, symbol },
          hash: currentHash,
        };

        prevHash = currentHash;
        await db.insertCausalEvent(event);
      }
    });

    await Promise.all(streamPromises);

    // Explicitly flush any leftover in buffer
    await db.flushCausalEvents();
    expect(db._causalBuffer.length).toBe(0);

    // Verify all 1200 events are present and intact in SQLite
    const recentRows = await db.getRecentCausalEvents(2000);
    expect(recentRows.length).toBe(1200);

    // Verify each stream's correlation query returns exactly 200 items in sequential order
    for (const symbol of STREAMS) {
      const streamEvents = await db.getCausalEventsByCorrelation(
        `CORR-STREAM-${symbol}`,
      );
      expect(streamEvents).toHaveLength(EVENTS_PER_STREAM);

      for (let i = 0; i < EVENTS_PER_STREAM; i++) {
        const expectedId = `EVT-${symbol}-${i.toString().padStart(4, "0")}`;
        expect(streamEvents[i].event_id).toBe(expectedId);
        expect(streamEvents[i].payload.symbol).toBe(symbol);
        expect(streamEvents[i].payload.seq).toBe(i);
        if (i > 0) {
          expect(streamEvents[i].hash_prev).toBe(streamEvents[i - 1].hash);
        }
      }
    }

    await db.close();
  });

  it("2. Read-Your-Own-Writes Race Conditions: Continuous background writes vs concurrent immediate reads", async () => {
    const dbPath = getTestDbPath("ryow");
    const db = new CausalMemoryDB(dbPath, {
      batchSize: 20,
      flushIntervalMs: 80,
    });
    await db.ensureReady();

    let writeCount = 0;
    const TOTAL_WRITES = 300;
    let stopWrites = false;
    const insertedIds = [];

    // Continuous asynchronous background writer
    const writerPromise = (async () => {
      while (writeCount < TOTAL_WRITES && !stopWrites) {
        const id = `EVT-CONT-${writeCount}`;
        insertedIds.push(id);
        const event = {
          event_id: id,
          timestamp: 1000000 + writeCount,
          event_type: "TICK_OBSERVATION",
          source: "PRODUCER",
          correlation_id: "CORR-CONTINUOUS",
          payload: { count: writeCount },
          context: {},
          hash: `HASH-${writeCount}`,
        };
        writeCount++;
        const p = db.insertCausalEvent(event);
        if (writeCount % 10 === 0) {
          await new Promise((r) => setTimeout(r, 5));
        }
        await p;
      }
    })();

    // Concurrent reader firing immediate queries during background write burst
    const readerPromise = (async () => {
      let readRounds = 0;
      let lastSeenCount = 0;
      while (writeCount < TOTAL_WRITES || readRounds < 15) {
        readRounds++;
        const currentHash = await db.getLastCausalEventHash();
        expect(typeof currentHash).toBe("string");

        const byCorr = await db.getCausalEventsByCorrelation("CORR-CONTINUOUS");
        // Monotonic progression: reads should never see decreasing numbers of records
        expect(byCorr.length).toBeGreaterThanOrEqual(lastSeenCount);
        lastSeenCount = byCorr.length;

        const untilEvents = await db.getCausalEventsUntil(Date.now() * 2);
        expect(untilEvents.length).toBeGreaterThanOrEqual(lastSeenCount);

        await new Promise((r) => setTimeout(r, 10));
      }
    })();

    await Promise.all([writerPromise, readerPromise]);
    await db.flushCausalEvents();

    const finalEvents =
      await db.getCausalEventsByCorrelation("CORR-CONTINUOUS");
    expect(finalEvents.length).toBe(TOTAL_WRITES);
    expect(finalEvents[finalEvents.length - 1].event_id).toBe(
      `EVT-CONT-${TOTAL_WRITES - 1}`,
    );

    await db.close();
  });

  it("3. Close & Teardown Safety: Unflushed buffer events are guaranteed to persist on db.close()", async () => {
    const dbPath = getTestDbPath("close_safety");
    const db = new CausalMemoryDB(dbPath, {
      batchSize: 500, // Large batch size so events remain in buffer
      flushIntervalMs: 60000, // Large interval so timer doesn't fire
    });
    await db.ensureReady();

    const NUM_BUFFERED = 77;
    for (let i = 0; i < NUM_BUFFERED; i++) {
      await db.insertCausalEvent({
        event_id: `EVT-DRAIN-${i}`,
        timestamp: 2000000 + i,
        event_type: "DRAIN_TEST",
        source: "TEST",
        correlation_id: "CORR-DRAIN",
        payload: { idx: i },
        context: {},
        hash: `HASH-DRAIN-${i}`,
      });
    }

    // Verify events are in memory buffer and not yet committed
    expect(db._causalBuffer.length).toBe(NUM_BUFFERED);

    // Call close() which must flush before shutting down SQLite connection
    await db.close();
    expect(db._causalBuffer.length).toBe(0);

    // Reopen fresh DB connection from disk and verify 100% persistence
    const db2 = new CausalMemoryDB(dbPath);
    await db2.ensureReady();

    const rows = await db2.getCausalEventsByCorrelation("CORR-DRAIN");
    expect(rows).toHaveLength(NUM_BUFFERED);
    for (let i = 0; i < NUM_BUFFERED; i++) {
      expect(rows[i].event_id).toBe(`EVT-DRAIN-${i}`);
      expect(rows[i].payload.idx).toBe(i);
    }

    await db2.close();
  });

  it("4. Re-entrancy & Concurrent Flush Protection: Multiple simultaneous flush calls must resolve safely without mutex violation", async () => {
    const dbPath = getTestDbPath("reentrancy");
    const db = new CausalMemoryDB(dbPath, {
      batchSize: 100,
      flushIntervalMs: 10000,
    });
    await db.ensureReady();

    // Populate buffer with 50 events
    for (let i = 0; i < 50; i++) {
      await db.insertCausalEvent({
        event_id: `EVT-REENTRANT-${i}`,
        timestamp: 3000000 + i,
        event_type: "REENTRANT_TEST",
        source: "TEST",
        correlation_id: "CORR-REENTRANT",
        payload: { i },
        context: {},
        hash: `HASH-REENTRANT-${i}`,
      });
    }

    expect(db._causalBuffer.length).toBe(50);

    // Trigger 10 parallel flush calls at the exact same tick
    const flushPromises = Array.from({ length: 10 }, () =>
      db.flushCausalEvents(),
    );
    await Promise.all(flushPromises);

    expect(db._causalBuffer.length).toBe(0);
    expect(db._isFlushing).toBe(false);

    const rows = await db.getCausalEventsByCorrelation("CORR-REENTRANT");
    expect(rows).toHaveLength(50);

    await db.close();
  });

  it("5. Non-Blocking insertCausalEvent: Event loop stays responsive under burst insertion", async () => {
    const dbPath = getTestDbPath("nonblocking");
    const db = new CausalMemoryDB(dbPath, {
      batchSize: 50,
      flushIntervalMs: 100,
    });
    await db.ensureReady();

    const start = performance.now();
    const burstPromises = [];

    // Push 45 events (< batchSize) which should be synchronous in-memory pushes
    for (let i = 0; i < 45; i++) {
      burstPromises.push(
        db.insertCausalEvent({
          event_id: `EVT-BURST-${i}`,
          timestamp: 4000000 + i,
          event_type: "BURST_TEST",
          source: "TEST",
          correlation_id: "CORR-BURST",
          payload: { i },
          context: {},
          hash: `HASH-BURST-${i}`,
        }),
      );
    }

    await Promise.all(burstPromises);
    const duration = performance.now() - start;

    // In-memory buffer pushes should take less than 500ms total for 45 events
    expect(duration).toBeLessThan(500);
    expect(db._causalBuffer.length).toBe(45);

    // Final flush commits all 45
    await db.flushCausalEvents();
    const rows = await db.getCausalEventsByCorrelation("CORR-BURST");
    expect(rows).toHaveLength(45);

    await db.close();
  });

  it("6. Extreme Load & High Event Volume: 3000 events with concurrent reads and WAL checkpoints", async () => {
    const dbPath = getTestDbPath("extreme_load");
    const db = new CausalMemoryDB(dbPath, {
      batchSize: 40,
      flushIntervalMs: 25,
    });
    await db.ensureReady();

    const TOTAL_EVENTS = 3000;
    const insertPromises = [];

    // Rapidly push 3000 events
    for (let i = 0; i < TOTAL_EVENTS; i++) {
      insertPromises.push(
        db.insertCausalEvent({
          event_id: `EVT-EXTREME-${i}`,
          timestamp: 5000000 + i,
          event_type: "EXTREME_STRESS",
          source: "STRESS_HARNESS",
          correlation_id: `CORR-GROUP-${i % 10}`,
          payload: { val: i * 2 },
          context: { test: "extreme" },
          hash: `HASH-EXTREME-${i}`,
        }),
      );

      // Periodically trigger concurrent WAL checkpoint & reads during write storm
      if (i > 0 && i % 600 === 0) {
        insertPromises.push(db.walCheckpoint("PASSIVE"));
        insertPromises.push(db.getLastCausalEventHash());
      }
    }

    await Promise.all(insertPromises);
    await db.flushCausalEvents();

    expect(db._causalBuffer.length).toBe(0);

    // Verify all 10 correlation groups have exactly 300 events each (3000 total)
    for (let group = 0; group < 10; group++) {
      const groupEvents = await db.getCausalEventsByCorrelation(
        `CORR-GROUP-${group}`,
      );
      expect(groupEvents).toHaveLength(TOTAL_EVENTS / 10);
    }

    const lastHash = await db.getLastCausalEventHash();
    expect(lastHash).toBe(`HASH-EXTREME-${TOTAL_EVENTS - 1}`);

    await db.close();
  });

  it("7. Error Recovery & Lock Release: SQLite error during batch flush rolls back and resets mutex cleanly", async () => {
    const dbPath = getTestDbPath("error_recovery");
    const db = new CausalMemoryDB(dbPath, {
      batchSize: 10,
      flushIntervalMs: 10000,
    });
    await db.ensureReady();

    // 1. Insert a valid event and flush it
    await db.insertCausalEvent({
      event_id: "EVT-DUPLICATE-KEY",
      timestamp: 6000000,
      event_type: "ORIGINAL",
      source: "TEST",
      correlation_id: "CORR-ERR",
      payload: {},
      context: {},
      hash: "HASH-ORIGINAL",
    });
    await db.flushCausalEvents();

    const existing = await db.getCausalEventsByCorrelation("CORR-ERR");
    expect(existing).toHaveLength(1);

    // 2. Queue a batch containing the duplicate event_id (which violates UNIQUE constraint)
    await db.insertCausalEvent({
      event_id: "EVT-DUPLICATE-KEY", // Duplicate key!
      timestamp: 6000001,
      event_type: "DUPLICATE",
      source: "TEST",
      correlation_id: "CORR-ERR",
      payload: {},
      context: {},
      hash: "HASH-DUP",
    });

    // 3. Attempting to flush should reject with SQLite constraint error
    const flushP = db.flushCausalEvents();
    if (db._flushPromise) {
      db._flushPromise.catch(() => {});
    }
    await expect(flushP).rejects.toThrow();

    // 4. Verify that mutex was released and database is not deadlocked
    expect(db._isFlushing).toBe(false);
    expect(db._flushPromise).toBe(null);

    // 5. Clear the erroneous event from buffer and verify subsequent operations succeed
    db._causalBuffer = [];
    await db.insertCausalEvent({
      event_id: "EVT-RECOVERED",
      timestamp: 6000002,
      event_type: "RECOVERED",
      source: "TEST",
      correlation_id: "CORR-ERR",
      payload: {},
      context: {},
      hash: "HASH-RECOVERED",
    });
    await db.flushCausalEvents();

    const recoveredRows = await db.getCausalEventsByCorrelation("CORR-ERR");
    expect(recoveredRows).toHaveLength(2);
    expect(recoveredRows[1].event_id).toBe("EVT-RECOVERED");

    await db.close();
  });
});
