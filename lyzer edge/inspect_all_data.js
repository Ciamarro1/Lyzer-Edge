import fs from 'fs';
import sqlite3 from 'sqlite3';

const dbs = [
  'causal_memory.db',
  'historical_causal_memory.db',
  'temp_test_ledger/historical_causal_memory.db'
];

async function checkDb(path) {
  return new Promise((resolve) => {
    if (!fs.existsSync(path)) {
      resolve({ path, exists: false });
      return;
    }
    const db = new sqlite3.Database(path, (err) => {
      if (err) { resolve({ path, error: err.message }); return; }
      db.all("SELECT name FROM sqlite_master WHERE type='table'", [], async (err, tables) => {
        if (err) { resolve({ path, error: err.message }); return; }
        const res = { path, tables: {} };
        for (const t of tables) {
          await new Promise((r2) => {
            db.get(`SELECT COUNT(*) as c FROM "${t.name}"`, [], (e, cnt) => {
              res.tables[t.name] = cnt ? cnt.c : e?.message;
              r2();
            });
          });
        }
        db.close();
        resolve(res);
      });
    });
  });
}

async function main() {
  for (const dbPath of dbs) {
    const res = await checkDb(dbPath);
    console.log('DB Result:', JSON.stringify(res, null, 2));
  }

  // Check JSON files
  const jsonFiles = [
    'autopsy_trades.json',
    'replay_trades.json',
    'docs/lyzer_edge_backup_2026-07-24.json',
    '../knowledge/research/datasets/research_dataset.csv',
    '../forward_ledger_railway.json',
    '../knowledge/runtime_audit/trade_reconstruction.csv'
  ];

  for (const jf of jsonFiles) {
    if (fs.existsSync(jf)) {
      const stat = fs.statSync(jf);
      console.log(`File: ${jf}, size: ${stat.size} bytes`);
      if (jf.endsWith('.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(jf, 'utf8'));
          if (Array.isArray(content)) {
            console.log(`  -> Array length: ${content.length}`);
            if (content.length > 0) {
              console.log(`  -> First item sample:`, Object.keys(content[0]));
            }
          } else {
            console.log(`  -> Object keys:`, Object.keys(content));
          }
        } catch(e) {
          console.log(`  -> Parse error: ${e.message}`);
        }
      }
    } else {
      console.log(`File: ${jf} does NOT exist`);
    }
  }
}

main().catch(console.error);
