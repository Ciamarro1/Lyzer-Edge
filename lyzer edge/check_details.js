import fs from 'fs';
import sqlite3 from 'sqlite3';

async function check() {
  // Check replay_trades.json
  if (fs.existsSync('replay_trades.json')) {
    const rTrades = JSON.parse(fs.readFileSync('replay_trades.json', 'utf8'));
    console.log('replay_trades count:', rTrades.length);
    const exits = {};
    rTrades.forEach(t => {
      const r = t.reasonCodes ? t.reasonCodes[0] : (t.exitReason || 'UNKNOWN');
      exits[r] = (exits[r] || 0) + 1;
    });
    console.log('replay_trades exit reasons:', exits);
  }

  // Check tradeEvents in backup
  const backup = JSON.parse(fs.readFileSync('docs/lyzer_edge_backup_2026-07-24.json', 'utf8'));
  console.log('backup tradeEvents count:', backup.tradeEvents?.length);
  if (backup.tradeEvents?.length > 0) {
    console.log('sample tradeEvent:', backup.tradeEvents[0]);
  }

  // Check candles in historical_causal_memory.db
  const dbHist = new sqlite3.Database('historical_causal_memory.db');
  dbHist.get("SELECT min(timestamp) as min_ts, max(timestamp) as max_ts, count(*) as c FROM candles", [], (err, row) => {
    if (!err) console.log('Historical candles:', row);
  });
}

check();
