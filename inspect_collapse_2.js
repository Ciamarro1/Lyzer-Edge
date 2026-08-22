const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('lyzer edge/causal_memory.db');
db.all("SELECT * FROM court_ledger", (err, rows) => {
    const collapses = rows.filter(r => JSON.stringify(r).toLowerCase().includes('collapse') || JSON.stringify(r).toLowerCase().includes('ontological'));
    console.log(collapses.slice(0,2).map(r => r.state_json));
});
db.close();
