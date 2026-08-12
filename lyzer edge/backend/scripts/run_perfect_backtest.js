import fs from 'fs/promises';
import path from 'path';
import { HistoricalDataSanitizer } from '../HistoricalDataSanitizer.js';
import { EventSourcedBacktester } from '../EventSourcedBacktester.js';
import { db } from '../db.js';

const ASSETS = ['BTCUSDT'];
const WALLET_START = 10000;
const RISK_PER_TRADE = 0.10; // 10% of wallet per trade
const LEVERAGE = 10;
const WARMUP_CANDLES = 10000; // ~34 days of 5m candles for memory warmup

const BE_TRIGGER_PCT = 0.005; // 0.5% to trigger Break-Even
const TRAILING_DISTANCE = 0.008; // 0.8% trailing stop behind peak

async function runPerfectAsset(symbol) {
    const filename = path.join(process.cwd(), `historical_data_${symbol}.json`);
    console.log(`[PERFECT-BACKTEST] Loading ${filename}...`);
    try {
        const rawData = await fs.readFile(filename, 'utf8');
        const allCandles = JSON.parse(rawData);
        
        // Use last 36,000 candles (approx 4 months). 
        // 10,000 for warmup, 26,000 for actual trading
        const sliceLen = WARMUP_CANDLES + 26000;
        const targetCandles = allCandles.slice(-sliceLen);
        console.log(`[PERFECT-BACKTEST] ${symbol}: Total Candles: ${targetCandles.length} (Warmup: ${WARMUP_CANDLES})`);
        
        const sanitizer = new HistoricalDataSanitizer({ maxDeltaPct: 0.15, intervalMs: 300000 });
        const { cleanCandles } = sanitizer.sanitize(targetCandles);
        
        // SETTING THE GOLDEN MATRIX ENV
        process.env.TRG_THRESHOLD = '0.35';
        process.env.RESIDUAL_CONSENSUS_LIMIT = '0.005';
        process.env.LHDS_VETO_LIMIT = '0.995'; // The Shield is ON!
        process.env.CCLIST_DVF_FLOOR = '0.1';
        process.env.ARL_MODE = 'SIMULATION';
        
        const backtester = new EventSourcedBacktester(db);
        
        let wallet = WALLET_START;
        let openTrade = null;
        let tradeLog = [];
        
        const originalEmit = backtester.engine.emit.bind(backtester.engine);
        backtester.engine.emit = (eventName, payload) => {
            if (eventName === 'arl' && payload && payload.trade) {
                // Ignore trades generated during WARMUP
                if (backtester.engine.tickCounter < WARMUP_CANDLES) return;
                
                // 1. Golden Hour Filter (08:00-12:00 UTC and 19:00-21:00 UTC)
                const ts = payload.market?.timestamp || Date.now();
                const d = new Date(ts);
                const hour = d.getUTCHours();
                const isGoldenHour = (hour >= 8 && hour <= 12) || (hour >= 19 && hour <= 20);
                
                if (!isGoldenHour) {
                    // Skip trade because it's outside the high-probability window
                    return;
                }

                if (!openTrade) {
                    const price = payload.market?.close || cleanCandles[0].close;
                    const positionSize = (wallet * RISK_PER_TRADE) * LEVERAGE;
                    
                    // Initial Stop Loss = 1.0% (Wide enough to breathe, but we'll trail it)
                    const initialSl = payload.trade.direction === 'LONG' ? price * 0.99 : price * 1.01;
                    
                    openTrade = {
                        entryPrice: price,
                        side: payload.trade.direction,
                        size: positionSize,
                        sl: initialSl,
                        peakFavorablePrice: price, // For Trailing Stop
                        isBreakEvenLocked: false,
                        entryTime: ts
                    };
                }
            }
            originalEmit(eventName, payload);
        };
        
        console.log(`[PERFECT-BACKTEST] ${symbol}: Running deterministic event-sourcing loop...`);
        
        for (let i = 0; i < cleanCandles.length; i++) {
            const candle = cleanCandles[i];
            
            // Advance the engine
            const tickEvent = { ...candle, timestamp: candle.openTime, closed: true };
            backtester.engine.updateMtfCandles(tickEvent);
            await backtester.engine.processCandle(tickEvent, backtester.engine.tickCounter);
            
            // Manage open trade if it's past warmup
            if (i >= WARMUP_CANDLES && openTrade) {
                let hitSl = false;
                
                if (openTrade.side === 'LONG') {
                    // Update peak
                    if (candle.high > openTrade.peakFavorablePrice) {
                        openTrade.peakFavorablePrice = candle.high;
                    }
                    
                    // Check Break-Even trigger
                    if (!openTrade.isBreakEvenLocked && (openTrade.peakFavorablePrice >= openTrade.entryPrice * (1 + BE_TRIGGER_PCT))) {
                        openTrade.isBreakEvenLocked = true;
                        openTrade.sl = openTrade.entryPrice; // Move to entry (Zero risk!)
                    }
                    
                    // Check Trailing Stop logic
                    if (openTrade.isBreakEvenLocked) {
                        const newSl = openTrade.peakFavorablePrice * (1 - TRAILING_DISTANCE);
                        if (newSl > openTrade.sl) {
                            openTrade.sl = newSl; // Trail it up
                        }
                    }
                    
                    // Check Stop Loss hit
                    if (candle.low <= openTrade.sl) hitSl = true;
                    
                } else { // SHORT
                    if (candle.low < openTrade.peakFavorablePrice) {
                        openTrade.peakFavorablePrice = candle.low;
                    }
                    
                    if (!openTrade.isBreakEvenLocked && (openTrade.peakFavorablePrice <= openTrade.entryPrice * (1 - BE_TRIGGER_PCT))) {
                        openTrade.isBreakEvenLocked = true;
                        openTrade.sl = openTrade.entryPrice; 
                    }
                    
                    if (openTrade.isBreakEvenLocked) {
                        const newSl = openTrade.peakFavorablePrice * (1 + TRAILING_DISTANCE);
                        if (newSl < openTrade.sl) {
                            openTrade.sl = newSl; // Trail it down
                        }
                    }
                    
                    if (candle.high >= openTrade.sl) hitSl = true;
                }
                
                if (hitSl) {
                    let pnl = 0;
                    if (openTrade.side === 'LONG') {
                        const pctMove = (openTrade.sl - openTrade.entryPrice) / openTrade.entryPrice;
                        pnl = openTrade.size * pctMove;
                    } else {
                        const pctMove = (openTrade.entryPrice - openTrade.sl) / openTrade.entryPrice;
                        pnl = openTrade.size * pctMove;
                    }
                    
                    // factor in slippage & fees
                    pnl -= openTrade.size * 0.001;
                    
                    wallet += pnl;
                    
                    // Determine Result category
                    let resultType = 'LOSS';
                    if (pnl > 0) resultType = 'WIN';
                    else if (pnl < 0 && pnl > -(openTrade.size * 0.002)) resultType = 'BREAK_EVEN'; // Lost only fees
                    
                    tradeLog.push({
                        symbol,
                        side: openTrade.side,
                        entryPrice: openTrade.entryPrice,
                        exitPrice: openTrade.sl,
                        exitTime: candle.openTime,
                        durationMs: candle.openTime - openTrade.entryTime,
                        pnl,
                        result: resultType,
                        walletBalance: wallet
                    });
                    
                    openTrade = null;
                }
            }
        }
        
        console.log(`=== RESULTS ${symbol} ===`);
        console.log(`Trades: ${tradeLog.length} | Final Wallet: $${wallet.toFixed(2)}`);
        
        const outFileName = `perfect_trades_${symbol}.json`;
        await fs.writeFile(outFileName, JSON.stringify(tradeLog));
        
    } catch (e) {
        console.error(`[PERFECT-BACKTEST] Error on ${symbol}:`, e.message);
    }
}

async function run() {
    console.log("=== STARTING PERFECT BACKTEST (BTC ONLY) ===");
    for (const asset of ASSETS) {
        await runPerfectAsset(asset);
    }
    console.log("=== PERFECT BACKTEST COMPLETE ===");
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
