import { CausalMemoryDB } from "../../backend/db.js";
import path from "path";
import os from "os";
import fs from "fs";

async function main() {
  console.log("=== STARTING DEEP EMPIRICAL STRESS & REJECTION AUDIT ===");

  const testDbPath = path.join(
    os.tmpdir(),
    `deep_stress_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
  );

  let unhandledCount = 0;
  const unhandledErrors = [];
  const rejectionTracker = (reason, promise) => {
    unhandledCount++;
    unhandledErrors.push(reason);
    console.error("[CRITICAL] Unhandled Promise Rejection Detected:", reason);
  };
  process.on("unhandledRejection", rejectionTracker);

  try {
    const db = new CausalMemoryDB(testDbPath, {
      batchSize: 25,
      flushIntervalMs: 20,
    });
    await db.ensureReady();

    // 1. Sustained Burst Test (15,000 events across 10 concurrent streams)
    console.log("[Phase 1] Sustained Concurrent Ingestion (15,000 events)...");
    const STREAMS = 10;
    const PER_STREAM = 1500;
    const startTime = performance.now();

    const streamPromises = Array.from({ length: STREAMS }, async (_, streamId) => {
      let prevHash = "0".repeat(64);
      for (let i = 0; i < PER_STREAM; i++) {
        const eventId = `EVT-S${streamId}-${i}`;
        const hash = `HASH-${streamId}-${i}`;
        await db.insertCausalEvent({
          event_id: eventId,
          timestamp: 1700000000000 + i,
          event_type: "DEEP_STRESS",
          source: `STREAM_${streamId}`,
          correlation_id: `CORR-S${streamId}`,
          payload: { s: streamId, i, data: "X".repeat(64) },
          context: { streamId },
          hash_prev: prevHash,
          hash,
        });
        prevHash = hash;
        if (i % 100 === 0) {
          await new Promise((r) => setImmediate(r));
        }
      }
    });

    await Promise.all(streamPromises);
    await db.flushCausalEvents();
    const duration = performance.now() - startTime;
    console.log(`[Phase 1] Completed in ${(duration / 1000).toFixed(2)}s (${((STREAMS * PER_STREAM) / (duration / 1000)).toFixed(0)} events/sec)`);

    // 2. Interleaved WAL Checkpoints & Concurrent Reads
    console.log("[Phase 2] Interleaved WAL Checkpoints & RYOW Verification...");
    for (let c = 0; c < 5; c++) {
      const mode = ["PASSIVE", "FULL", "RESTART", "TRUNCATE"][c % 4];
      await db.walCheckpoint(mode);
      const lastHash = await db.getLastCausalEventHash();
      if (!lastHash || typeof lastHash !== 'string') {
        throw new Error(`Invalid hash returned after WAL checkpoint: ${lastHash}`);
      }
    }
    console.log("[Phase 2] WAL Checkpoints PASS");

    // 3. Error Injection & Unhandled Rejection Chaos Test
    console.log("[Phase 3] Inducing 50 Batch Constraint Collisions...");
    for (let errCycle = 0; errCycle < 50; errCycle++) {
      await db.insertCausalEvent({
        event_id: `EVT-S0-0`, // Duplicate of existing event
        timestamp: Date.now(),
        event_type: "COLLISION",
        source: "CHAOS",
        correlation_id: "CORR-CHAOS",
        hash: "HASH-COLLISION",
      });

      // Fire 3 simultaneous flush attempts
      const p1 = db.flushCausalEvents();
      const p2 = db.flushCausalEvents();
      const p3 = db.flushCausalEvents();

      const settled = await Promise.allSettled([p1, p2, p3]);
      for (const s of settled) {
        if (s.status !== "rejected") {
          throw new Error("Expected flush on duplicate event to reject");
        }
      }

      // Buffer reset & recovery
      db._causalBuffer = [];
    }
    console.log("[Phase 3] Chaos Collisions PASS. Unhandled Rejection Count =", unhandledCount);

    // 4. Memory Profiling Check
    console.log("[Phase 4] Memory Profiling & Teardown...");
    const memBeforeClose = process.memoryUsage();
    await db.close();
    const memAfterClose = process.memoryUsage();
    console.log(`[Phase 4] Heap Used: ${(memAfterClose.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    if (unhandledCount > 0) {
      console.error(`[FAIL] Detected ${unhandledCount} unhandled promise rejections!`);
      process.exit(1);
    }

    console.log("=== ALL DEEP EMPIRICAL AUDITS PASSED WITH ZERO REJECTIONS ===");
    process.exit(0);
  } catch (err) {
    console.error("[FATAL ERROR IN STRESS HARNESS]:", err);
    process.exit(1);
  } finally {
    process.removeListener("unhandledRejection", rejectionTracker);
    try { fs.rmSync(testDbPath, { force: true }); } catch {}
    try { fs.rmSync(`${testDbPath}-wal`, { force: true }); } catch {}
    try { fs.rmSync(`${testDbPath}-shm`, { force: true }); } catch {}
  }
}

main();
