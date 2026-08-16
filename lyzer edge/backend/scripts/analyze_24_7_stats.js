import fs from 'fs/promises';
import path from 'path';

async function main() {
    const dataPath = path.join(process.cwd(), '.data/BTCUSDT_1m_25d.json');
    console.log(`Loading dataset from ${dataPath}...`);
    const raw = await fs.readFile(dataPath, 'utf8');
    const candles = JSON.parse(raw);
    console.log(`Loaded ${candles.length} candles.`);

    // 1. Hourly buckets (0 to 23 UTC)
    const hourlyData = Array.from({ length: 24 }, () => ({
        count: 0,
        volumes: [],
        ranges: [], // (high - low) / close
        logReturns: [],
        parkinsonSum: 0,
        garmanKlassSum: 0,
        wickToBody: [],
        efficiencyRatios: [], // 15-min lookback ER
        sweeps: 0, // high/low wick >= 2x body
        jumps: 0, // |return| > 3 * sigma
    }));

    // Precompute log returns and 15m efficiency ratio
    const ER_PERIOD = 15;
    for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const date = new Date(c.openTime || c.timestamp);
        const hour = date.getUTCHours();
        const o = c.open, h = c.high, l = c.low, cl = c.close, v = c.volume;

        const rangePct = (h - l) / cl;
        const body = Math.abs(cl - o);
        const upperWick = h - Math.max(o, cl);
        const lowerWick = Math.min(o, cl) - l;
        const totalWick = upperWick + lowerWick;
        const wickRatio = body > 1e-6 ? totalWick / body : 5.0;

        // Log return
        let logRet = 0;
        if (i > 0) {
            logRet = Math.log(cl / candles[i - 1].close);
        }

        // Parkinson term: (ln(H/L))^2 / (4 * ln 2)
        const logHL = Math.log(h / Math.max(l, 1e-6));
        const parkinsonTerm = (logHL * logHL) / (4 * Math.LN2);

        // Garman Klass term: 0.5 * (ln(H/L))^2 - (2*ln2 - 1) * (ln(C/O))^2
        const logCO = Math.log(cl / Math.max(o, 1e-6));
        const gkTerm = 0.5 * (logHL * logHL) - (2 * Math.LN2 - 1) * (logCO * logCO);

        // Efficiency ratio over ER_PERIOD
        let er = 0.5;
        if (i >= ER_PERIOD) {
            const netChange = Math.abs(cl - candles[i - ER_PERIOD].close);
            let pathLen = 0;
            for (let k = i - ER_PERIOD + 1; k <= i; k++) {
                pathLen += Math.abs(candles[k].close - candles[k - 1].close);
            }
            er = pathLen > 1e-6 ? netChange / pathLen : 0;
        }

        const hObj = hourlyData[hour];
        hObj.count++;
        hObj.volumes.push(v);
        hObj.ranges.push(rangePct);
        hObj.logReturns.push(logRet);
        hObj.parkinsonSum += parkinsonTerm;
        hObj.garmanKlassSum += gkTerm;
        hObj.wickToBody.push(Math.min(wickRatio, 10)); // cap outlier
        if (i >= ER_PERIOD) hObj.efficiencyRatios.push(er);

        if (wickRatio > 2.5 && rangePct > 0.001) {
            hObj.sweeps++;
        }
    }

    // Compute global metrics for jump detection
    const allReturns = candles.slice(1).map((c, i) => Math.log(c.close / candles[i].close));
    const globalMeanRet = allReturns.reduce((a, b) => a + b, 0) / allReturns.length;
    const globalVarRet = allReturns.reduce((a, b) => a + Math.pow(b - globalMeanRet, 2), 0) / allReturns.length;
    const globalStdRet = Math.sqrt(globalVarRet);

    // Compute statistics per hour
    function getPercentile(arr, p) {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = Math.floor((p / 100) * (sorted.length - 1));
        return sorted[idx];
    }

    function getStats(arr) {
        if (!arr.length) return { mean: 0, std: 0, median: 0, p95: 0, p99: 0 };
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
        const std = Math.sqrt(variance);
        return {
            mean,
            std,
            median: getPercentile(arr, 50),
            p95: getPercentile(arr, 95),
            p99: getPercentile(arr, 99),
            sum: arr.reduce((a, b) => a + b, 0)
        };
    }

    const hourlySummary = hourlyData.map((h, hour) => {
        const volStats = getStats(h.volumes);
        const rangeStats = getStats(h.ranges);
        const retStats = getStats(h.logReturns);
        const erStats = getStats(h.efficiencyRatios);
        const wickStats = getStats(h.wickToBody);

        const parkinsonVolAnnualized = Math.sqrt(h.parkinsonSum / h.count) * Math.sqrt(365 * 24 * 60);
        const gkVolAnnualized = Math.sqrt(Math.max(0, h.garmanKlassSum / h.count)) * Math.sqrt(365 * 24 * 60);

        // Skewness and Kurtosis
        const n = h.logReturns.length;
        let m3 = 0, m4 = 0;
        for (const r of h.logReturns) {
            m3 += Math.pow(r - retStats.mean, 3);
            m4 += Math.pow(r - retStats.mean, 4);
        }
        const skewness = retStats.std > 1e-8 ? (m3 / n) / Math.pow(retStats.std, 3) : 0;
        const kurtosis = retStats.std > 1e-8 ? (m4 / n) / Math.pow(retStats.std, 4) : 3;

        // VaR 99% and CVaR 99% (Historical Expected Shortfall on 1m returns)
        const sortedRet = [...h.logReturns].sort((a, b) => a - b);
        const var99Idx = Math.floor(0.01 * sortedRet.length);
        const var99 = -sortedRet[var99Idx];
        const tailReturns = sortedRet.slice(0, var99Idx);
        const cvar99 = tailReturns.length > 0 ? - (tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length) : var99;

        // Is Golden Hour: (08-12 UTC, 19-21 UTC)
        const isGolden = (hour >= 8 && hour < 12) || (hour >= 19 && hour < 21);
        const isAsian = hour >= 0 && hour < 8;
        const isOffPeak = (hour >= 21 && hour < 24) || (hour >= 12 && hour < 19 && !isGolden);

        return {
            hour,
            isGolden,
            isAsian,
            candleCount: h.count,
            meanVolume: volStats.mean,
            medianVolume: volStats.median,
            totalVolume: volStats.sum,
            meanRangePct: rangeStats.mean * 100,
            parkinsonVolAnnualized: parkinsonVolAnnualized * 100,
            gkVolAnnualized: gkVolAnnualized * 100,
            returnStd1mPct: retStats.std * 100,
            efficiencyRatioMean: erStats.mean,
            noiseToSignalRatio: 1 - erStats.mean,
            wickToBodyMean: wickStats.mean,
            sweepRatePct: (h.sweeps / h.count) * 100,
            skewness,
            kurtosis,
            var99_1mPct: var99 * 100,
            cvar99_1mPct: cvar99 * 100
        };
    });

    // Session-level aggregation
    const sessions = {
        'Golden Hours (08-12, 19-21 UTC)': hourlySummary.filter(h => h.isGolden),
        'Asian Session (00-08 UTC)': hourlySummary.filter(h => h.isAsian),
        'Rest of Day / Off-Peak (12-19, 21-24 UTC)': hourlySummary.filter(h => !h.isGolden && !h.isAsian),
        'Global 24/7 (All Hours)': hourlySummary
    };

    const sessionSummary = {};
    for (const [name, list] of Object.entries(sessions)) {
        const totalCandles = list.reduce((a, b) => a + b.candleCount, 0);
        const weightedMean = (key) => list.reduce((a, b) => a + b[key] * b.candleCount, 0) / totalCandles;
        sessionSummary[name] = {
            hoursCount: list.length,
            totalCandles,
            shareOfDayPct: (list.length / 24) * 100,
            meanVolume: weightedMean('meanVolume'),
            totalVolume: list.reduce((a, b) => a + b.totalVolume, 0),
            meanRangePct: weightedMean('meanRangePct'),
            parkinsonVol: weightedMean('parkinsonVolAnnualized'),
            gkVol: weightedMean('gkVolAnnualized'),
            efficiencyRatio: weightedMean('efficiencyRatioMean'),
            noiseToSignalRatio: weightedMean('noiseToSignalRatio'),
            wickToBodyRatio: weightedMean('wickToBodyMean'),
            sweepRatePct: weightedMean('sweepRatePct'),
            kurtosis: weightedMean('kurtosis'),
            var99_1m: weightedMean('var99_1mPct'),
            cvar99_1m: weightedMean('cvar99_1mPct')
        };
    }

    console.log('\n=== HOURLY STATISTICAL MATRIX (UTC) ===');
    console.table(hourlySummary.map(h => ({
        Hour: `${String(h.hour).padStart(2, '0')}:00`,
        'Type': h.isGolden ? 'GOLDEN' : (h.isAsian ? 'ASIAN' : 'OFF-PEAK'),
        'Vol (BTC)': h.meanVolume.toFixed(2),
        'Range %': h.meanRangePct.toFixed(3) + '%',
        'GK Vol %': h.gkVolAnnualized.toFixed(1) + '%',
        'Eff Ratio': h.efficiencyRatioMean.toFixed(3),
        'Noise/Signal': h.noiseToSignalRatio.toFixed(3),
        'Wick/Body': h.wickToBodyMean.toFixed(2),
        'Sweep %': h.sweepRatePct.toFixed(1) + '%',
        'Kurtosis': h.kurtosis.toFixed(1),
        'VaR 99%': h.var99_1mPct.toFixed(3) + '%',
        'CVaR 99%': h.cvar99_1mPct.toFixed(3) + '%'
    })));

    console.log('\n=== SESSION COMPARISON MATRIX ===');
    console.table(sessionSummary);

    const outJson = {
        dataset: {
            symbol: 'BTCUSDT',
            timeframe: '1m',
            totalCandles: candles.length,
            days: (candles.length / 1440).toFixed(2),
            startDate: new Date(candles[0].openTime).toISOString(),
            endDate: new Date(candles[candles.length - 1].openTime).toISOString()
        },
        sessions: sessionSummary,
        hourly: hourlySummary
    };

    await fs.writeFile('./session_statistical_audit.json', JSON.stringify(outJson, null, 2));
    console.log('Saved detailed results to session_statistical_audit.json');
}

main().catch(console.error);
