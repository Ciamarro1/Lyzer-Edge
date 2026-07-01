import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { StreamEngine, arl } from './streamEngine.js';
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
      trades: engine.tradeHistory,
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
  
  engines.push(engine);
}

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
