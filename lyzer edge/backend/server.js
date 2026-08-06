import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { StreamEngine, arl } from './streamEngine.js';
import { loadEngineState, saveEngineState, clearEngineState } from './statePersistence.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTelegramAlert } from './telegram.js';
import db from './db.js';
import { ExperimentManager } from './experimentManager.js';
import { getCourtSecret } from '../../packages/lyzer-constitution/src/eca/permission.js';
import { sanitizeBodyMiddleware, safeMerge } from './utils/safeJson.js';
import { ExchangeExecution } from './exchangeExecution.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- FORCED LIVE TESTNET CONFIGURATION ---
process.env.ARL_MODE = process.env.ARL_MODE || 'TESTNET';
process.env.LIVE_TRADING_ENABLED = process.env.LIVE_TRADING_ENABLED || 'false';
process.env.MAX_DAILY_CAPITAL = process.env.MAX_DAILY_CAPITAL || '1000';

// LIVE trading is strictly opt-in: emit a loud warning banner when explicitly enabled
if (process.env.ARL_MODE === 'LIVE') {
  if (process.env.LIVE_TRADING_ENABLED !== 'true') {
    console.warn('⚠️  [BOOT] LIVE_TRADING_ENABLED must be exactly "true" for real trades. Disabling live trading.');
    process.env.LIVE_TRADING_ENABLED = 'false';
  } else {
    console.warn('⚠️  [BOOT] WARNING: LIVE_TRADING_ENABLED=true with ARL_MODE=LIVE — REAL ORDERS WILL BE PLACED ON THE EXCHANGE.');
  }
}

