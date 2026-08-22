const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

async function analyzeCourtLedger(dbPath) {
    console.log(`\n===========================================`);
    console.log(`Analyzing: ${dbPath}`);
    console.log(`===========================================`);
    
    const db = new sqlite3.Database(dbPath);
    const query = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    try {
        const rows = await query("SELECT * FROM court_ledger ORDER BY timestamp ASC");
        console.log(`Total records: ${rows.length}`);
        if (rows.length === 0) return;

        // 1. Time Gaps
        let gaps = [];
        let maxGap = 0;
        let crashes = 0; // count of gaps > 5 mins
        
        for (let i = 1; i < rows.length; i++) {
            let gap = rows[i].timestamp - rows[i-1].timestamp;
            if (gap > maxGap) maxGap = gap;
            
            if (gap > 5 * 60 * 1000) { // 5 minutes
                crashes++;
                gaps.push({
                    gap_ms: gap,
                    gap_mins: (gap / 60000).toFixed(2),
                    from: new Date(rows[i-1].timestamp).toISOString(),
                    to: new Date(rows[i].timestamp).toISOString()
                });
            }
        }
        
        console.log(`\n--- 1. Time-Gaps (Crashes/Restarts) ---`);
        console.log(`Max gap: ${maxGap} ms (${(maxGap/60000).toFixed(2)} mins)`);
        console.log(`Number of large gaps (>5 min): ${crashes}`);
        if (gaps.length > 0) {
            gaps.sort((a,b) => b.gap_ms - a.gap_ms);
            console.log(`Top 5 gaps:`);
            console.table(gaps.slice(0, 5));
        }

        // 2. Anomalous Latency Spikes
        // Let's check state_json for latency or processing time.
        console.log(`\n--- 2. Latency / Metrics Anomalies ---`);
        let maxSlippage = 0;
        let latencyAnomalies = 0;
        
        for (let r of rows) {
            if (r.state_json) {
                try {
                    let state = JSON.parse(r.state_json);
                    if (state.currentSlippage && state.currentSlippage > maxSlippage) {
                        maxSlippage = state.currentSlippage;
                    }
                    if (state.latency && state.latency > 500) {
                        latencyAnomalies++;
                    }
                } catch(e){}
            }
        }
        console.log(`Max slippage detected: ${maxSlippage}`);
        console.log(`High latency anomalies: ${latencyAnomalies}`);

        // 3. Unhandled Exceptions
        console.log(`\n--- 3. Unhandled Exceptions / Errors ---`);
        const errors = rows.filter(r => {
            let str = JSON.stringify(r).toLowerCase();
            return str.includes('exception') || str.includes('crash') || str.includes('unhandled') || r.reason?.toLowerCase().includes('error');
        });
        console.log(`Found ${errors.length} events indicating exceptions/errors.`);
        if (errors.length > 0) {
            console.log(`Sample of errors:`);
            errors.slice(0, 3).forEach(e => console.log(`  - ${new Date(e.timestamp).toISOString()}: Reason: ${e.reason}`));
        }

        // 4. Ontological Collapse
        console.log(`\n--- 4. Ontological Collapse Events ---`);
        const collapses = rows.filter(r => {
            let str = JSON.stringify(r).toLowerCase();
            return str.includes('ontological') || str.includes('collapse') || str.includes('epistemic_collapse') || str.includes('regime_collapse') || r.reason?.toLowerCase().includes('collapse');
        });
        console.log(`Found ${collapses.length} ontological collapse events.`);
        
        let reasonsCount = {};
        for (let r of rows) {
            reasonsCount[r.reason] = (reasonsCount[r.reason] || 0) + 1;
        }
        console.log(`\nTop 5 Veto/Rejection Reasons:`);
        Object.entries(reasonsCount)
              .sort((a,b) => b[1] - a[1])
              .slice(0, 5)
              .forEach(([k,v]) => console.log(`  ${k}: ${v}`));
              
    } catch(e) {
        console.error("Error analyzing db:", e.message);
    }
    db.close();
}

async function run() {
    await analyzeCourtLedger('causal_memory.db');
    await analyzeCourtLedger('lyzer edge/causal_memory.db');
    
    console.log(`\n===========================================`);
    console.log(`JSON Analysis`);
    console.log(`===========================================`);
    try {
        let st1 = fs.statSync('binance_ledger.json');
        console.log(`binance_ledger.json size: ${st1.size} bytes`);
    } catch(e) { console.log(e.message) }
    
    try {
        let content = fs.readFileSync('forward_ledger_railway.json', 'utf8');
        console.log(`forward_ledger_railway.json content starts with: ${content.substring(0, 50).trim()}`);
    } catch(e) { console.log(e.message) }
}

run();
