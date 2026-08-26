import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('historical_causal_memory.db');
db.all("SELECT event_type, count(*) as c FROM causal_events_log GROUP BY event_type", [], (err, rows) => {
  console.log('causal_events_log counts:', rows);
});

db.all("SELECT * FROM causal_events_log LIMIT 5", [], (err, rows) => {
  console.log('Sample causal_events_log:', rows);
});
