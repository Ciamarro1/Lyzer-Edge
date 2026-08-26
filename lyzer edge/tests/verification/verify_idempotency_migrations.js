import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { CausalMemoryDB } from '../../backend/db.js';
import { runMigrations } from '../../backend/migrations.js';
import { generateUUIDv7 } from '../../src/causal-memory/EventFactory.js';

const TEST_DB_PATH = path.join(process.cwd(), 'temp_test_idempotency.db');

function cleanup() {
  if (fs.existsSync(TEST_DB_PATH)) {
    try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
  }
}

async function runIdempotencySuite() {
  console.log('===============================================================');
  console.log('⚡ STARTING IDEMPOTENCY & MIGRATION V5 RIGOROUS TEST SUITE ⚡');
  console.log('===============================================================\n');

  cleanup();

  // -------------------------------------------------------------
  // TEST 1: Migration v5 and Legacy Deduplication
  // -------------------------------------------------------------
  console.log('[TEST 1] Testing Migration v5 & Legacy Deduplication...');
  const rawDb = new sqlite3.Database(TEST_DB_PATH);

  // Initialize baseline tables (v1 to v4)
  const { runMigrations } = await import('../../backend/migrations.js');
  
  // Create all tables up to v4
  await new Promise((resolve, reject) => {
    rawDb.serialize(() => {
      // Create v1 tables manually with old experiment_trades schema (with id AUTOINCREMENT and duplicate trade_ids)
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
      rawDb.run(`
        CREATE TABLE IF NOT EXISTS experiment_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          experiment_id TEXT NOT NULL UNIQUE,
          total_trades INTEGER NOT NULL DEFAULT 0,
          snapshot_timestamp INTEGER NOT NULL
        )
      `);

      // Insert 3 duplicate rows for the SAME trade_id with progressive updates
      rawDb.run(`
        INSERT INTO experiment_trades (trade_id, experiment_id, symbol, direction, entry_price, status, entry_timestamp, created_at)
        VALUES ('LEGACY-TRADE-001', 'EXP-001', 'BTCUSDT', 'LONG', 50000, 'open', 1000, 1000)
      `);
      rawDb.run(`
        INSERT INTO experiment_trades (trade_id, experiment_id, symbol, direction, entry_price, status, entry_timestamp, created_at)
        VALUES ('LEGACY-TRADE-001', 'EXP-001', 'BTCUSDT', 'LONG', 50000, 'in_progress', 1000, 1050)
      `);
      rawDb.run(`
        INSERT INTO experiment_trades (trade_id, experiment_id, symbol, direction, entry_price, exit_price, pnl, status, entry_timestamp, created_at)
        VALUES ('LEGACY-TRADE-001', 'EXP-001', 'BTCUSDT', 'LONG', 50000, 52000, 2000, 'closed', 1000, 1100)
      `);

      // Insert a distinct trade
      rawDb.run(`
        INSERT INTO experiment_trades (trade_id, experiment_id, symbol, direction, entry_price, status, entry_timestamp, created_at)
        VALUES ('LEGACY-TRADE-002', 'EXP-001', 'ETHUSDT', 'SHORT', 3000, 'open', 2000, 2000)
      `);

      // Set user_version to 4 so runMigrations only runs migration v5
      rawDb.run(`PRAGMA user_version = 4;`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  // Now run migrations up to v5
  const migrationResult = await runMigrations(rawDb);
  console.log(`✓ Migrations ran successfully: version=${migrationResult.currentVersion}, applied=${migrationResult.appliedCount}`);
  if (migrationResult.currentVersion < 5) {
    throw new Error(`Expected currentVersion >= 5, got ${migrationResult.currentVersion}`);
  }

  // Verify schema: trade_id must be primary key (pk == 1)
  const columns = await new Promise((resolve, reject) => {
    rawDb.all(`PRAGMA table_info(experiment_trades)`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  const tradeIdCol = columns.find(c => c.name === 'trade_id');
  if (!tradeIdCol || tradeIdCol.pk !== 1) {
    throw new Error(`trade_id must be primary key (pk=1), got: ${JSON.stringify(tradeIdCol)}`);
  }
  console.log('✓ Schema verified: `trade_id` is PRIMARY KEY NOT NULL');

  // Verify deduplication: LEGACY-TRADE-001 should have exactly 1 record, with status 'closed' and exit_price 52000
  const legacyRows = await new Promise((resolve, reject) => {
    rawDb.all(`SELECT * FROM experiment_trades WHERE trade_id = 'LEGACY-TRADE-001'`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  if (legacyRows.length !== 1) {
    throw new Error(`Expected exactly 1 deduplicated row for LEGACY-TRADE-001, found ${legacyRows.length}`);
  }
  if (legacyRows[0].status !== 'closed' || legacyRows[0].exit_price !== 52000) {
    throw new Error(`Expected latest update (closed, 52000) to win during deduplication, got: ${JSON.stringify(legacyRows[0])}`);
  }
  console.log('✓ Legacy deduplication verified: duplicate rows condensed into latest state');

  await new Promise((resolve) => rawDb.close(resolve));

  // -------------------------------------------------------------
  // TEST 2: CausalMemoryDB Idempotency Tests (1x, 10x, 100x)
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Testing Idempotent UPSERT Operations (1x, 10x, 100x)...');
  const db = new CausalMemoryDB(TEST_DB_PATH);
  await db.ensureReady();

  const testTradeId = `trade_${generateUUIDv7()}`;
  const baseTrade = {
    trade_id: testTradeId,
    symbol: 'SOLUSDT',
    direction: 'LONG',
    entryPrice: 140.50,
    stopLoss: 135.00,
    takeProfit: 155.00,
    quantity: 10,
    status: 'open',
    timestamp: Date.now()
  };

  // 1x insertion
  console.log('  -> Testing 1x insertion...');
  await db.insertExperimentTrade('EXP-001', baseTrade);
  let count1x = await db.getExperimentTrades('EXP-001');
  let match1x = count1x.filter(t => t.trade_id === testTradeId);
  if (match1x.length !== 1) {
    throw new Error(`Expected 1x insert to result in 1 row, got ${match1x.length}`);
  }
  console.log('  ✓ 1x insert successful');

  // 10x sequential insertions
  console.log('  -> Testing 10x sequential insertions of the same trade...');
  for (let i = 0; i < 10; i++) {
    await db.insertExperimentTrade('EXP-001', baseTrade);
  }
  let count10x = await db.getExperimentTrades('EXP-001');
  let match10x = count10x.filter(t => t.trade_id === testTradeId);
  if (match10x.length !== 1) {
    throw new Error(`Expected 10x sequential inserts to result in strictly 1 row, got ${match10x.length}`);
  }
  console.log('  ✓ 10x sequential idempotency verified: exactly 1 row remains');

  // 100x concurrent insertions
  console.log('  -> Testing 100x concurrent insertions (Promise.all)...');
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(db.insertExperimentTrade('EXP-001', baseTrade));
  }
  await Promise.all(promises);
  let count100x = await db.getExperimentTrades('EXP-001');
  let match100x = count100x.filter(t => t.trade_id === testTradeId);
  if (match100x.length !== 1) {
    throw new Error(`Expected 100x concurrent inserts to result in strictly 1 row, got ${match100x.length}`);
  }
  console.log('  ✓ 100x concurrent idempotency verified: strictly 1 row with zero collisions');

  // -------------------------------------------------------------
  // TEST 3: Partial Updates & Field Preservation via COALESCE
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Testing Partial Updates & COALESCE Field Preservation...');
  const partialTradeId = `trade_${generateUUIDv7()}`;
  
  // Step 1: Initial full open trade
  await db.insertExperimentTrade('EXP-001', {
    trade_id: partialTradeId,
    symbol: 'BTCUSDT',
    direction: 'LONG',
    entryPrice: 65000,
    stopLoss: 63000,
    takeProfit: 70000,
    quantity: 1.5,
    status: 'open',
    regime: 'TRENDING_BULL',
    governanceDecision: 'APPROVED_BY_COURT',
    reasonCodes: ['MOMENTUM_CONFIRMED', 'TRG_PASS'],
    timestamp: 1700000000000
  });

  // Step 2: Partial update closing the trade with only exit info
  await db.updateExperimentTrade(partialTradeId, 'EXP-001', {
    exit_price: 68500,
    pnl: 5250,
    status: 'closed',
    exit_timestamp: 1700003600000
  });

  // Step 3: Verify all original fields were preserved while exit fields were updated
  const allTrades = await db.getExperimentTrades('EXP-001');
  const updatedTrade = allTrades.find(t => t.trade_id === partialTradeId);
  if (!updatedTrade) {
    throw new Error(`Updated trade ${partialTradeId} not found in database`);
  }

  console.log('Updated Trade Row:', {
    trade_id: updatedTrade.trade_id,
    symbol: updatedTrade.symbol,
    direction: updatedTrade.direction,
    entry_price: updatedTrade.entry_price,
    stop_loss: updatedTrade.stop_loss,
    take_profit: updatedTrade.take_profit,
    exit_price: updatedTrade.exit_price,
    pnl: updatedTrade.pnl,
    pnl_pct: updatedTrade.pnl_pct,
    status: updatedTrade.status,
    regime: updatedTrade.regime,
    governance_decision: updatedTrade.governance_decision
  });

  if (updatedTrade.symbol !== 'BTCUSDT') throw new Error(`Expected symbol 'BTCUSDT', got ${updatedTrade.symbol}`);
  if (updatedTrade.direction !== 'LONG') throw new Error(`Expected direction 'LONG', got ${updatedTrade.direction}`);
  if (updatedTrade.entry_price !== 65000) throw new Error(`Expected entry_price 65000, got ${updatedTrade.entry_price}`);
  if (updatedTrade.stop_loss !== 63000) throw new Error(`Expected stop_loss 63000, got ${updatedTrade.stop_loss}`);
  if (updatedTrade.take_profit !== 70000) throw new Error(`Expected take_profit 70000, got ${updatedTrade.take_profit}`);
  if (updatedTrade.quantity !== 1.5) throw new Error(`Expected quantity 1.5, got ${updatedTrade.quantity}`);
  if (updatedTrade.regime !== 'TRENDING_BULL') throw new Error(`Expected regime 'TRENDING_BULL', got ${updatedTrade.regime}`);
  if (updatedTrade.governance_decision !== 'APPROVED_BY_COURT') throw new Error(`Expected governance_decision preserved, got ${updatedTrade.governance_decision}`);
  if (updatedTrade.exit_price !== 68500) throw new Error(`Expected exit_price updated to 68500, got ${updatedTrade.exit_price}`);
  if (updatedTrade.pnl !== 5250) throw new Error(`Expected pnl updated to 5250, got ${updatedTrade.pnl}`);
  if (updatedTrade.status !== 'closed') throw new Error(`Expected status updated to 'closed', got ${updatedTrade.status}`);
  console.log('✓ Partial update with COALESCE field preservation verified 100%');

  // -------------------------------------------------------------
  // TEST 4: Auto-UUIDv7 Generation on missing trade_id
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Testing Automatic UUIDv7 Generation for ID-less trades...');
  await db.insertExperimentTrade('EXP-001', {
    symbol: 'AVAXUSDT',
    direction: 'LONG',
    entryPrice: 35.00,
    status: 'open'
  });

  const avaxTrades = (await db.getExperimentTrades('EXP-001')).filter(t => t.symbol === 'AVAXUSDT');
  if (avaxTrades.length !== 1) throw new Error('Expected 1 AVAX trade');
  if (!avaxTrades[0].trade_id || avaxTrades[0].trade_id.length < 10) {
    throw new Error(`Expected generated trade_id UUIDv7, got ${avaxTrades[0].trade_id}`);
  }
  console.log(`✓ Generated UUIDv7 trade_id: ${avaxTrades[0].trade_id}`);

  await db.close();
  cleanup();

  console.log('\n===============================================================');
  console.log('🎉 ALL IDEMPOTENCY & MIGRATION V5 TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('===============================================================\n');
}

runIdempotencySuite().catch(err => {
  console.error('❌ IDEMPOTENCY SUITE FAILED:', err);
  cleanup();
  process.exit(1);
});
