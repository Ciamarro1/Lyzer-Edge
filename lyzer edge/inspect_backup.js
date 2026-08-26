import fs from 'fs';
import sqlite3 from 'sqlite3';

async function main() {
  const backup = JSON.parse(fs.readFileSync('docs/lyzer_edge_backup_2026-07-24.json', 'utf8'));
  console.log('Backup trades count:', backup.trades.length);
  if (backup.trades.length > 0) {
    console.log('Backup trade sample:', backup.trades[0]);
    console.log('Backup trade keys:', Object.keys(backup.trades[0]));
    // check if any trades have railway tag, or check count of closed trades
    const closed = backup.trades.filter(t => t.status === 'closed');
    console.log('Backup closed trades:', closed.length);
  }

  // Check causal_events_log in historical_causal_memory.db
  const dbHist = new sqlite3.Database('historical_causal_memory.db');
  dbHist.all("SELECT DISTINCT event_type FROM causal_events_log", [], (err, rows) => {
    if (!err) console.log('Historical causal event types:', rows.map(r => r.event_type));
  });

  // Check court_ledger in causal_memory.db
  const dbCausal = new sqlite3.Database('causal_memory.db');
  dbCausal.all("SELECT DISTINCT state_json, reason, count(*) as count FROM court_ledger GROUP BY reason", [], (err, rows) => {
    if (!err) console.log('Causal memory court_ledger summary:', rows);
  });
}

main().catch(console.error);
