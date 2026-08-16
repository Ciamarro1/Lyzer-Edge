import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import '../env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYMBOL = 'BTCUSDT';
const STARTING_WALLET = 10000;
const RISK_PER_TRADE = 0.10;
const LEVERAGE = 10;
const SLIPPAGE_PCT = 0.0005; // 0.05% per leg

async function runBacktestMode(modeName, config) {
    // Mute logs
    const originalLog = console.log;
    console.log = function(...args) {
        if (typeof args[0] === 'string' && args[0].includes('PROGRESS')) {
            originalLog.apply(console, args);
        }
    };

    process.env.ARL_MODE = 'SIMULATION';
    process.env.TRG_THRESHOLD = config.trgThreshold || '0.35';
    process.env.RESIDUAL_CONSENSUS_LIMIT = '0.005';
    process.env.LHDS_VETO_LIMIT = '0.995';
    process.env.CCLIST_DVF_FLOOR = '0.1';
    process.env.ABLATION_NO_GOLDEN_HOURS = config.ablationNoGoldenHours ? 'true' : 'false';

    const { StreamEngine } = await import(`../streamEngine.js?t=${Date.now()}_${modeName}`);
    const { ExchangeExecution } = await import(`../exchangeExecution.js?t=${Date.now()}_${modeName}`);

    const engine = new StreamEngine({ symbol: SYMBOL, mode: 'SIMULATION' });
    engine.execution = new ExchangeExecution('SIMULATION');

    // Load dataset: try 1m 25d first, then fallback to historical_data_BTCUSDT
    let rawData;
    const path25d = path.join(__dirname, '../../.data/BTCUSDT_1m_25d.json');
    if (fs.existsSync(path25d)) {
        rawData = fs.readFileSync(path25d, 'utf8');
    } else {
        rawData = fs.readFileSync(path.join(__dirname, `../../historical_data_${SYMBOL}.json`), 'utf8');
    }
    const allCandles = JSON.parse(rawData);

    // Warmup: 5000 candles for 25d (or 10000)
    const warmupCount = Math.min(5000, Math.floor(allCandles.length * 0.2));
    const warmupCandles = allCandles.slice(0, warmupCount);
    const activeCandles = allCandles.slice(warmupCount);

    let wallet = STARTING_WALLET;
    let peakWallet = wallet;
    let maxDrawdown = 0;
    const trades = [];

    engine.on('arl', (event) => {
        if (event.type === 'arl' && event.trade && event.trade.status === 'closed') {
            const t = event.trade;
            const absolutePnl = t.pnl * wallet;
            const slippagePenalty = wallet * (SLIPPAGE_PCT * 2);
            const finalPnl = absolutePnl - slippagePenalty;

            let result = 'BE';
            if (Math.abs(t.pnl) < 0.0001) result = 'BE';
            else if (finalPnl > 0) result = 'WIN';
            else result = 'LOSS';

            wallet += finalPnl;
            if (wallet > peakWallet) peakWallet = wallet;
            const dd = (peakWallet - wallet) / peakWallet;
            if (dd > maxDrawdown) maxDrawdown = dd;

            const entryDate = new Date(t.entryTime || t.timestamp || 0);
            trades.push({
                index: trades.length + 1,
                direction: t.direction,
                entryPrice: t.entryPrice,
                exitPrice: t.exitPrice,
                pnlPct: t.pnl,
                finalPnl,
                result,
                walletBalance: wallet,
                entryHourUTC: entryDate.getUTCHours(),
                entryTimestamp: entryDate.toISOString(),
                exitTimestamp: t.exitTime ? new Date(t.exitTime).toISOString() : null,
                holdingMinutes: t.exitTime && t.entryTime ? Math.round((t.exitTime - t.entryTime) / 60000) : 0,
                trg: t.trg || 0,
                lhds: t.lhds || 0
            });
        }
    });

    // Initialize engine
    engine.ingestor = { onTick: () => {} };
    engine.mtfCandles = { '1m': [], '5m': [], '15m': [], '1h': [], '4h': [], '1d': [] };
    engine.setupMtfAliases();
    engine.candles = engine.mtfCandles['1m'];
    engine.initializeExecution();

    for (const c of warmupCandles) {
        const tickEvent = { ...c, timestamp: c.openTime, closed: true };
        engine.updateMtfCandles(tickEvent);
        await engine.processCandle(tickEvent, engine.tickCounter, true);
    }

    engine.ingestor.onTick = (candle) => {
        engine.checkTickPositionExit(candle);
        engine.emit('arl', { type: 'tick', symbol: engine.symbol, market: candle, mode: engine.mode });
    };

    for (let i = 0; i < activeCandles.length; i++) {
        const c = activeCandles[i];
        const tickEvent = { ...c, timestamp: c.openTime, closed: true };
        engine.updateMtfCandles(tickEvent);
        await engine.processCandle(tickEvent, engine.tickCounter, false);
        engine.ingestor.onTick(tickEvent);
    }

    console.log = originalLog;

    // Compute performance metrics
    const wins = trades.filter(t => t.result === 'WIN').length;
    const losses = trades.filter(t => t.result === 'LOSS').length;
    const bes = trades.filter(t => t.result === 'BE').length;
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const netPnl = wallet - STARTING_WALLET;
    const returnPct = (netPnl / STARTING_WALLET) * 100;

    const grossProfit = trades.filter(t => t.finalPnl > 0).reduce((acc, t) => acc + t.finalPnl, 0);
    const grossLoss = Math.abs(trades.filter(t => t.finalPnl < 0).reduce((acc, t) => acc + t.finalPnl, 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? 99.9 : 0;

    // Trades per hour
    const hourlyTrades = Array.from({ length: 24 }, (_, h) => {
        const hTrades = trades.filter(t => t.entryHourUTC === h);
        const hWins = hTrades.filter(t => t.result === 'WIN').length;
        const hLosses = hTrades.filter(t => t.result === 'LOSS').length;
        const hPnl = hTrades.reduce((acc, t) => acc + t.finalPnl, 0);
        return {
            hour: h,
            trades: hTrades.length,
            wins: hWins,
            losses: hLosses,
            winRate: hTrades.length > 0 ? ((hWins / hTrades.length) * 100).toFixed(1) + '%' : 'N/A',
            netPnl: hPnl.toFixed(2)
        };
    });

    return {
        modeName,
        totalTrades,
        wins,
        losses,
        bes,
        winRate: winRate.toFixed(2) + '%',
        netPnl: netPnl.toFixed(2),
        returnPct: returnPct.toFixed(2) + '%',
        finalWallet: wallet.toFixed(2),
        maxDrawdown: (maxDrawdown * 100).toFixed(2) + '%',
        profitFactor: profitFactor.toFixed(2),
        trades,
        hourlyTrades
    };
}

async function main() {
    console.log('Running comparative backtests on 25-day 1m dataset...');

    // 1. Strict Golden Hours (Current baseline)
    const resGolden = await runBacktestMode('STRICT_GOLDEN_HOURS', {
        ablationNoGoldenHours: false,
        trgThreshold: '0.35'
    });

    // 2. Raw 24/7 (Ablation without Golden Hours filter)
    const resRaw247 = await runBacktestMode('RAW_24_7', {
        ablationNoGoldenHours: true,
        trgThreshold: '0.35'
    });

    console.log('\n=============================================');
    console.log('🏆 COMPARATIVE BACKTEST RESULTS (25-DAY 1M)');
    console.log('=============================================');
    console.table([
        {
            Mode: resGolden.modeName,
            Trades: resGolden.totalTrades,
            Wins: resGolden.wins,
            Losses: resGolden.losses,
            BE: resGolden.bes,
            'Win Rate': resGolden.winRate,
            'Net PnL ($)': resGolden.netPnl,
            'Return %': resGolden.returnPct,
            'Max DD %': resGolden.maxDrawdown,
            'Profit Factor': resGolden.profitFactor
        },
        {
            Mode: resRaw247.modeName,
            Trades: resRaw247.totalTrades,
            Wins: resRaw247.wins,
            Losses: resRaw247.losses,
            BE: resRaw247.bes,
            'Win Rate': resRaw247.winRate,
            'Net PnL ($)': resRaw247.netPnl,
            'Return %': resRaw247.returnPct,
            'Max DD %': resRaw247.maxDrawdown,
            'Profit Factor': resRaw247.profitFactor
        }
    ]);

    console.log('\n=== HOURLY DISTRIBUTION IN RAW 24/7 ===');
    console.table(resRaw247.hourlyTrades);

    fs.writeFileSync('./backtest_ablation_24_7_results.json', JSON.stringify({
        strictGolden: resGolden,
        raw247: resRaw247
    }, null, 2));

    console.log('\nSaved backtest results to backtest_ablation_24_7_results.json');
}

main().catch(console.error);
