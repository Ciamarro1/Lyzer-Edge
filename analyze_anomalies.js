const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

async function run() {
  const dbHist = new sqlite3.Database('lyzer edge/temp_test_ledger/historical_causal_memory.db');
  
  const query = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log("--- 1. Time-gaps (crashes/restarts) in causal_events_log ---");
  // Check gaps between sequential events
  try {
    const events = await query(dbHist, "SELECT timestamp, event_type, source FROM causal_events_log ORDER BY timestamp ASC");
    let maxGap = 0;
    let gaps = [];
    for(let i=1; i<events.length; i++) {
        let gap = events[i].timestamp - events[i-1].timestamp;
        if(gap > 60000) { // Gap > 1 minute
            gaps.push({
                gap_ms: gap, 
                from: new Date(events[i-1].timestamp).toISOString(), 
                to: new Date(events[i].timestamp).toISOString(),
                event_before: events[i-1].event_type,
                event_after: events[i].event_type
            });
        }
        if(gap > maxGap) maxGap = gap;
    }
    console.log(`Max Time Gap: ${maxGap} ms`);
    console.log(`Large Gaps (>1m): ${gaps.length}`);
    if (gaps.length > 0) console.log("Top 5 gaps:", gaps.sort((a,b)=>b.gap_ms - a.gap_ms).slice(0,5));
  } catch(e) {
    console.log("Error querying gaps:", e.message);
  }

  console.log("\n--- 2. Anomalous latency spikes (check causal_events_log or JSON) ---");
  // Check payload for latency or processing times
  try {
    const latencies = await query(dbHist, "SELECT event_id, timestamp, payload FROM causal_events_log WHERE payload LIKE '%latency%' OR payload LIKE '%duration%' OR payload LIKE '%time%'");
    console.log(`Found ${latencies.length} events containing latency/duration info.`);
    // parse payload
    let highLatency = [];
    for(let row of latencies) {
        try {
            let p = JSON.parse(row.payload);
            if(p.latency > 1000 || p.processing_time_ms > 1000 || p.duration_ms > 1000) {
                highLatency.push({id: row.event_id, time: new Date(row.timestamp).toISOString(), payload: p});
            }
        } catch(e) {}
    }
    console.log(`Found ${highLatency.length} high latency spikes (>1s).`);
    if(highLatency.length > 0) console.log("Top 5 spikes:", highLatency.slice(0,5));
  } catch(e) {}

  console.log("\n--- 3. Unhandled exceptions (crashes/errors) ---");
  try {
    const errors = await query(dbHist, "SELECT timestamp, event_type, payload FROM causal_events_log WHERE event_type LIKE '%error%' OR event_type LIKE '%exception%' OR event_type LIKE '%crash%' OR payload LIKE '%error%' OR payload LIKE '%exception%' OR payload LIKE '%stacktrace%'");
    console.log(`Found ${errors.length} error/exception events.`);
    for (let i = 0; i < Math.min(errors.length, 5); i++) {
        console.log(`- [${new Date(errors[i].timestamp).toISOString()}] ${errors[i].event_type}: ${errors[i].payload.substring(0, 100)}`);
    }
  } catch(e) {}

  console.log("\n--- 4. 'ontological collapse' events ---");
  try {
    const collapses = await query(dbHist, "SELECT timestamp, event_type, payload, context FROM causal_events_log WHERE event_type LIKE '%ontological%' OR payload LIKE '%ontological%' OR context LIKE '%ontological%' OR event_type LIKE '%collapse%'");
    console.log(`Found ${collapses.length} ontological collapse events.`);
    for (let c of collapses) {
        console.log(`- [${new Date(c.timestamp).toISOString()}] ${c.event_type}`);
        console.log(`  Payload: ${c.payload.substring(0,200)}`);
    }
  } catch(e) {}

  console.log("\n--- JSON ANALYSIS ---");
  const analyzeJSON = (filename) => {
      try {
        let content = fs.readFileSync(filename, 'utf-8');
        let data = JSON.parse(content);
        console.log(`${filename}: parsed successfully. Is array? ${Array.isArray(data)}. Length: ${Array.isArray(data) ? data.length : Object.keys(data).length}`);
        
        // Find errors, latency, collapse in json
        let str = content.toLowerCase();
        console.log(`  Contains 'error': ${str.includes('error')}`);
        console.log(`  Contains 'latency': ${str.includes('latency')}`);
        console.log(`  Contains 'ontological': ${str.includes('ontological')}`);
        console.log(`  Contains 'collapse': ${str.includes('collapse')}`);
      } catch (e) {
          console.log(`Error reading ${filename}: ${e.message}`);
      }
  };
  analyzeJSON('binance_ledger.json');
  analyzeJSON('forward_ledger_railway.json');

  dbHist.close();
}

run();
