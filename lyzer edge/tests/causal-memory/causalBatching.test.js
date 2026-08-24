import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { CausalMemoryDB } from "../../backend/db.js";

let testDbPath;
let activeDbs = [];

function getTestDbPath() {
  return path.join(
    os.tmpdir(),
    `test_causal_batching_${Date.now()}_${Math.random().toString(36).slice(2)}.db`,
  );
}

function createDb(dbPath, options) {
  const db = new CausalMemoryDB(dbPath, options);
  activeDbs.push(db);
  return db;
}

async function cleanupDb(dbPath) {
  for (const db of activeDbs) {
    try {
      await db.close();
    } catch (_err) {
      // ignore already closed
    }
  }
  activeDbs = [];

  if (dbPath) {
    try {
      fs.rmSync(dbPath, { force: true });
    } catch (_err) {
      // ignore unlink error
    }
    try {
      fs.rmSync(`${dbPath}-wal`, { force: true });
    } catch (_err) {
      // ignore unlink error
    }
    try {
      fs.rmSync(`${dbPath}-shm`, { force: true });
    } catch (_err) {
      // ignore unlink error
    }
  }
}

describe("Asynchronous Causal Batching Suite (Milestone 2 - R2)", () => {
  beforeEach(() => {
    testDbPath = getTestDbPath();
    activeDbs = [];
  });
  afterEach(async () => {
    await cleanupDb(testDbPath);
  });

  it("buffers events and auto-flushes when batch size threshold is reached", async () => {
    const db = createDb(testDbPath, {
      batchSize: 5,
      flushIntervalMs: 5000,
    });
    await db.ensureReady();

    // Insert 4 events (< batchSize 5)
    for (let i = 1; i <= 4; i++) {
      await db.insertCausalEvent({
        event_id: `EVT-${i}`,
        timestamp: 1000 + i,
        event_type: "TEST_EVENT",
        source: "TEST",
        correlation_id: "CORR-1",
        hash: `HASH-${i}`,
      });
    }
    expect(db._causalBuffer.length).toBe(4);

    // 5th event triggers batch flush
    await db.insertCausalEvent({
      event_id: `EVT-5`,
      timestamp: 1005,
      event_type: "TEST_EVENT",
      source: "TEST",
      correlation_id: "CORR-1",
      hash: `HASH-5`,
    });

    expect(db._causalBuffer.length).toBe(0);

    const rows = await db.getCausalEventsByCorrelation("CORR-1");
    expect(rows).toHaveLength(5);
    expect(rows[4].event_id).toBe("EVT-5");

    await db.close();
  });

  it("periodically flushes events based on interval timer", async () => {
    const db = createDb(testDbPath, {
      batchSize: 50,
      flushIntervalMs: 50,
    });
    await db.ensureReady();

    await db.insertCausalEvent({
      event_id: "EVT-TIMER-1",
      timestamp: 2000,
      event_type: "TEST_TIMER",
      source: "TEST",
      correlation_id: "CORR-TIMER",
      hash: "HASH-TIMER-1",
    });

    expect(db._causalBuffer.length).toBe(1);

    // Wait for timer flush
    await new Promise((r) => setTimeout(r, 120));
    expect(db._causalBuffer.length).toBe(0);

    const rows = await db.getCausalEventsByCorrelation("CORR-TIMER");
    expect(rows).toHaveLength(1);

    await db.close();
  });

  it("guarantees query flush consistency before read operations", async () => {
    const db = createDb(testDbPath, {
      batchSize: 100,
      flushIntervalMs: 10000,
    });
    await db.ensureReady();

    await db.insertCausalEvent({
      event_id: "EVT-QUERY-1",
      timestamp: 3000,
      event_type: "TEST_READ",
      source: "TEST",
      correlation_id: "CORR-QUERY",
      hash: "HASH-QUERY-1",
    });

    // Buffer has 1 item, not yet flushed by size or timer
    expect(db._causalBuffer.length).toBe(1);

    // getLastCausalEventHash automatically flushes buffer before query
    const lastHash = await db.getLastCausalEventHash();
    expect(lastHash).toBe("HASH-QUERY-1");
    expect(db._causalBuffer.length).toBe(0);

    await db.close();
  });

  it("flushes in-flight events cleanly during db.close()", async () => {
    const db = createDb(testDbPath, {
      batchSize: 100,
      flushIntervalMs: 10000,
    });
    await db.ensureReady();

    await db.insertCausalEvent({
      event_id: "EVT-CLOSE-1",
      timestamp: 4000,
      event_type: "TEST_CLOSE",
      source: "TEST",
      correlation_id: "CORR-CLOSE",
      hash: "HASH-CLOSE-1",
    });

    expect(db._causalBuffer.length).toBe(1);

    await db.close();
    expect(db._causalBuffer.length).toBe(0);

    // Reopen and check persistence
    const db2 = createDb(testDbPath);
    await db2.ensureReady();
    const rows = await db2.getCausalEventsByCorrelation("CORR-CLOSE");
    expect(rows).toHaveLength(1);
    expect(rows[0].event_id).toBe("EVT-CLOSE-1");

    await db2.close();
  });
});
