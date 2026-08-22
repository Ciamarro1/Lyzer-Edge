const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('lyzer edge/causal_memory.db');
db.all("SELECT reason FROM court_ledger WHERE reason LIKE '%collapse%' OR reason LIKE '%ontological%' LIMIT 10", (err, rows) => {
    console.log(rows);
});
db.close();
