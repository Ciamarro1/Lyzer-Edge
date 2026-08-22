import fs from 'fs';
import https from 'https';
process.env.ARL_MODE = 'SIMULATION';
import { TruthKernel } from '../../packages/lyzer-constitution/src/eca/truthKernel.js';
import { ConstitutionalCourt } from '../../packages/lyzer-constitution/src/eca/court.js';
import { LiquidityReconstructionEngine } from '../../packages/lyzer-shared/src/providers/v1_smc_ict.js';
import { StructuralBoundaryEngine } from '../../packages/lyzer-shared/src/providers/v2_snd_snr.js';
import { MomentumRsiEngine } from '../../packages/lyzer-shared/src/providers/v3_momentum_rsi.js';

const SYMBOL = 'BTCUSDT';
const INTERVAL = '1m';
const LIMIT = 1000;
const FEE = 0.0005; 
const SLIPPAGE_TICKS = 1;
const TICK_SIZE = 0.1;

const TRG_PARAMS = [0.3, 0.4, 0.5, 0.6];
const LHDS_PARAMS = [0.90, 0.95, 0.98, 1.0];
const SHORT_VETO_PARAMS = [true, false]; // Should we bypass short veto?

async function fetchBinanceData() {
    return new Promise((resolve, reject) => {
        const url = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=${LIMIT}`;
        console.log(`[SWEEP] Fetching market data from: ${url}`);
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const json = JSON.parse(data);
                const candles = json.map(k => ({
                    timestamp: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
                    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]), closed: true
                }));
                resolve(candles);
            });
        }).on('error', reject);
    });
}

function evaluateConfig(candles, trg, lhdsLimit, allowShorts) {
    let stats = { trades: 0, wins: 0, losses: 0, netPnl: 0, maxDrawdown: 0, peakEquity: 10000, equity: 10000 };
    const court = new ConstitutionalCourt({ lethalIllusionLimit: 0.9 }, { sclThreshold: 5 });
    const v1 = new LiquidityReconstructionEngine();
    const v2 = new StructuralBoundaryEngine();
    const v3 = new MomentumRsiEngine();
    const truthKernel = new TruthKernel({ trgThreshold: trg, lhdsVetoLimit: lhdsLimit, ontologicalCollapseTrg: 0.7 });

    const WARMUP = 100;
    let position = null;

    for (let i = WARMUP; i < candles.length; i++) {
        const candle = candles[i];
        const window = candles.slice(i - WARMUP, i + 1);
        const mtfCandles = { fast: window, intermediate: window, slow: window };
        
        const v1Sig = v1.reconstruct(mtfCandles);
        const v2Sig = v2.reconstruct(mtfCandles);
        const v3Sig = v3.reconstruct(mtfCandles);

        const sds = Math.abs(v1Sig.confidence - v2Sig.confidence) / 100;
        const lhds = 0.94; // Simulation baseline for this window
        const liquidityDivergence = v3Sig.confidence / 100;
        
        const kernelResult = truthKernel.evaluate({ v1: v1Sig, v2: v2Sig, v3: v3Sig }, { 
            liquidityDivergence, scaleDivergence: sds, lhds, invariants: [], distanceFromGoldenZone: 0.5, 
            weights: { w1: 0.33, w2: 0.33, w3: 0.34 }, oppScore: 2.0, imbalance: 0.6, odm: 0.2 
        });

        court.observeState(kernelResult);
        kernelResult._observed = true;
        const permissionToken = court.requestPermission('EXECUTE_TRADE', { trg: kernelResult.trg, lhds, dvf: 0, _observed: true }, { eef: kernelResult.eef, reason: 'BACKTEST', _observed: true });
        
        let granted = permissionToken.granted;
        if (permissionToken.reason && permissionToken.reason.includes('RECOVERY')) granted = false;

        if (position) {
            if (position.type === 'LONG') {
                if (candle.close >= position.tp || candle.close <= position.sl) {
                    const exitPrice = candle.close <= position.sl ? position.sl - (SLIPPAGE_TICKS * TICK_SIZE) : position.tp;
                    const pnl = (exitPrice - position.entry) * position.qty;
                    closePosition(pnl - (exitPrice * position.qty) * FEE);
                    position = null;
                }
            } else if (position.type === 'SHORT') {
                if (candle.close <= position.tp || candle.close >= position.sl) {
                    const exitPrice = candle.close >= position.sl ? position.sl + (SLIPPAGE_TICKS * TICK_SIZE) : position.tp;
                    const pnl = (position.entry - exitPrice) * position.qty;
                    closePosition(pnl - (exitPrice * position.qty) * FEE);
                    position = null;
                }
            }
        }

        if (!position && granted) {
            let dir = null;
            if (v1Sig.signal === 'long' || v2Sig.signal === 'long' || v3Sig.signal === 'long') dir = 'LONG';
            if (v1Sig.signal === 'short' || v2Sig.signal === 'short' || v3Sig.signal === 'short') dir = 'SHORT';
            
            if (dir === 'SHORT' && !allowShorts) dir = null; // Veto shorts

            if (dir) {
                const entryPrice = dir === 'LONG' ? candle.close + (SLIPPAGE_TICKS * TICK_SIZE) : candle.close - (SLIPPAGE_TICKS * TICK_SIZE);
                const qty = (stats.equity * 0.1) / entryPrice;
                stats.equity -= (entryPrice * qty) * FEE;
                position = { type: dir, entry: entryPrice, qty: qty, sl: dir === 'LONG' ? entryPrice * 0.99 : entryPrice * 1.01, tp: dir === 'LONG' ? entryPrice * 1.02 : entryPrice * 0.98 };
            }
        }
    }
    
    if (position) closePosition(0);

    function closePosition(netPnl) {
        stats.equity += netPnl;
        stats.trades++;
        if (netPnl > 0) stats.wins++; else stats.losses++;
        if (stats.equity > stats.peakEquity) stats.peakEquity = stats.equity;
        const drawdown = (stats.peakEquity - stats.equity) / stats.peakEquity;
        if (drawdown > stats.maxDrawdown) stats.maxDrawdown = drawdown;
    }

    stats.netPnl = stats.equity - 10000;
    return stats;
}

async function runTournament() {
    const candles = await fetchBinanceData();
    let best = null;
    let results = [];

    for (let trg of TRG_PARAMS) {
        for (let lhds of LHDS_PARAMS) {
            for (let allowShorts of SHORT_VETO_PARAMS) {
                const stats = evaluateConfig(candles, trg, lhds, allowShorts);
                const score = stats.netPnl; // Adaptive Advantage score
                const configStr = `TRG: ${trg} | LHDS Limit: ${lhds} | Shorts Allowed: ${allowShorts}`;
                results.push({ config: configStr, stats, score });
                
                if (!best || score > best.score) {
                    best = { config: configStr, stats, score };
                }
            }
        }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    let md = `# Parameter Sweep Tournament Results\n\n`;
    md += `**Best Configuration Found:**\n`;
    md += `- **${best.config}**\n`;
    md += `- **Net PnL:** $${best.stats.netPnl.toFixed(2)}\n`;
    md += `- **Trades:** ${best.stats.trades} (${best.stats.wins}W / ${best.stats.losses}L)\n\n`;
    
    md += `### Top 5 Configurations\n`;
    for (let i = 0; i < Math.min(5, results.length); i++) {
        md += `${i+1}. ${results[i].config} -> $${results[i].score.toFixed(2)}\n`;
    }

    fs.writeFileSync('sweep_results.md', md);
    console.log('[SWEEP] Complete! Saved to sweep_results.md');
}

runTournament().catch(console.error);
