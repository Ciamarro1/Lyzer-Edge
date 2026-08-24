const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = 'C:\\Users\\WDAGUtilityAccount\\Downloads\\historical_causal_memory.db';
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        process.exit(1);
    }
});

const GAP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

function checkGapsInTable(tableName, timestampCol) {
    return new Promise((resolve, reject) => {
        const query = `SELECT ${timestampCol} FROM ${tableName} ORDER BY ${timestampCol} ASC`;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error(`Error querying ${tableName}:`, err.message);
                return resolve();
            }
            
            if (rows.length < 2) {
                console.log(`Table ${tableName} has fewer than 2 records, no gaps to detect.`);
                return resolve();
            }

            let anomaliesFound = 0;
            for (let i = 1; i < rows.length; i++) {
                const prev = rows[i - 1][timestampCol];
                const curr = rows[i][timestampCol];
                
                // Skip nulls
                if (prev == null || curr == null) continue;
                
                const gap = curr - prev;
                
                if (gap > GAP_THRESHOLD_MS) {
                    console.log(`[ANOMALY DETECTED] Table: ${tableName}`);
                    console.log(`  Gap of ${gap / 1000} seconds (${(gap / 1000 / 60).toFixed(2)} minutes)`);
                    console.log(`  Between: ${new Date(prev).toISOString()} and ${new Date(curr).toISOString()}`);
                    anomaliesFound++;
                }
            }
            
            if (anomaliesFound === 0) {
                console.log(`No time gaps > 5 minutes found in ${tableName}.`);
            } else {
                console.log(`Found ${anomaliesFound} anomalies in ${tableName}.`);
            }
            resolve();
        });
    });
}

async function main() {
    console.log(`Time Gap Detector started...`);
    console.log(`Threshold: 5 minutes`);
    
    // We will check the ledger and trades tables, and possibly causal_events_log
    const targets = [
        { table: 'evolution_ledger', col: 'created_at' },
        { table: 'court_ledger', col: 'timestamp' },
        { table: 'experiment_trades', col: 'entry_timestamp' },
        { table: 'causal_events_log', col: 'timestamp' }
    ];
    
    for (const target of targets) {
        await checkGapsInTable(target.table, target.col);
    }
    
    db.close((err) => {
        if (err) console.error("Error closing database:", err.message);
        else console.log("Time Gap Detector finished.");
    });
}

main();
