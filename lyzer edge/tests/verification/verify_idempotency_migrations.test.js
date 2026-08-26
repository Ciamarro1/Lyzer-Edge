import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { CausalMemoryDB } from '../../backend/db.js';
import { runMigrations } from '../../backend/migrations.js';
import { generateUUIDv7 } from '../../src/causal-memory/EventFactory.js';

const TEST_DB_PATH = path.join(process.cwd(), 'temp_test_idempotency_vitest.db');

function cleanup() {
  if (fs.existsSync(TEST_DB_PATH)) {
    try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
  }
}

describe('Migration v5 & Idempotency Zero Entropy Suite', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('Migration v5 transforms trade_id to PRIMARY KEY NOT NULL and deduplicates legacy records', async () => {
    const rawDb = new sqlite3.Database(TEST_DB_PATH);

    // Create legacy table with user_version = 4
    await new Promise((resolve, reject) => {
      rawDb.serialize(() => {
        rawDb.run(`
          CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            executed_at INTEGER NOT NULL
          )
        `);
        rawDb.run(`
          CREATE TABLE IF NOT EXISTS experiment_trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trade_id TEXT NOT NULL,
            experiment_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            direction TEXT NOT NULL,
            entry_price REAL NOT NULL,
            exit_price REAL,
            stop_loss REAL,
            take_profit REAL,
            quantity REAL,
            pnl REAL,
            pnl_pct REAL,
            status TEXT NOT NULL DEFAULT 'open',
            signal_json TEXT,
            regime TEXT,
            governance_decision TEXT,
            reason_codes_json TEXT,
            ev_json TEXT,
            entry_timestamp INTEGER NOT NULL,
            exit_timestamp INTEGER,
            created_at INTEGER NOT NULL
          )
        `);

        // Duplicate rows for the same trade_id
        rawDb.run(`
          INSERT INTO experiment_trades (trade_id, experiment_id, symbol, direction, entry_price, status, entry_timestamp, created_at)
          VALUES ('LEGACY-TRADE-001', 'EXP-001', 'BTCUSDT', 'LONG', 50000, 'open', 1000, 1000)
        `);
        rawDb.run(`
          INSERT INTO experiment_trades (trade_id, experiment_id, symbol, direction, entry_price, exit_price, pnl, status, entry_timestamp, created_at)
          VALUES ('LEGACY-TRADE-001', 'EXP-001', 'BTCUSDT', 'LONG', 50000, 52000, 2000, 'closed', 1000, 1100)
        `);

        rawDb.run(`PRAGMA user_version = 4;`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    const result = await runMigrations(rawDb);
    expect(result.currentVersion).toBeGreaterThanOrEqual(5);

    // Verify trade_id is PK
    const columns = await new Promise((resolve, reject) => {
      rawDb.all(`PRAGMA table_info(experiment_trades)`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const tradeIdCol = columns.find(c => c.name === 'trade_id');
    expect(tradeIdCol).toBeDefined();
    expect(tradeIdCol.pk).toBe(1);

    // Verify deduplication
    const rows = await new Promise((resolve, reject) => {
      rawDb.all(`SELECT * FROM experiment_trades WHERE trade_id = 'LEGACY-TRADE-001'`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('closed');
    expect(rows[0].exit_price).toBe(52000);

    await new Promise((resolve) => rawDb.close(resolve));
  });

  it('Native UPSERT is 100% idempotent across 1x, 10x, and 100x calls', async () => {
    const db = new CausalMemoryDB(TEST_DB_PATH);
    await db.ensureReady();

    const tradeId = `trade_${generateUUIDv7()}`;
    const testTrade = {
      trade_id: tradeId,
      symbol: 'ETHUSDT',
      direction: 'SHORT',
      entryPrice: 3200,
      stopLoss: 3300,
      takeProfit: 3000,
      quantity: 5,
      status: 'open',
      timestamp: Date.now()
    };

    // 1x
    await db.insertExperimentTrade('EXP-001', testTrade);
    let trades = (await db.getExperimentTrades('EXP-001')).filter(t => t.trade_id === tradeId);
    expect(trades.length).toBe(1);

    // 10x sequential
    for (let i = 0; i < 10; i++) {
      await db.insertExperimentTrade('EXP-001', testTrade);
    }
    trades = (await db.getExperimentTrades('EXP-001')).filter(t => t.trade_id === tradeId);
    expect(trades.length).toBe(1);

    // 100x concurrent
    const batch = [];
    for (let i = 0; i < 100; i++) {
      batch.push(db.insertExperimentTrade('EXP-001', testTrade));
    }
    await Promise.all(batch);
    trades = (await db.getExperimentTrades('EXP-001')).filter(t => t.trade_id === tradeId);
    expect(trades.length).toBe(1);

    await db.close();
  });

  it('COALESCE preserves non-null original fields upon partial update', async () => {
    const db = new CausalMemoryDB(TEST_DB_PATH);
    await db.ensureReady();

    const tradeId = `trade_${generateUUIDv7()}`;
    await db.insertExperimentTrade('EXP-001', {
      trade_id: tradeId,
      symbol: 'SOLUSDT',
      direction: 'LONG',
      entryPrice: 150,
      stopLoss: 140,
      takeProfit: 170,
      quantity: 20,
      status: 'open',
      regime: 'RANGING',
      governanceDecision: 'APPROVED'
    });

    // Partial update
    await db.updateExperimentTrade(tradeId, 'EXP-001', {
      exit_price: 165,
      pnl: 300,
      status: 'closed'
    });

    const trades = (await db.getExperimentTrades('EXP-001')).filter(t => t.trade_id === tradeId);
    expect(trades.length).toBe(1);
    const updated = trades[0];

    // Preserved fields
    expect(updated.symbol).toBe('SOLUSDT');
    expect(updated.direction).toBe('LONG');
    expect(updated.entry_price).toBe(150);
    expect(updated.stop_loss).toBe(140);
    expect(updated.take_profit).toBe(170);
    expect(updated.quantity).toBe(20);
    expect(updated.regime).toBe('RANGING');
    expect(updated.governance_decision).toBe('APPROVED');

    // Updated fields
    expect(updated.exit_price).toBe(165);
    expect(updated.pnl).toBe(300);
    expect(updated.status).toBe('closed');

    await db.close();
  });
});
