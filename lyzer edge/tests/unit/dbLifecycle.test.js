import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { CausalMemoryDB, runMigrations, runTTLCleanup } from '../../backend/db.js';
import { ConstitutionalLedger } from '../../../packages/lyzer-constitution/src/eca/ledger.js';

const TEST_DB_PATH = path.join(process.cwd(), 'test_db_lifecycle.db');

function cleanupDbFile() {
  if (fs.existsSync(TEST_DB_PATH)) {
    try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
  }
  const walFile = `${TEST_DB_PATH}-wal`;
  const shmFile = `${TEST_DB_PATH}-shm`;
  if (fs.existsSync(walFile)) { try { fs.unlinkSync(walFile); } catch (e) {} }
  if (fs.existsSync(shmFile)) { try { fs.unlinkSync(shmFile); } catch (e) {} }
}

describe('Database Schema Migrations & DB Lifecycle (Milestone 3)', () => {
  beforeEach(() => {
    cleanupDbFile();
  });

  afterEach(() => {
    cleanupDbFile();
  });

  it('executes schema migrations v1-v4 transactionally and bumps PRAGMA user_version to 4', async () => {
    const rawDb = new sqlite3.Database(TEST_DB_PATH);
    
    // Initial user_version should be 0
    const initialVersion = await new Promise((resolve) => {
      rawDb.get('PRAGMA user_version;', (err, row) => resolve(row.user_version));
    });
    expect(initialVersion).toBe(0);

    // Run migrations v1-v4
    const result = await runMigrations(rawDb);
    expect(result.currentVersion).toBe(4);
    expect(result.appliedCount).toBe(4);

    // Check PRAGMA user_version is 4
    const finalVersion = await new Promise((resolve) => {
      rawDb.get('PRAGMA user_version;', (err, row) => resolve(row.user_version));
    });
    expect(finalVersion).toBe(4);

    // Check _migrations table entries
    const migrationRows = await new Promise((resolve) => {
      rawDb.all('SELECT * FROM _migrations ORDER BY version ASC', [], (err, rows) => resolve(rows));
    });
    expect(migrationRows).toHaveLength(4);
    expect(migrationRows.map(m => m.version)).toEqual([1, 2, 3, 4]);

    // Check tables exist
    const tables = await new Promise((resolve) => {
      rawDb.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, rows) => resolve(rows.map(r => r.name)));
    });
    expect(tables).toContain('candles');
    expect(tables).toContain('causal_events_log');
    expect(tables).toContain('court_ledger');
    expect(tables).toContain('cer_evidence');
    expect(tables).toContain('experiment_trades');
    expect(tables).toContain('experiment_snapshots');

    // Idempotency: re-running migrations does nothing and returns 0 applied
    const reRun = await runMigrations(rawDb);
    expect(reRun.currentVersion).toBe(4);
    expect(reRun.appliedCount).toBe(0);

    await new Promise((resolve) => rawDb.close(resolve));
  });

  it('performs batch TTL cleanup preserving CHAMPION and ARCHIVED trades', async () => {
    const dbInstance = new CausalMemoryDB(TEST_DB_PATH);
    await dbInstance.migrationsPromise;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const sqliteDb = dbInstance.db;

    // Insert test candles (100d old vs 10d old)
    await new Promise((resolve) => {
      sqliteDb.serialize(() => {
        sqliteDb.run(`INSERT INTO candles (symbol, timeframe, timestamp, open, high, low, close, volume, close_time) VALUES ('BTCUSDT', '1h', ?, 50000, 51000, 49000, 50500, 10, ?)`, [now - 100 * dayMs, now - 100 * dayMs]);
        sqliteDb.run(`INSERT INTO candles (symbol, timeframe, timestamp, open, high, low, close, volume, close_time) VALUES ('BTCUSDT', '1h', ?, 50000, 51000, 49000, 50500, 10, ?)`, [now - 10 * dayMs, now - 10 * dayMs], resolve);
      });
    });

    // Insert causal events (40d old vs 5d old)
    await new Promise((resolve) => {
      sqliteDb.serialize(() => {
        sqliteDb.run(`INSERT INTO causal_events_log (event_id, timestamp, event_type, source, correlation_id, hash_prev, epistemic_regime, payload, context, hash) VALUES ('EVT-OLD', ?, 'TEST', 'TEST', 'CORR-1', '00', 'REGIME_A', '{}', '{}', 'HASH1')`, [now - 40 * dayMs]);
        sqliteDb.run(`INSERT INTO causal_events_log (event_id, timestamp, event_type, source, correlation_id, hash_prev, epistemic_regime, payload, context, hash) VALUES ('EVT-NEW', ?, 'TEST', 'TEST', 'CORR-2', '00', 'REGIME_A', '{}', '{}', 'HASH2')`, [now - 5 * dayMs], resolve);
      });
    });

    // Insert CER evidence (20d old vs 2d old)
    await new Promise((resolve) => {
      sqliteDb.serialize(() => {
        sqliteDb.run(`INSERT INTO cer_evidence (evidence_id, timestamp, source, evidence_type, data_json, created_at) VALUES ('CER-OLD', ?, 'SRC', 'TYPE', '{}', ?)`, [now - 20 * dayMs, now - 20 * dayMs]);
        sqliteDb.run(`INSERT INTO cer_evidence (evidence_id, timestamp, source, evidence_type, data_json, created_at) VALUES ('CER-NEW', ?, 'SRC', 'TYPE', '{}', ?)`, [now - 2 * dayMs, now - 2 * dayMs], resolve);
      });
    });

    // Insert experiment_trades (70d old scratch, 70d old CHAMPION, 70d old ARCHIVED, 5d old scratch)
    await new Promise((resolve) => {
      sqliteDb.serialize(() => {
        sqliteDb.run(`INSERT INTO experiment_trades (trade_id, experiment_id, symbol, direction, entry_price, status, entry_timestamp, created_at) VALUES ('T-SCRATCH-OLD', 'EXP-001', 'BTC', 'BUY', 50000, 'closed', ?, ?)`, [now - 70 * dayMs, now - 70 * dayMs]);
        sqliteDb.run(`INSERT INTO experiment_trades (trade_id, experiment_id, symbol, direction, entry_price, status, entry_timestamp, created_at) VALUES ('T-CHAMPION-OLD', 'EXP-001', 'BTC', 'BUY', 50000, 'CHAMPION', ?, ?)`, [now - 70 * dayMs, now - 70 * dayMs]);
        sqliteDb.run(`INSERT INTO experiment_trades (trade_id, experiment_id, symbol, direction, entry_price, status, entry_timestamp, created_at) VALUES ('T-ARCHIVED-OLD', 'EXP-001', 'BTC', 'BUY', 50000, 'ARCHIVED', ?, ?)`, [now - 70 * dayMs, now - 70 * dayMs]);
        sqliteDb.run(`INSERT INTO experiment_trades (trade_id, experiment_id, symbol, direction, entry_price, status, entry_timestamp, created_at) VALUES ('T-SCRATCH-NEW', 'EXP-001', 'BTC', 'BUY', 50000, 'closed', ?, ?)`, [now - 5 * dayMs, now - 5 * dayMs], resolve);
      });
    });

    // Run TTL cleanup
    const stats = await runTTLCleanup(dbInstance, { now, batchLimit: 5000 });
    expect(stats.deleted.candles).toBe(1);
    expect(stats.deleted.causal_events_log).toBe(1);
    expect(stats.deleted.cer_evidence).toBe(1);
    expect(stats.deleted.experiment_trades).toBe(1); // Only scratch old trade deleted

    // Verify remaining experiment_trades
    const remainingTrades = await new Promise((resolve) => {
      sqliteDb.all('SELECT trade_id, status FROM experiment_trades', [], (err, rows) => resolve(rows));
    });
    const remainingIds = remainingTrades.map(t => t.trade_id);
    expect(remainingIds).toContain('T-CHAMPION-OLD');
    expect(remainingIds).toContain('T-ARCHIVED-OLD');
    expect(remainingIds).toContain('T-SCRATCH-NEW');
    expect(remainingIds).not.toContain('T-SCRATCH-OLD');

    await dbInstance.close();
  });

  it('persists Constitutional Court records and restores near-miss counters across restarts', async () => {
    // 1. Boot system instance 1
    const dbInstance1 = new CausalMemoryDB(TEST_DB_PATH);
    await dbInstance1.migrationsPromise;

    const ledgerInstance1 = new ConstitutionalLedger(dbInstance1);

    // Record drawdown near-miss
    const token1 = { id: 'TOK-001', granted: true, reason: 'APPROVED_WITHIN_LIMITS' };
    const request1 = { action: 'EXECUTE_ORDER', symbol: 'BTCUSDT' };
    const stateNearMiss = { currentDrawdown: 0.048 }; // 4.8% drawdown (96% of 5% max drawdown -> near miss!)

    ledgerInstance1.appendRecord(request1, token1, stateNearMiss, 'drawdown');
    expect(ledgerInstance1.getNearMissCount('drawdown')).toBe(1);

    // Record another drawdown near miss
    const token2 = { id: 'TOK-002', granted: true, reason: 'APPROVED_WITHIN_LIMITS' };
    ledgerInstance1.appendRecord(request1, token2, stateNearMiss, 'drawdown');
    expect(ledgerInstance1.getNearMissCount('drawdown')).toBe(2);

    // Wait a brief tick to ensure SQLite async writes flush
    await new Promise(r => setTimeout(r, 100));
    await dbInstance1.close();

    // 2. Simulate server restart: create new fresh DB and ConstitutionalLedger
    const dbInstance2 = new CausalMemoryDB(TEST_DB_PATH);
    await dbInstance2.migrationsPromise;

    const ledgerInstance2 = new ConstitutionalLedger(dbInstance2);
    expect(ledgerInstance2.getNearMissCount('drawdown')).toBe(0); // Unhydrated initial state

    // 3. Perform startup hydration routine loadFromDb()
    const hydrated = await ledgerInstance2.loadFromDb(dbInstance2);
    expect(hydrated).toBe(true);

    // 4. Verify historical entries and edgeRidingCounters are fully restored across process restart!
    expect(ledgerInstance2.exportLedger()).toHaveLength(2);
    expect(ledgerInstance2.getNearMissCount('drawdown')).toBe(2);

    await dbInstance2.close();
  });
});
