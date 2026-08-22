import sqlite3 from 'sqlite3';
import fs from 'fs';

// Configuration
const DB_PATH = './temp_test_ledger/causal_memory.db';

console.log('--- LYZER EDGE SHADOW REPLAY (OOS-11) ---');

if (!fs.existsSync(DB_PATH)) {
    console.log(`[WAITING] Database not found at ${DB_PATH}. Por favor, coloque o arquivo causal_memory.db baixado do Railway nesta pasta.`);
    process.exit(0);
}

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening db', err);
        process.exit(1);
    }
    console.log('✅ Connected to Causal Memory DB');

    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
        if (err) throw err;
        console.log('Tables found:', rows.map(t => t.name).join(', '));
        
        let checked = 0;
        for (const row of rows) {
            if (row.name === 'sqlite_sequence') {
                checked++;
                continue;
            }
            db.get(`SELECT COUNT(*) as c FROM ${row.name}`, [], (err, countRow) => {
                console.log(`Table ${row.name}: ${countRow.c} rows`);
                checked++;
                if (checked === rows.length) {
                    console.log('--- READY FOR SHADOW REPLAY ---');
                    console.log('Please confirm that you have the DB and we will start the backtest integration.');
                    db.close();
                }
            });
        }
    });
});
