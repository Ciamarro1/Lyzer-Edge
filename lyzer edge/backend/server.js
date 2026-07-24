import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { StreamEngine, arl } from './streamEngine.js';
import { loadEngineState, saveEngineState, clearEngineState } from './statePersistence.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTelegramAlert } from './telegram.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- FORCED LIVE TESTNET CONFIGURATION ---
process.env.ARL_MODE = process.env.ARL_MODE || 'TESTNET';
process.env.LIVE_TRADING_ENABLED = process.env.LIVE_TRADING_ENABLED || 'true';
process.env.MAX_DAILY_CAPITAL = process.env.MAX_DAILY_CAPITAL || '1000';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files from the Vite build output (dist)
app.use(express.static(path.join(__dirname, '../dist')));
app.use(express.json());

import { register } from '../src/observability/index.js';

// Middleware para proteção de rotas administrativas quando ADMIN_API_KEY estiver configurada
const authenticateAdmin = (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return next();
  const keyHeader = req.headers['x-admin-key'] || req.query.adminKey || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
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

// API endpoints for deleting, closing, and wiping trades from the backend engines
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
    engine.activePosition = null;
    saveEngineState(engines);
    engine.emit('state_changed');
    engine.emit('arl', { type: 'tick', symbol: engine.symbol, mode: engine.mode });
    return res.json({ success: true, message: 'Trade closed successfully' });
  }
  return res.status(404).json({ error: 'Active trade not found for id' });
});

app.post('/api/trades/delete', authenticateAdmin, (req, res) => {
  const { symbol, id } = req.body;
  if (!symbol) return res.status(400).json({ error: 'Symbol is required' });
  const targetSymbol = symbol.toUpperCase().replace('/USD', 'USDT');
  const engine = engines.find(e => e.symbol === targetSymbol);
  if (!engine) return res.status(404).json({ error: 'Engine not found for symbol' });

  let deleted = false;
  if (engine.activePosition && engine.activePosition.id === id) {
    engine.activePosition = null;
    deleted = true;
  }
  const originalLen = engine.tradeHistory.length;
  engine.tradeHistory = engine.tradeHistory.filter(t => t.id !== id);
  if (engine.tradeHistory.length < originalLen) {
    deleted = true;
  }

  if (deleted) {
    saveEngineState(engines);
    engine.emit('state_changed');
    engine.emit('arl', { type: 'tick', symbol: engine.symbol, mode: engine.mode });
    return res.json({ success: true, message: 'Trade deleted successfully' });
  }
  return res.status(404).json({ error: 'Trade not found for id' });
});

app.post('/api/trades/wipe', (req, res) => {
  for (const engine of engines) {
    engine.activePosition = null;
    engine.tradeHistory = [];
    engine.bootTime = Date.now();
    engine.emit('state_changed');
    engine.emit('arl', { type: 'tick', symbol: engine.symbol, mode: engine.mode });
  }
  clearEngineState();
  saveEngineState(engines);

  clients.forEach(client => {
    try {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'wipe_trades' }));
      }
    } catch (e) {
      console.error('[WS] Broadcast wipe failed:', e.message);
    }
  });

  return res.json({ success: true, message: 'All trades wiped successfully' });
});

console.log(`\n======================================================`);
console.log(`🌍 Lyzer Edge: MULTI-ASSET LIVE ENGINE STARTED`);
console.log(`MODE: ${process.env.ARL_MODE}`);
console.log(`CAPITAL LIMIT: $${process.env.MAX_DAILY_CAPITAL}`);
console.log(`======================================================\n`);

app.get('/api/status', (req, res) => {
  res.json({ status: 'Lyzer Core Backend OK', mode: process.env.ARL_MODE });
});

app.get('/api/test-telegram', async (req, res) => {
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

wss.on('connection', (ws) => {
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
  
  // Listen to state changes to persist engine states
  engine.on('state_changed', () => {
    saveEngineState(engines);
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
import { exec } from 'child_process';
const runBackup = () => {
  const scriptPath = path.join(__dirname, '../backup_restore.py');
  console.log('[BACKUP] Triggering database backup to Hugging Face Storage Bucket...');
  exec(`python3 "${scriptPath}" backup`, (err, stdout, stderr) => {
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
