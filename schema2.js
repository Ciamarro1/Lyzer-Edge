const sqlite3 = require('sqlite3').verbose();
const db2 = new sqlite3.Database('lyzer edge/temp_test_ledger/historical_causal_memory.db');

db2.serialize(() => {
  db2.each("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, row) => {
    if (err) console.error(err);
    else console.log(row.name, row.sql);
  });
});

db2.close();
