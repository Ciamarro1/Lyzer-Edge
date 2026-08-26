import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('causal_memory.db');
db.all("SELECT * FROM court_ledger ORDER BY timestamp ASC LIMIT 20", [], (err, rows) => {
  if (err) console.error(err);
  else {
    console.log(`Total rows sampled: ${rows.length}`);
    console.log(rows[0]);
    console.log(rows[rows.length - 1]);
  }
});
db.all("SELECT DISTINCT reason, count(*) as count FROM court_ledger GROUP BY reason", [], (err, rows) => {
  console.log('Reason summary:', rows);
});
