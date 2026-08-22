const sqlite3 = require('sqlite3').verbose();

async function inspect(dbPath) {
    console.log(`\n=== Inspecting ${dbPath} ===`);
    const db = new sqlite3.Database(dbPath);
    
    const query = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    try {
        const tables = await query("SELECT name FROM sqlite_master WHERE type='table'");
        for (let t of tables) {
            const countRow = await query(`SELECT COUNT(*) as c FROM ${t.name}`);
            console.log(`Table ${t.name}: ${countRow[0].c} rows`);
            
            if (countRow[0].c > 0) {
                const sample = await query(`SELECT * FROM ${t.name} LIMIT 1`);
                console.log(`  Sample:`, sample[0]);
            }
        }
    } catch(e) {
        console.error("Error:", e.message);
    }
    
    db.close();
}

async function run() {
    await inspect('causal_memory.db');
    await inspect('lyzer edge/causal_memory.db');
    await inspect('lyzer edge/temp_test_ledger/historical_causal_memory.db');
}

run();
