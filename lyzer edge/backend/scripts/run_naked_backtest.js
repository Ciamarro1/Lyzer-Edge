import fs from 'fs/promises';
import path from 'path';
import { HistoricalDataSanitizer } from '../HistoricalDataSanitizer.js';
import { EventSourcedBacktester } from '../EventSourcedBacktester.js';
import { db } from '../db.js';

const ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT'];
const WALLET_START = 10000; // $10,000 USD
const RISK_PER_TRADE = 0.10; // 10% risk per trade -> $1,000 position size
const TP_PCT = 0.015; // 1.5% take profit
const SL_PCT = 0.005; // 0.5% stop loss
const LEVERAGE = 10; // 10x leverage

async function runNakedAsset(symbol) {
    const filename = path.join(process.cwd(), `historical_data_${symbol}.json`);
    console.log(`[NAKED-BACKTEST] Loading ${filename}...`);
    try {
        const rawData = await fs.readFile(filename, 'utf8');
        const allCandles = JSON.parse(rawData);
        
        // 3 months of 5m candles = 90 days * 24 hours * 12 candles = 25,920 candles
        const candles3Months = allCandles.slice(-25920);
        console.log(`[NAKED-BACKTEST] ${symbol}: Sliced to last 3 months (${candles3Months.length} candles).`);
        
        const sanitizer = new HistoricalDataSanitizer({ maxDeltaPct: 0.15, intervalMs: 300000 });
        const { cleanCandles } = sanitizer.sanitize(candles3Months);
        
        // NAKED MODE: Disable the Constitutional Guardian!
        process.env.TRG_THRESHOLD = '0.35';
        process.env.RESIDUAL_CONSENSUS_LIMIT = '0.005';
        process.env.CCLIST_DVF_FLOOR = '0.1';
        process.env.LHDS_VETO_LIMIT = '1.0'; // BYPASS VETO!
        process.env.ARL_MODE = 'SIMULATION';
        
        const backtester = new EventSourcedBacktester(db);
        
        // Mock PnL Tracker
        let wallet = WALLET_START;
        let openTrade = null;
        let tradeLog = [];
        
        // Hook into the raw engine to track trades precisely
        const originalEmit = backtester.engine.emit.bind(backtester.engine);
        backtester.engine.emit = (eventName, payload) => {
            if (eventName === 'arl' && payload && payload.trade) {
                // The engine wanted to execute!
                if (!openTrade) {
                    const price = payload.market?.close || cleanCandles[0].close;
                    const positionSize = (wallet * RISK_PER_TRADE) * LEVERAGE;
                    
                    openTrade = {
                        entryPrice: price,
                        side: payload.trade.direction, // 'LONG' or 'SHORT'
                        size: positionSize,
                        tp: payload.trade.direction === 'LONG' ? price * (1 + TP_PCT) : price * (1 - TP_PCT),
                        sl: payload.trade.direction === 'LONG' ? price * (1 - SL_PCT) : price * (1 + SL_PCT),
                        entryTime: payload.market?.timestamp || Date.now()
                    };
                }
            }
            originalEmit(eventName, payload);
        };
        
        console.log(`[NAKED-BACKTEST] ${symbol}: Running deterministic event-sourcing loop...`);
        // Process tick by tick to compute PnL dynamically
        for (let i = 0; i < cleanCandles.length; i++) {
            const candle = cleanCandles[i];
            
            // If we have an open trade, check TP/SL
            if (openTrade) {
                let hitTp = false;
                let hitSl = false;
                
                if (openTrade.side === 'LONG') {
                    if (candle.high >= openTrade.tp) hitTp = true;
                    if (candle.low <= openTrade.sl) hitSl = true;
                } else {
                    if (candle.low <= openTrade.tp) hitTp = true;
                    if (candle.high >= openTrade.sl) hitSl = true;
                }
                
                if (hitTp || hitSl) {
                    let pnl = 0;
                    if (hitTp) {
                        pnl = openTrade.size * TP_PCT; // simplified PnL
                    } else if (hitSl) {
                        pnl = -(openTrade.size * SL_PCT);
                    }
                    
                    // factor in some slippage & fees
                    pnl -= openTrade.size * 0.001;
                    
                    wallet += pnl;
                    
                    tradeLog.push({
                        symbol,
                        side: openTrade.side,
                        entryPrice: openTrade.entryPrice,
                        exitTime: candle.openTime,
                        durationMs: candle.openTime - openTrade.entryTime,
                        pnl,
                        result: hitTp ? 'WIN' : 'LOSS',
                        walletBalance: wallet
                    });
                    
                    openTrade = null;
                }
            }
            
            // Feed the engine
            const tickEvent = { ...candle, timestamp: candle.openTime, closed: true };
            backtester.engine.updateMtfCandles(tickEvent);
            await backtester.engine.processCandle(tickEvent, backtester.engine.tickCounter);
        }
        
        console.log(`=== RESULTS ${symbol} ===`);
        console.log(`Trades: ${tradeLog.length} | Final Wallet: $${wallet.toFixed(2)}`);
        
        const outFileName = `naked_trades_${symbol}.json`;
        await fs.writeFile(outFileName, JSON.stringify(tradeLog));
        
    } catch (e) {
        console.error(`[NAKED-BACKTEST] Error on ${symbol}:`, e.message);
    }
}

async function run() {
    console.log("=== STARTING NAKED BACKTEST (LAST 3 MONTHS) ===");
    for (const asset of ASSETS) {
        await runNakedAsset(asset);
    }
    console.log("=== NAKED BACKTEST COMPLETE ===");
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
