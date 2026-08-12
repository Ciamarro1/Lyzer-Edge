import fs from 'fs/promises';
import path from 'path';

const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT'];
const directory = 'C:\\Users\\WDAGUtilityAccount\\.gemini\\antigravity\\scratch\\Lyzer-Edge\\lyzer edge';

async function runAnalysis() {
    console.log("=== MACRO ANALYSIS RUNNING ===");
    const results = {};
    const toxic_anomalies = {};

    const dow_stats = {};
    const month_stats = {};
    const hour_stats = {};

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    for (const sym of symbols) {
        const filepath = path.join(directory, `macro_backtest_${sym}_hud.json`);
        try {
            const rawData = await fs.readFile(filepath, 'utf8');
            const data = JSON.parse(rawData);
            
            console.log(`Processing ${sym}... Records: ${data.length}`);
            
            const breakdowns = data.filter(d => (d.lhds || 0) > 0.99 && (d.trg || 1) < 0.1);
            results[sym] = breakdowns.length;
            
            const breaches = data.filter(d => d.eef === true && ((d.lhds || 0) > 0.9 || (d.trg || 1) < 0.35));
            if (breaches.length > 0) {
                console.log(`CONSTITUTION BREACH IN ${sym}: ${breaches.length} times`);
            }
            
            const convex = data.filter(d => (d.trg || 0) > 1.5 && (d.lhds || 1) < 0.8);
            if (convex.length > 0) {
                console.log(`CONVEXITY BLACK SWANS IN ${sym}: ${convex.length} times`);
            }
            
            if (breakdowns.length > 0) {
                toxic_anomalies[sym] = breakdowns.slice(0, 10).map(d => [d.t_str, d.lhds, d.trg]);
            }
            
            for (const row of data) {
                const lhds = row.lhds;
                if (lhds === undefined || lhds === null) continue;
                
                const dt = new Date(row.t);
                const dow = days[dt.getUTCDay()];
                const month = months[dt.getUTCMonth()];
                const hour = dt.getUTCHours();
                
                if (!dow_stats[dow]) dow_stats[dow] = [0, 0];
                dow_stats[dow][0] += lhds;
                dow_stats[dow][1] += 1;
                
                if (!month_stats[month]) month_stats[month] = [0, 0];
                month_stats[month][0] += lhds;
                month_stats[month][1] += 1;
                
                if (!hour_stats[hour]) hour_stats[hour] = [0, 0];
                hour_stats[hour][0] += lhds;
                hour_stats[hour][1] += 1;
            }
            
        } catch (e) {
            console.log(`File not found or error for ${sym}: ${e.message}`);
        }
    }

    console.log("\n=== STRUCTURAL BREAKDOWNS COUNT (TOXICITY) ===");
    for (const [sym, count] of Object.entries(results)) {
        console.log(`${sym}: ${count}`);
    }

    const most_severe = Object.keys(results).reduce((a, b) => results[a] > results[b] ? a : b);
    console.log(`=> Asset with most severe structural breakdowns: ${most_severe} (${results[most_severe]} instances)`);

    console.log("\n=== SEASONALITY OF LHDS (LIQUIDITY HOLES) ===");
    
    let bestDow = null, bestDowVal = Infinity;
    for (const [k, v] of Object.entries(dow_stats)) {
        const avg = v[0] / v[1];
        if (avg < bestDowVal) { bestDowVal = avg; bestDow = k; }
    }
    console.log(`Best Day of Week (Lowest LHDS): ${bestDow} (Avg LHDS: ${bestDowVal.toFixed(6)})`);
    
    let bestMonth = null, bestMonthVal = Infinity;
    for (const [k, v] of Object.entries(month_stats)) {
        const avg = v[0] / v[1];
        if (avg < bestMonthVal) { bestMonthVal = avg; bestMonth = k; }
    }
    console.log(`Best Month (Lowest LHDS): ${bestMonth} (Avg LHDS: ${bestMonthVal.toFixed(6)})`);
    
    let bestHour = null, bestHourVal = Infinity;
    for (const [k, v] of Object.entries(hour_stats)) {
        const avg = v[0] / v[1];
        if (avg < bestHourVal) { bestHourVal = avg; bestHour = k; }
    }
    console.log(`Best UTC Hour (Lowest LHDS): ${String(bestHour).padStart(2, '0')}:00 (Avg LHDS: ${bestHourVal.toFixed(6)})`);
}

runAnalysis().catch(console.error);
