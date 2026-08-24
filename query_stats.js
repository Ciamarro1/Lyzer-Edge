const sqlite3 = require('sqlite3');
const fs = require('fs');

const db = new sqlite3.Database('C:\\Users\\WDAGUtilityAccount\\Downloads\\historical_causal_memory.db');

async function run() {
    console.log("=== Court Ledger Auditor ===");
    const ledgerCounts = await new Promise((res, rej) => {
        db.all("SELECT verdict, count(*) as count FROM court_ledger GROUP BY verdict", [], (err, rows) => {
            if (err) return res([]);
            res(rows);
        });
    });
    console.log("Verdicts:", ledgerCounts);

    const nearMisses = await new Promise((res, rej) => {
        db.all("SELECT near_miss_type, count(*) as count FROM court_ledger WHERE near_miss_type IS NOT NULL GROUP BY near_miss_type", [], (err, rows) => {
            if (err) return res([]);
            res(rows);
        });
    });
    console.log("Edge Riding Near Misses:", nearMisses);

    console.log("\n=== Trade Revisor ===");
    const tradeStats = await new Promise((res, rej) => {
        db.get("SELECT count(*) as count, sum(pnl) as total_pnl, sum(pnl_pct) as total_pnl_pct FROM experiment_trades", [], (err, row) => {
            if (err) return res(null);
            res(row);
        });
    });
    console.log("Trade Stats:", tradeStats);

    console.log("\n=== Time Gap Detector ===");
    const timestamps = await new Promise((res, rej) => {
        db.all("SELECT timestamp FROM court_ledger ORDER BY timestamp ASC", [], (err, rows) => {
            if (err) return res([]);
            res(rows);
        });
    });
    let gapsCount = 0;
    for (let i = 1; i < timestamps.length; i++) {
        const diff = timestamps[i].timestamp - timestamps[i-1].timestamp;
        if (diff > 5 * 60 * 1000) {
            gapsCount++;
        }
    }
    console.log("Number of Time Gaps > 5 mins in court_ledger:", gapsCount);

    console.log("\n=== Tail Risk Analyst ===");
    const tailRiskEvents = await new Promise((res, rej) => {
        db.get("SELECT count(*) as count FROM causal_events_log WHERE payload LIKE '%TRG%' OR payload LIKE '%LHDS%' OR payload LIKE '%collapse%'", [], (err, row) => {
            if (err) return res({ count: 0 });
            res(row);
        });
    });
    console.log("Tail Risk / TRG / LHDS Mentions in causal_events_log:", tailRiskEvents.count);

    db.close();
}

run();
