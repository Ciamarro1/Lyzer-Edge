/**
 * @fileoverview P0 Regression Test Suite: SQLite Upsert & Idempotency Validation
 *
 * Objectives:
 * 1. Validate that 100 sequential and concurrent updates to the same `trade_id`
 *    result in EXACTLY 1 single, fully intact record in SQLite.
 * 2. Validate UPSERT idempotency (`ON CONFLICT(trade_id) DO UPDATE`).
 * 3. Verify zero record duplication, non-null field preservation, and data integrity.
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { CausalMemoryDB, runMigrations } from '../../backend/db.js';

const TEST_DB_DIR = path.join(process.cwd(), 'temp_test_p0_idempotency');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'idempotency_test.db');

function cleanupDbFiles() {
  if (fs.existsSync(TEST_DB_DIR)) {
    try {
      const files = fs.readdirSync(TEST_DB_DIR);
      for (const file of files) {
        try { fs.unlinkSync(path.join(TEST_DB_DIR, file)); } catch (e) {}
      }
      fs.rmdirSync(TEST_DB_DIR);
    } catch (e) {}
  }
}

describe('P0 Test Suite: SQLite Upsert & Trade Idempotency', () => {
  let dbInstance;

  beforeAll(async () => {
    cleanupDbFiles();
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    dbInstance = new CausalMemoryDB(TEST_DB_PATH);
    await dbInstance.ensureReady();
  });

  afterAll(async () => {
    if (dbInstance && dbInstance.db) {
      await new Promise((resolve) => dbInstance.db.close(() => resolve()));
    }
    cleanupDbFiles();
  });

  test('100 sequential updates on the exact same trade_id result in exactly 1 intact record', async () => {
    const tradeId = 'TRADE_P0_SEQ_001';
    const experimentId = 'EXP_P0_IDEMP';

    // 1. Initial Insert
    const initialTrade = {
      trade_id: tradeId,
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entryPrice: 60000,
      stopLoss: 59000,
      takeProfit: 62000,
      quantity: 0.1,
      status: 'open',
      pnl: 0,
      entry_timestamp: Date.now(),
      signal: { confidence: 0.85 },
      reasonCodes: ['INITIAL_ENTRY']
    };

    await dbInstance.insertExperimentTrade(experimentId, initialTrade);

    // 2. Perform 100 sequential updates on the exact same trade_id
    for (let i = 1; i <= 100; i++) {
      const updateData = {
        exitPrice: 60000 + i * 10,
        pnl: i * 5,
        pnl_pct: (i * 5) / 60000 * 100,
        status: i === 100 ? 'closed' : 'open',
        exit_timestamp: Date.now() + i * 1000,
        reasonCodes: [`TICK_UPDATE_${i}`],
        governanceDecision: 'ALLOW'
      };

      await dbInstance.updateExperimentTrade(tradeId, experimentId, updateData);
    }

    // 3. Verify exactly 1 record exists in experiment_trades
    const rows = await new Promise((resolve, reject) => {
      dbInstance.db.all(
        'SELECT * FROM experiment_trades WHERE trade_id = ?',
        [tradeId],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    expect(rows).toHaveLength(1);

    const record = rows[0];
    expect(record.trade_id).toBe(tradeId);
    expect(record.experiment_id).toBe(experimentId);
    expect(record.symbol).toBe('BTCUSDT');
    expect(record.direction).toBe('LONG');
    expect(record.entry_price).toBe(60000);
    expect(record.exit_price).toBe(61000); // 60000 + 100 * 10
    expect(record.pnl).toBe(500);          // 100 * 5
    expect(record.status).toBe('closed');
    expect(record.governance_decision).toBe('ALLOW');
    expect(record.reason_codes_json).toContain('TICK_UPDATE_100');
  });

  test('100 concurrent / asynchronous parallel updates on the same trade_id maintain single-record integrity', async () => {
    const tradeId = 'TRADE_P0_CONCURRENT_002';
    const experimentId = 'EXP_P0_IDEMP';

    // 1. Initial Insert
    await dbInstance.insertExperimentTrade(experimentId, {
      trade_id: tradeId,
      symbol: 'ETHUSDT',
      direction: 'SHORT',
      entryPrice: 3000,
      stopLoss: 3100,
      takeProfit: 2800,
      quantity: 1.5,
      status: 'open',
      pnl: 0,
      entry_timestamp: Date.now()
    });

    // 2. Fire 100 concurrent updates simultaneously
    const updatePromises = [];
    for (let i = 1; i <= 100; i++) {
      updatePromises.push(
        dbInstance.updateExperimentTrade(tradeId, experimentId, {
          pnl: i * 2,
          exitPrice: 3000 - i,
          reasonCodes: [`CONCURRENT_UPDATE_${i}`]
        })
      );
    }

    await Promise.all(updatePromises);

    // 3. Verify exactly 1 record exists in the table for this trade_id
    const rows = await new Promise((resolve, reject) => {
      dbInstance.db.all(
        'SELECT * FROM experiment_trades WHERE trade_id = ?',
        [tradeId],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].trade_id).toBe(tradeId);
    expect(rows[0].symbol).toBe('ETHUSDT');
    expect(rows[0].direction).toBe('SHORT');
    expect(rows[0].entry_price).toBe(3000);
    expect(rows[0].pnl).toBeGreaterThan(0);
  });

  test('100 full insertExperimentTrade (UPSERT) calls on the same trade_id result in exactly 1 record', async () => {
    const tradeId = 'TRADE_P0_UPSERT_003';
    const experimentId = 'EXP_P0_IDEMP';

    // Call insertExperimentTrade 100 times with same trade_id but evolving values
    for (let i = 1; i <= 100; i++) {
      await dbInstance.insertExperimentTrade(experimentId, {
        trade_id: tradeId,
        symbol: 'SOLUSDT',
        direction: 'LONG',
        entryPrice: 150,
        exitPrice: 150 + i * 0.5,
        stopLoss: 145,
        takeProfit: 165,
        quantity: 10,
        pnl: i * 5,
        status: i === 100 ? 'closed' : 'open',
        governanceDecision: 'ALLOW',
        reasonCodes: [`UPSERT_PASS_${i}`],
        entry_timestamp: 1700000000000,
        exit_timestamp: 1700000000000 + i * 1000
      });
    }

    // Verify exactly 1 record exists
    const rows = await new Promise((resolve, reject) => {
      dbInstance.db.all(
        'SELECT * FROM experiment_trades WHERE trade_id = ?',
        [tradeId],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].trade_id).toBe(tradeId);
    expect(rows[0].symbol).toBe('SOLUSDT');
    expect(rows[0].status).toBe('closed');
    expect(rows[0].exit_price).toBe(200); // 150 + 100 * 0.5
    expect(rows[0].pnl).toBe(500);        // 100 * 5
    expect(rows[0].reason_codes_json).toContain('UPSERT_PASS_100');
  });

  test('Overall table count integrity: Exactly 3 unique records exist in total across tests', async () => {
    const countResult = await new Promise((resolve, reject) => {
      dbInstance.db.get('SELECT COUNT(*) as count FROM experiment_trades', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    expect(countResult).toBe(3);
  });
});