// COURT_SECRET_KEY is mandatory: without it, PermissionToken HMAC signatures would be forgeable
try {
  getCourtSecret();
} catch (err) {
  console.error('❌ [BOOT] Fatal: ' + err.message);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Initialize Quant Research Lab Experiment Manager
const experimentManager = new ExperimentManager(db);
experimentManager.initialize().then(() => {
  console.log('🧪 [QUANT LAB] ExperimentManager initialized successfully.');
}).catch(err => {
  console.error('❌ [QUANT LAB] Failed to initialize ExperimentManager:', err);
});

// Serve static files from the Vite build output (dist)
app.use(express.static(path.join(__dirname, '../dist')));
app.use(express.json());
app.use(sanitizeBodyMiddleware);

import { register } from '../src/observability/index.js';

// Middleware para proteção de rotas administrativas quando ADMIN_API_KEY estiver configurada
const authenticateAdmin = (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return next();
  const keyHeader = req.headers['x-admin-key'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (keyHeader === adminKey) return next();
  return res.status(401).json({ error: 'Unauthorized: Invalid or missing Admin API Key' });
};

// Endpoint para raspagem de métricas do Prometheus/Kubernetes
app.get('/metrics', authenticateAdmin, async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// ── Quant Research Lab: Experiment API Endpoints ─────────────────────────

// GET /api/experiments/dashboard — Full experiment ecosystem dashboard data
app.get('/api/experiments/dashboard', async (req, res) => {
  try {
    const data = await experimentManager.getDashboardData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/experiments/active — Active experiment details
app.get('/api/experiments/active', async (req, res) => {
  try {
    const active = await experimentManager.getActiveExperiment();
    if (!active) return res.status(404).json({ error: 'No active experiment found' });
    res.json(active);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/experiments/freeze-and-new — FREEZE + NEW EXPERIMENT action
app.post('/api/experiments/freeze-and-new', authenticateAdmin, async (req, res) => {
  try {
    const { reason = 'USER_TRIGGERED' } = req.body || {};
    
    // 1. Gather all trades across active in-memory engines
    const allInMemoryTrades = engines.flatMap(e => e.tradeHistory || []);
    
    // 2. Execute atomic freeze + create new experiment
    const result = await experimentManager.freezeAndCreateNew(reason);

    // 3. Save all in-memory trades to the frozen experiment in DB if not already stored
    for (const trade of allInMemoryTrades) {
      try {
        await db.insertExperimentTrade(result.frozenExperiment.experiment_id, trade);
      } catch (e) {
        // Trade might already be stored, ignore duplicate key error
      }
    }

    // 4. Reset in-memory trade history for active engines without deleting historical DB trades
    for (const engine of engines) {
      engine.tradeHistory = [];
      engine.bootTime = Date.now();
      engine.emit('state_changed');
    }
    saveEngineState(engines);

    // 5. Broadcast freeze & new experiment via WebSocket
    broadcast({
      type: 'experiment_frozen',
      frozenExperiment: result.frozenExperiment,
      newExperiment: result.newExperiment
    });

    console.log(`❄️ [QUANT LAB] Experiment ${result.frozenExperiment.experiment_id} FROZEN. New active: ${result.newExperiment.experiment_id}`);

    res.json({
      success: true,
      message: `Experiment ${result.frozenExperiment.experiment_id} frozen as LEGACY. Created ${result.newExperiment.experiment_id}.`,
      frozen: result.frozenExperiment,
      newActive: result.newExperiment,
      snapshot: result.snapshot
    });
  } catch (err) {
    console.error('❌ [QUANT LAB] Freeze failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/experiments/promote-champion — Promote an experiment to Champion
app.post('/api/experiments/promote-champion', authenticateAdmin, async (req, res) => {
  try {
    const { experimentId, force = false } = req.body;
    if (!experimentId) return res.status(400).json({ error: 'experimentId is required' });
    const champion = await experimentManager.promoteChampion(experimentId, force);
    broadcast({ type: 'champion_promoted', champion });
    res.json({ success: true, message: `Experiment ${experimentId} promoted to Champion!`, champion });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/experiments/alpha-discovery — Cross-experiment pattern discovery
app.get('/api/experiments/alpha-discovery', async (req, res) => {
  try {
    const discovery = await experimentManager.alphaDiscoveryEngine.discoverAlpha();
    res.json(discovery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/experiments/update-status — Update status (supporting 6-State Lifecycle)
app.post('/api/experiments/update-status', authenticateAdmin, async (req, res) => {
  try {
    const { experimentId, status, reason } = req.body;
    if (!experimentId || !status) {
      return res.status(400).json({ error: 'experimentId and status are required.' });
    }
    const updated = await experimentManager.updateStatus(experimentId, status, reason);
    broadcast({ type: 'experiment_status_updated', experiment: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

import { LyzerArcheologist } from './lyzerArcheologist.js';

const archeologist = new LyzerArcheologist(path.join(__dirname, '../..'));

// GET /api/archeologist/dna — Codebase DNA composition
app.get('/api/archeologist/dna', async (req, res) => {
  try {
    const dna = await archeologist.analyzeCodebaseDNA();
    res.json(dna);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/archeologist/rankings — Module importance ranking (0-100)
app.get('/api/archeologist/rankings', (req, res) => {
  res.json(archeologist.getModuleImportanceRankings());
});

// GET /api/archeologist/dead-code — Dead code & pruning audit
app.get('/api/archeologist/dead-code', (req, res) => {
  res.json(archeologist.detectDeadCodeCandidates());
});

import { LyzerMindMRI } from './lyzerMindMRI.js';

const lyzerMind = new LyzerMindMRI(path.join(__dirname, '../..'));

// GET /api/mind/mri — Project MRI Report
app.get('/api/mind/mri', async (req, res) => {
  try {
    const mri = await lyzerMind.runFullMRI();
    res.json(mri);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/archeologist/philosopher-report — Philosopher & CTO Strategic Synthesis Report
app.get('/api/archeologist/philosopher-report', (req, res) => {
  res.json(archeologist.generatePhilosopherReport());
});

// GET /api/experiments/ranking — Historical experiment leaderboard
app.get('/api/experiments/ranking', async (req, res) => {
  try {
    const { sortBy = 'profit_factor', limit = 20 } = req.query;
    const ranking = await experimentManager.getRanking(sortBy, parseInt(limit, 10));
    res.json({ ranking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/experiments/:id — Get details of a single experiment
app.get('/api/experiments/:id', async (req, res) => {
  try {
    const exp = await db.getExperiment(req.params.id);
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });
    const snapshot = await db.getExperimentSnapshot(req.params.id);
    const trades = await db.getExperimentTrades(req.params.id);
    res.json({ experiment: exp, snapshot, trades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ZERO ENTROPY ENFORCEMENT: DELETION AND WIPING ARE DISABLED ────────────

// API endpoint for closing trade manually (preserves history)
app.post('/api/trades/close', authenticateAdmin, (req, res) => {
  const { symbol, id, exitPrice, exitDate, fees } = req.body;
  if (!symbol) return res.status(400).json({ error: 'Symbol is required' });
  const targetSymbol = symbol.toUpperCase().replace('/USD', 'USDT');
  const engine = engines.find(e => e.symbol === targetSymbol);
  if (!engine) return res.status(404).json({ error: 'Engine not found for symbol' });

  if (engine.activePosition && engine.activePosition.id === id) {
    const pos = engine.activePosition;
    const rawPnl = pos.direction === 'LONG'
      ? (exitPrice - pos.entryPrice) / pos.entryPrice
      : (pos.entryPrice - exitPrice) / pos.entryPrice;
    const resolvedTrade = {
      id: pos.id,
      timestamp: pos.timestamp,
      symbol: engine.symbol,
      direction: pos.direction,
      entryPrice: pos.entryPrice,
      exitPrice: exitPrice,
      pnl: rawPnl,
      status: 'closed',
      signal: pos.signal,
      regime: pos.regime,
      governanceDecision: pos.governanceDecision,
      wasRejected: false,
      reasonCodes: ['MANUAL_EXIT'],
      slippage: 0,
      spread: 0,
      distortionFactor: 1.0,
      timingOffset: 0
    };
    engine.tradeHistory.push(resolvedTrade);
    engine.releaseDailyCapital(pos);
    engine.activePosition = null;

    // Persist to active experiment in SQLite
    experimentManager.getActiveExperiment().then(activeExp => {
      if (activeExp) db.insertExperimentTrade(activeExp.experiment_id, resolvedTrade).catch(() => {});
    });

    saveEngineState(engines);
    engine.emit('state_changed');
    engine.emit('arl', { type: 'tick', symbol: engine.symbol, mode: engine.mode });
    return res.json({ success: true, message: 'Trade closed successfully' });
  }
  return res.status(404).json({ error: 'Active trade not found for id' });
});

// DELETION BLOCKED — Zero Entropy Policy forbids deleting trades
app.post('/api/trades/delete', authenticateAdmin, (req, res) => {
  return res.status(403).json({
    error: 'ZERO ENTROPY VIOLATION: Trade deletion is permanently disabled. All trade history must be preserved for quantitative research.'
  });
});

// WIPING TRANSFORMED — Redirects wipe requests to Freeze & New Experiment
app.post('/api/trades/wipe', authenticateAdmin, async (req, res) => {
  try {
    const result = await experimentManager.freezeAndCreateNew('WIPE_REQUEST_REDIRECTED');
    for (const engine of engines) {
      engine.tradeHistory = [];
      engine.activePosition = null;
      engine.bootTime = Date.now();
      engine.emit('state_changed');
    }
    saveEngineState(engines);
    broadcast({ type: 'experiment_frozen', frozenExperiment: result.frozenExperiment, newExperiment: result.newExperiment });

    return res.json({
      success: true,
      message: `ZERO ENTROPY POLICY: Trades frozen into LEGACY experiment (${result.frozenExperiment.experiment_id}) instead of wiped. Created new ACTIVE experiment (${result.newExperiment.experiment_id}).`,
      frozenExperiment: result.frozenExperiment,
      newExperiment: result.newExperiment
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hard reset: clear all in-memory trades and persisted state
app.post('/api/reset-engine', async (req, res) => {
  try {
    for (const engine of engines) {
      engine.tradeHistory = [];
      engine.activePosition = null;
    }
    clearEngineState();
    broadcast({ type: 'engine_reset', message: 'Trade history wiped. Starting fresh.' });
    res.json({ success: true, message: 'Engine state reset. All trades cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


console.log(`\n======================================================`);
console.log(`🌍 Lyzer Edge: MULTI-ASSET LIVE ENGINE STARTED`);
console.log(`MODE: ${process.env.ARL_MODE}`);
console.log(`CAPITAL LIMIT: $${process.env.MAX_DAILY_CAPITAL}`);
console.log(`======================================================\n`);

app.get('/api/status', (req, res) => {
  res.json({ status: 'Lyzer Core Backend OK', mode: process.env.ARL_MODE });
});

// POST /api/test-order — Trigger a manual test order on Binance Testnet/Live
app.post('/api/test-order', async (req, res) => {
  try {
    const symbol = (req.body.symbol || 'BTCUSDT').toUpperCase();
    const side = (req.body.side || 'BUY').toUpperCase();
    const quantity = parseFloat(req.body.quantity || 0.001);

    const isTestnet = process.env.ARL_MODE === 'TESTNET';
    const exchange = new ExchangeExecution(
      process.env.BINANCE_API_KEY,
      process.env.BINANCE_API_SECRET,
      isTestnet
    );

    console.log(`[TEST ORDER] Manual test order trigger received: ${side} ${quantity} ${symbol}...`);
    const orderResult = await exchange.placeOrder(symbol, side, 'MARKET', quantity);
    res.json({ success: true, symbol, side, quantity, orderResult });
  } catch (err) {
    console.error(`[TEST ORDER] Failed to place test order:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/testnet-dashboard', async (req, res) => {
  try {
    const hasKeys = process.env.BINANCE_API_KEY && process.env.BINANCE_API_KEY !== 'YOUR_API_KEY_HERE';
    let binanceAccount = null;
    let binanceOrders = null;
    let useBinance = false;

    if (hasKeys && (process.env.ARL_MODE === 'LIVE' || process.env.ARL_MODE === 'TESTNET')) {
      try {
        const isTestnet = process.env.ARL_MODE === 'TESTNET';
        const exchange = new ExchangeExecution(process.env.BINANCE_API_KEY, process.env.BINANCE_API_SECRET, isTestnet);
        binanceAccount = await exchange.getAccount();
        binanceOrders = await exchange.getOpenOrders();
        
        // If Binance didn't throw an error and returned an account array, we successfully authenticated
        if (!binanceAccount.code && binanceAccount.balances) {
          useBinance = true;
        }
      } catch (e) {
        console.log(`[DASHBOARD] Binance API fetch failed (invalid keys or network). Falling back to Local Paper Trading state. Error: ${e.message}`);
      }
    }

    if (useBinance) {
      return res.json({ account: binanceAccount, orders: binanceOrders });
    }

    // --- Paper Trading Local State ---
    const initialCapital = parseFloat(process.env.MAX_DAILY_CAPITAL || 1000);
    
    let totalPnL = 0;
    engines.forEach(e => {
      (e.tradeHistory || []).forEach(t => {
        totalPnL += parseFloat(t.pnl || 0);
      });
    });

    let lockedMargin = 0;
    const paperOrders = [];
    
    engines.forEach(e => {
      if (e.activePosition) {
        const pos = e.activePosition;
        const qty = parseFloat(pos.quantity || 0);
        const price = parseFloat(pos.entryPrice || 0);
        lockedMargin += (qty * price);
        
        paperOrders.push({
          symbol: e.symbol,
          side: pos.direction === 'LONG' ? 'BUY' : 'SELL',
          price: price.toString(),
          origQty: qty.toString(),
          orderId: `paper_${Date.now()}_${e.symbol}`
        });
      }
    });

    const freeUSDT = initialCapital + totalPnL - lockedMargin;
    const account = {
      balances: [
        { asset: 'USDT', free: freeUSDT.toFixed(4), locked: lockedMargin.toFixed(4) }
      ]
    };

    res.json({ account, orders: paperOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trades/export', authenticateAdmin, (req, res) => {
  try {
    const allTrades = engines.flatMap(e => (e.tradeHistory || []).map(t => safeMerge({}, t, { symbol: e.symbol })));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=lyzer_hf_trades_export_${new Date().toISOString().slice(0,10)}.json`);
    res.json({
      exportedAt: new Date().toISOString(),
      totalTrades: allTrades.length,
      trades: allTrades
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test-telegram', authenticateAdmin, async (req, res) => {
  try {
    await sendTelegramAlert('🧪 <b>[LYZER TEST] TESTE DE INTEGRAÇÃO</b>\nSua integração com o Telegram está funcionando perfeitamente!');
    res.json({ success: true, message: 'Test alert sent to Telegram!' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/candles/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const engine = engines.find(e => e.symbol === symbol);
  if (engine) {
    res.json({
      symbol: engine.symbol,
      candles: engine.candles,
      trades: engine.activePosition ? [
        ...engine.tradeHistory,
        {
          timestamp: engine.activePosition.timestamp,
          direction: engine.activePosition.direction,
          entryPrice: engine.activePosition.entryPrice,
          exitPrice: null,
          pnl: '0.00%',
          status: 'open',
          stopLoss: engine.activePosition.stopLoss,
          takeProfit: engine.activePosition.takeProfit,
          governanceDecision: engine.activePosition.governanceDecision
        }
      ] : engine.tradeHistory,
      connectionState: engine.connectionState
    });
  } else {
    res.status(404).json({ error: 'Symbol not found' });
  }
});

// Since arl is imported, this still references the legacy singleton for extinction routes,
// which is fine for UI fallback, although true multi-asset extinction should be per engine.
app.get('/api/extinction/status', (req, res) => {
  if (arl && arl.extinctionEngine) {
    res.json({
      state: arl.extinctionEngine.currentState,
      stress: arl.extinctionEngine.stressLevel,
      diversity: arl.extinctionEngine.metricsTracker.getDiversity()
    });
  } else {
    res.json({ state: 'UNKNOWN', stress: 0, diversity: 1 });
  }
});

let clients = [];

wss.on('connection', (ws, req) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey) {
    // Basic auth check via query param for WS
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.searchParams.get('key') !== adminKey) {
      console.log('🔴 Rejected unauthenticated WS connection');
      ws.close(1008, 'Unauthorized');
      return;
    }
  }

  console.log('🟢 Frontend connected to WS');
  clients.push(ws);

  ws.on('close', () => {
    console.log('🔴 Frontend disconnected from WS');
    clients = clients.filter(c => c !== ws);
  });
});

const broadcast = (payload) => {
  const dataStr = JSON.stringify(payload);
  clients.forEach(ws => {
    if (ws.readyState === 1) { // OPEN
      ws.send(dataStr);
    }
  });
};

// --- INITIALIZE MULTI-ASSET FLEET ---
const targetAssets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSDT', 'GBPUSDT'];
const engines = [];

for (const symbol of targetAssets) {
  console.log(`[FLEET] Booting StreamEngine for ${symbol}...`);
  const engine = new StreamEngine({
    mode: process.env.ARL_MODE,
    symbol: symbol,
    interval: '1m'
  });

  // Pipe events to the global WebSocket
  engine.on('arl', (payload) => broadcast(payload));
  engine.on('execution', (payload) => broadcast({ liveExecution: payload }));
  
  // Listen to state changes to persist engine states & sync trades to SQLite Zero Entropy DB
  engine.on('state_changed', async () => {
    saveEngineState(engines);
    try {
      const activeExp = await experimentManager.getActiveExperiment();
      if (activeExp && engine.tradeHistory) {
        for (const trade of engine.tradeHistory) {
          await db.insertExperimentTrade(activeExp.experiment_id, trade).catch(() => {});
        }
      }
    } catch (e) {
      // Ignore background sync errors
    }
  });

  engines.push(engine);
}

// Load persisted state before starting engines
loadEngineState(engines);

// Start them slightly staggered to avoid rate limits
engines.forEach((engine, idx) => {
  setTimeout(() => {
    engine.start();
  }, idx * 2000);
});

// Fallback to index.html for SPA routing (must be placed after all API routes)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// --- AUTOMATIC BUCKET BACKUP SERVICE ---
import { execFile } from 'child_process';
const runBackup = () => {
  const scriptPath = path.join(__dirname, '../backup_restore.py');
  console.log('[BACKUP] Triggering database backup to Hugging Face Storage Bucket...');
  execFile('python3', [scriptPath, 'backup'], (err, stdout, stderr) => {
    if (err) console.error('[BACKUP] Error running backup script:', err.message);
    if (stdout) console.log(stdout.trim());
    if (stderr) console.error(stderr.trim());
  });
};

// Periodic backup every 10 minutes
setInterval(runBackup, 10 * 60 * 1000);

// Backup on exit/shutdown
process.on('SIGINT', () => {
  console.log('[BACKUP] SIGINT received.');
  runBackup();
  setTimeout(() => process.exit(0), 4000); // give time for the upload
});
process.on('SIGTERM', () => {
  console.log('[BACKUP] SIGTERM received.');
  runBackup();
  setTimeout(() => process.exit(0), 4000);
});

// --- PERIODIC FLEET REPORT SERVICE ---
const sendFleetReport = () => {
  console.log('[TELEGRAM] Generating periodic fleet report...');
  let report = `📊 <b>[LYZER FLEET] RELATÓRIO OPERACIONAL</b>\n`;
  report += `Modo: <b>${process.env.ARL_MODE || 'TESTNET'}</b>\n\n`;

  engines.forEach(engine => {
    const trades = engine.tradeHistory || [];
    const totalTrades = trades.length;
    const allowed = trades.filter(t => t.governanceDecision === 'ALLOW').length;
    const rejected = trades.filter(t => t.governanceDecision === 'REJECT').length;
    const totalPnl = trades.reduce((a, t) => a + (t.pnl || 0), 0);
    const lastPrice = engine.candles[engine.candles.length - 1]?.close || 0;

    report += `▪️ <b>${engine.symbol}</b>\n`;
    report += `  • Preço: $${lastPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}\n`;
    report += `  • Status: <code>${engine.connectionState}</code>\n`;
    report += `  • Trades: <b>${totalTrades}</b> (Executados: ${allowed} | Veto: ${rejected})\n`;
    report += `  • PnL Sessão: <b>${totalPnl >= 0 ? '+' : ''}${(totalPnl * 100).toFixed(2)}%</b>\n\n`;
  });

  report += `Limite Diário: <b>$${process.env.MAX_DAILY_CAPITAL || '1000'}</b>`;
  sendTelegramAlert(report).catch(e => console.error('[TELEGRAM] Error sending fleet report:', e.message));
};

// Send fleet report every 4 hours
setInterval(sendFleetReport, 4 * 60 * 60 * 1000);

const PORT = process.env.PORT || 7860;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Lyzer Backend running on port ${PORT}`);
  // Initial backup after startup warmups are finished (30s)
  setTimeout(runBackup, 30000);
  // Send start notification to Telegram after 1 minute (gives engines time to start and pull data)
  setTimeout(() => {
    sendTelegramAlert(`🤖 <b>[LYZER SYSTEM] ROBÔ INICIADO</b>\nO motor multi-asset da Lyzer Labs foi iniciado com sucesso no Hugging Face.\nModo: <b>${process.env.ARL_MODE}</b>\nMonitorando: <b>${targetAssets.join(', ')}</b>`)
      .catch(e => console.error('[TELEGRAM] Error sending startup notification:', e.message));
    sendFleetReport();
  }, 60000);
});
