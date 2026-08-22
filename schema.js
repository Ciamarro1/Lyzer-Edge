const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('causal_memory.db');

db.serialize(() => {
  db.each("SELECT sql FROM sqlite_master WHERE type='table'", (err, row) => {
    if (err) console.error(err);
    else console.log(row.sql);
  });
});

db.close();
