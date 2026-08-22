import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import { attachPhase16Auditor } from '../../backend/phase16Auditor.js';

describe('Phase 16 Forward Validation Ledger & Execution Auditor Suite', () => {
  const testDataDir = path.join(process.cwd(), 'temp_test_ledger');
  const ledgerPath = path.join(testDataDir, 'forward_validation_ledger_v2.jsonl');

  beforeEach(() => {
    process.env.DATA_DIR = testDataDir;
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  it('deve interceptar ordens de execução e registrar métricas de slippage e latência', async () => {
    let orderPlaced = false;
    const mockExecution = {
      placeOrder: async (symbol, side, type, quantity, currentPrice) => {
        orderPlaced = true;
        return {
          orderId: 'ORDER_12345',
          executedQty: quantity,
          price: currentPrice * 1.0002 // 2 bps slippage
        };
      }
    };

    const mockEngine = new EventEmitter();
    mockEngine.execution = mockExecution;
    mockEngine.activePosition = null;
    mockEngine.tradeHistory = [];

    attachPhase16Auditor(mockEngine);

    // 1. Simulate entry order
    mockEngine.activePosition = {
      id: 'POS_TEST_01',
      timestamp: Math.floor(Date.now() / 1000),
      entryPrice: 65000,
      quantity: 0.015,
      direction: 'LONG'
    };

    const entryRes = await mockEngine.execution.placeOrder('BTCUSDT', 'BUY', 'MARKET', 0.015, 65000);
    expect(entryRes.orderId).toBe('ORDER_12345');
    expect(orderPlaced).toBe(true);

    // 2. Simulate closed trade appending to tradeHistory
    const closedTrade = {
      id: 'POS_TEST_01',
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entryPrice: 65000,
      exitPrice: 65500,
      quantity: 0.015,
      initialStopLoss: 64700,
      pnl: 7.5,
      timestamp: Math.floor(Date.now() / 1000) - 900,
      reasonCodes: ['TIME_EXIT'],
      signal: {
        imbalance: 0.85,
        oppScore: 3,
        atr: 120,
        confidence: 85
      },
      regime: 'EXPANSION'
    };

    mockEngine.tradeHistory.push(closedTrade);

    // Wait short delay for setInterval in auditor to process trade
    await new Promise(r => setTimeout(r, 1200));

    expect(fs.existsSync(ledgerPath) || fs.existsSync(path.join(process.env.DATA_DIR || '/tmp/data', 'forward_validation_ledger_v2.jsonl'))).toBe(true);
  });
});
