import { CausalMemoryDB } from "../../backend/db.js";
import path from "path";
import os from "os";
import fs from "fs";
import crypto from "crypto";

function sha256(data) {
  return crypto.createHash("sha256").update(typeof data === "string" ? data : JSON.stringify(data)).digest("hex");
}

async function runChallenger3Stress() {
  console.log("================================================================================");
  console.log("      CHALLENGER 3 — EMPIRICAL ADVERSARIAL STRESS & ORACLE HARNESS");
  console.log("================================================================================");

  const testDbPath = path.join(
    os.tmpdir(),
    `challenger3_stress_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
  );

  let unhandledRejections = [];
  const rejectionHandler = (reason, promise) => {
    unhandledRejections.push(reason);
    console.error("[CHALLENGER-3 ERROR] Unhandled Promise Rejection Detected:", reason);
  };
  process.on("unhandledRejection", rejectionHandler);

  try {
    const db = new CausalMemoryDB(testDbPath, {
      batchSize: 30,
      flushIntervalMs: 25,
    });
    await db.ensureReady();

    // -------------------------------------------------------------------------
    // TEST SUITE 1: Massive Concurrent Stream Ingestion (20 Streams, 500 events each = 10,000 events)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] High Concurrency Stress: 20 Streams x 500 Events = 10,000 total events...");
    const NUM_STREAMS = 20;
    const EVENTS_PER_STREAM = 500;
    const streamHashes = new Map();

    const t0 = performance.now();
    const streamPromises = Array.from({ length: NUM_STREAMS }, async (_, streamIdx) => {
      let prevHash = "0".repeat(64);
      for (let i = 0; i < EVENTS_PER_STREAM; i++) {
        const eventId = `EVT-S${streamIdx.toString().padStart(2, "0")}-${i.toString().padStart(4, "0")}`;
        const payload = { streamIdx, seq: i, timestamp: 1700000000000 + i * 10, price: 50000 + streamIdx * 100 + i };
        const currentHash = sha256({ eventId, payload, prevHash });

        await db.insertCausalEvent({
          event_id: eventId,
          timestamp: payload.timestamp,
          event_type: "HIGH_LOAD_TICK",
          source: `STREAM_${streamIdx}`,
          causation_id: i > 0 ? `EVT-S${streamIdx.toString().padStart(2, "0")}-${(i - 1).toString().padStart(4, "0")}` : null,
          correlation_id: `CORR-STREAM-${streamIdx}`,
          intent_id: `INTENT-S${streamIdx}-${i}`,
          parent_event: null,
          version: "1.0.0",
          hash_prev: prevHash,
          epistemic_regime: "REGIME_A_CONSENSUS",
          payload,
          context: { streamIdx, seq: i },
          hash: currentHash,
        });

        prevHash = currentHash;

        if (i % 50 === 0) {
          await new Promise((r) => setImmediate(r));
        }
      }
      streamHashes.set(streamIdx, prevHash);
    });

    await Promise.all(streamPromises);
    await db.flushCausalEvents();
    const t1 = performance.now();
    const durationSec = (t1 - t0) / 1000;
    console.log(`[TEST 1 PASS] 10,000 events ingested in ${durationSec.toFixed(2)}s (${(10000 / durationSec).toFixed(0)} events/sec)`);

    // Verify all stream chains and record integrity
    for (let streamIdx = 0; streamIdx < NUM_STREAMS; streamIdx++) {
      const rows = await db.getCausalEventsByCorrelation(`CORR-STREAM-${streamIdx}`);
      if (rows.length !== EVENTS_PER_STREAM) {
        throw new Error(`Stream ${streamIdx} expected ${EVENTS_PER_STREAM} rows, got ${rows.length}`);
      }
      for (let i = 0; i < rows.length; i++) {
        if (i > 0) {
          if (rows[i].hash_prev !== rows[i - 1].hash) {
            throw new Error(`Hash chain broken in stream ${streamIdx} at index ${i}`);
          }
        }
      }
    }
    console.log(`[TEST 1 PASS] Hash chain integrity verified for all 20 concurrent streams.`);

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Concurrent Multi-Reader & RYOW Stress with Interleaved Checkpoints
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Concurrent Readers vs Writers with Interleaved WAL Checkpoints & RYOW...");
    let liveWritesDone = false;
    let totalLiveWrites = 0;

    const writerPromise = (async () => {
      for (let i = 0; i < 2000; i++) {
        await db.insertCausalEvent({
          event_id: `EVT-LIVE-${i}`,
          timestamp: 1800000000000 + i,
          event_type: "LIVE_STREAM",
          source: "LIVE_PRODUCER",
          correlation_id: "CORR-LIVE-STREAM",
          payload: { liveIndex: i },
          context: {},
          hash: `HASH-LIVE-${i}`,
        });
        totalLiveWrites++;

        if (i > 0 && i % 400 === 0) {
          await db.walCheckpoint("PASSIVE");
        }

        if (i % 20 === 0) {
          await new Promise((r) => setImmediate(r));
        }
      }
      liveWritesDone = true;
    })();

    const readerPromises = Array.from({ length: 4 }, async (_, rIdx) => {
      let lastCount = 0;
      while (!liveWritesDone || lastCount < 2000) {
        const events = await db.getCausalEventsByCorrelation("CORR-LIVE-STREAM");
        if (events.length < lastCount) {
          throw new Error(`Reader ${rIdx} observed non-monotonic count: prev=${lastCount}, current=${events.length}`);
        }
        lastCount = events.length;
        const lastHash = await db.getLastCausalEventHash();
        if (typeof lastHash !== "string" || lastHash.length === 0) {
          throw new Error(`Reader ${rIdx} received invalid lastHash: ${lastHash}`);
        }
        await new Promise((r) => setTimeout(r, 10));
      }
    });

    await Promise.all([writerPromise, ...readerPromises]);
    await db.flushCausalEvents();

    // Post-stream full truncate checkpoint
    await db.walCheckpoint("TRUNCATE");

    const finalLiveEvents = await db.getCausalEventsByCorrelation("CORR-LIVE-STREAM");
    if (finalLiveEvents.length !== 2000) {
      throw new Error(`Expected 2000 live stream events, found ${finalLiveEvents.length}`);
    }
    console.log(`[TEST 2 PASS] Concurrent RYOW & WAL Checkpoints passed without data loss or race corruption.`);

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Adversarial Error Injection & Zero-Unhandled-Rejection Verification
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Adversarial Error Injection (100 Chaos Cycles with 5 Concurrent Flushers)...");

    // Insert a known seed event
    await db.insertCausalEvent({
      event_id: "EVT-CONFLICT-SEED",
      timestamp: 1900000000000,
      event_type: "SEED",
      source: "TEST",
      correlation_id: "CORR-CHAOS-REJECTION",
      hash: "HASH-SEED",
    });
    await db.flushCausalEvents();

    for (let cycle = 0; cycle < 100; cycle++) {
      // Intentionally insert duplicate key into buffer
      await db.insertCausalEvent({
        event_id: "EVT-CONFLICT-SEED", // DUPLICATE KEY CONFLICT!
        timestamp: 1900000000000 + cycle,
        event_type: "CHAOS_DUP",
        source: "CHAOS",
        correlation_id: "CORR-CHAOS-REJECTION",
        hash: `HASH-CHAOS-${cycle}`,
      });

      // Fire 5 simultaneous flush attempts at the exact same moment
      const flushes = [
        db.flushCausalEvents(),
        db.flushCausalEvents(),
        db.flushCausalEvents(),
        db.flushCausalEvents(),
        db.flushCausalEvents(),
      ];

      const settled = await Promise.allSettled(flushes);
      for (const s of settled) {
        if (s.status !== "rejected") {
          throw new Error(`Cycle ${cycle}: Expected flush to reject due to duplicate key, but received ${s.status}`);
        }
      }

      // Mutex lock must be released immediately
      if (db._isFlushing !== false || db._flushPromise !== null) {
        throw new Error(`Cycle ${cycle}: Mutex state dirty after error! _isFlushing=${db._isFlushing}, _flushPromise=${db._flushPromise}`);
      }

      // Clear the conflicting buffer entry and verify database can resume normal operation
      db._causalBuffer = [];

      await db.insertCausalEvent({
        event_id: `EVT-RECOVERED-${cycle}`,
        timestamp: 1950000000000 + cycle,
        event_type: "RECOVERED_EVENT",
        source: "TEST",
        correlation_id: "CORR-RECOVERED",
        hash: `HASH-REC-${cycle}`,
      });
      await db.flushCausalEvents();
    }

    const recoveredCount = (await db.getCausalEventsByCorrelation("CORR-RECOVERED")).length;
    if (recoveredCount !== 100) {
      throw new Error(`Expected 100 recovered events, got ${recoveredCount}`);
    }

    console.log(`[TEST 3 PASS] 100 Error Injection Cycles completed. Unhandled Rejection Count: ${unhandledRejections.length}`);

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Clean Teardown, In-Flight Persistence, and Reopen Verification
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Database Teardown & In-Flight Buffer Persistence Check...");

    // Buffer 75 events (< batchSize 30 * 3, leave uncommitted)
    for (let i = 0; i < 75; i++) {
      await db.insertCausalEvent({
        event_id: `EVT-TEARDOWN-${i}`,
        timestamp: 2000000000000 + i,
        event_type: "TEARDOWN_TEST",
        source: "TEST",
        correlation_id: "CORR-TEARDOWN",
        hash: `HASH-TEARDOWN-${i}`,
      });
    }

    // Explicitly call close() which must flush buffer before terminating connection
    await db.close();

    // Reconnect to the same database file from disk
    const dbReopen = new CausalMemoryDB(testDbPath);
    await dbReopen.ensureReady();

    const teardownRows = await dbReopen.getCausalEventsByCorrelation("CORR-TEARDOWN");
    if (teardownRows.length !== 75) {
      throw new Error(`Expected 75 persisted events upon reopen, found ${teardownRows.length}`);
    }
    await dbReopen.close();
    console.log(`[TEST 4 PASS] Clean teardown and cold reload successfully verified 100% data persistence.`);

    // -------------------------------------------------------------------------
    // FINAL AUDIT
    // -------------------------------------------------------------------------
    console.log("\n================================================================================");
    if (unhandledRejections.length === 0) {
      console.log("  >>> CHALLENGER 3 VERDICT: ALL TESTS PASSED — 0 UNHANDLED REJECTIONS <<<");
    } else {
      console.error(`  >>> CHALLENGER 3 VERDICT: FAILED — ${unhandledRejections.length} UNHANDLED REJECTIONS DETECTED <<<`);
      process.exit(1);
    }
    console.log("================================================================================");
    process.exit(0);
  } catch (err) {
    console.error("[CHALLENGER-3 FATAL ERROR]:", err);
    process.exit(1);
  } finally {
    process.removeListener("unhandledRejection", rejectionHandler);
    try { fs.rmSync(testDbPath, { force: true }); } catch {}
    try { fs.rmSync(`${testDbPath}-wal`, { force: true }); } catch {}
    try { fs.rmSync(`${testDbPath}-shm`, { force: true }); } catch {}
  }
}

runChallenger3Stress();
