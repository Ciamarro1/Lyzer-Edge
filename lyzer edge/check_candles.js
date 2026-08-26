import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('historical_causal_memory.db');
db.all("SELECT symbol, count(*) as count, min(timestamp) as min_t, max(timestamp) as max_t FROM candles GROUP BY symbol", [], (err, rows) => {
  console.log('Candles by symbol:', rows);
});
