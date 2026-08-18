import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYMBOL = 'btcusdt';
const DATA_DIR = path.join(__dirname, 'caem_atr_oos', 'data_30d');
const CANDLES_FILE = path.join(DATA_DIR, `candles_1m_BTCUSDT.json`);
const EVENTS_FILE = path.join(__dirname, 'oos11_live_events.jsonl');

// --- OOS-8.1 CALIBRATION THRESHOLDS ---
const ATR_P80 = 0.00055;
const VOLZ_P80 = 0.315;
const VWAP_P80 = 0.00963;

// --- STATE CONTAINERS ---
let historicalCandles = [];
const tickBuffer = []; // stores aggTrades for the last 60 seconds
const depthBuffer = []; // stores bookTicker/depth for the last 60 seconds
let activeEvents = []; // events currently capturing the T+30s window or waiting for 15m resolution

console.log(`[OOS-11] Microstructure Shadow Recorder Booting...`);

// 1. Seed historical data for indicator continuity
if (fs.existsSync(CANDLES_FILE)) {
    const raw = JSON.parse(fs.readFileSync(CANDLES_FILE, 'utf8'));
    // Keep last 1440 candles (24h) for VWAP
    historicalCandles = raw.slice(-1440);
    console.log(`[OOS-11] Seeded ${historicalCandles.length} historical candles for continuous indicators.`);
}

function std(arr) {
    if (arr.length === 0) return 1;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length) || 1;
}

function calculateOpportunityScore(newCandle) {
    historicalCandles.push(newCandle);
    if (historicalCandles.length > 1500) historicalCandles.shift();

    const i = historicalCandles.length - 1;
    
    // ATR 14
    let atr14 = 0;
    let count = 0;
    for (let j = i - 13; j <= i; j++) {
        if (j >= 0) {
            atr14 += (historicalCandles[j].high - historicalCandles[j].low);
            count++;
        }
    }
    const atr14_pct = count > 0 ? (atr14 / count) / newCandle.close : 0;

    // Vol Z
    const vol_arr = [];
    for (let j = i - 59; j <= i; j++) {
        if (j >= 0) vol_arr.push(historicalCandles[j].volume);
    }
    const vol_mean = vol_arr.reduce((a, b) => a + b, 0) / (vol_arr.length || 1);
    const vol_std = std(vol_arr);
    const volume_zscore = (newCandle.volume - vol_mean) / vol_std;

    // VWAP 24h
    let sumPv = 0, sumV = 0;
    for (let j = i - 1439; j <= i; j++) {
        if (j >= 0) {
            const c = historicalCandles[j];
            sumPv += ((c.high + c.low + c.close) / 3) * c.volume;
            sumV += c.volume;
        }
    }
    const vwap = sumV > 0 ? sumPv / sumV : newCandle.close;
    const distance_vwap = (newCandle.close - vwap) / vwap;

    let oppScore = 0;
    if (atr14_pct >= ATR_P80) oppScore++;
    if (volume_zscore >= VOLZ_P80) oppScore++;
    if (Math.abs(distance_vwap) >= VWAP_P80) oppScore++;

    return oppScore;
}

// Extract T-10s to T0 features from rolling buffer
function extractMicrostructure(t0) {
    const tMinus10 = t0 - 10000;
    const trades = tickBuffer.filter(t => t.time >= tMinus10 && t.time <= t0);
    const depths = depthBuffer.filter(d => d.time >= tMinus10 && d.time <= t0);

    let buyVol = 0, sellVol = 0;
    trades.forEach(t => {
        if (t.isBuyerMaker) sellVol += t.qty; // Maker was buyer -> Taker was seller
        else buyVol += t.qty;
    });

    const lastDepth = depths.length > 0 ? depths[depths.length - 1] : null;
    const spread = lastDepth ? (lastDepth.askPrice - lastDepth.bidPrice) / lastDepth.bidPrice : 0;
    const imbalance = lastDepth ? (lastDepth.bidQty - lastDepth.askQty) / (lastDepth.bidQty + lastDepth.askQty) : 0;

    return {
        tradeCount: trades.length,
        buyVolume: buyVol,
        sellVolume: sellVol,
        delta: buyVol - sellVol,
        spread: spread,
        imbalance: imbalance,
        priceT0: lastDepth ? lastDepth.midPrice : historicalCandles[historicalCandles.length - 1].close
    };
}

function processActiveEvents(currentTime, currentPrice) {
    for (let i = activeEvents.length - 1; i >= 0; i--) {
        const ev = activeEvents[i];
        
        // Track MFE/MAE at 1m, 5m, 15m
        if (currentPrice > ev.maxPrice) ev.maxPrice = currentPrice;
        if (currentPrice < ev.minPrice) ev.minPrice = currentPrice;

        const timeElapsed = currentTime - ev.t0;

        if (timeElapsed >= 30000 && !ev.t30Captured) {
            ev.microstructure_T30 = extractMicrostructure(ev.t0 + 30000); // Wait, extractMicrostructure looks backwards 10s. We'd need to adapt it.
            // Let's just capture the exact state at T+30
            const lastDepth = depthBuffer.length > 0 ? depthBuffer[depthBuffer.length - 1] : null;
            ev.priceT30 = lastDepth ? lastDepth.midPrice : currentPrice;
            ev.t30Captured = true;
        }

        if (timeElapsed >= 60000 && !ev.mfe1m) {
            ev.mfe1m = ev.maxPrice; ev.mae1m = ev.minPrice; ev.price1m = currentPrice;
        }
        if (timeElapsed >= 300000 && !ev.mfe5m) {
            ev.mfe5m = ev.maxPrice; ev.mae5m = ev.minPrice; ev.price5m = currentPrice;
        }
        if (timeElapsed >= 900000 && !ev.resolved) {
            ev.mfe15m = ev.maxPrice; ev.mae15m = ev.minPrice; ev.price15m = currentPrice;
            ev.resolved = true;
            
            // Save to disk
            fs.appendFileSync(EVENTS_FILE, JSON.stringify(ev) + '\n');
            console.log(`[OOS-11] Event ${ev.eventId} fully resolved and saved to disk.`);
            activeEvents.splice(i, 1);
        }
    }
}

// Start WebSocket Streams
const wsUrl = `wss://stream.binance.com:9443/stream?streams=${SYMBOL}@kline_1m/${SYMBOL}@aggTrade/${SYMBOL}@bookTicker`;
const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log(`[OOS-11] Connected to Binance WebSockets (kline, aggTrade, bookTicker). Listening for Opportunity Score >= 2...`);
});

ws.on('message', (data) => {
    const payload = JSON.parse(data);
    const stream = payload.stream;
    const d = payload.data;
    const now = Date.now();

    if (stream === `${SYMBOL}@aggTrade`) {
        tickBuffer.push({ time: d.E, price: parseFloat(d.p), qty: parseFloat(d.q), isBuyerMaker: d.m });
        processActiveEvents(d.E, parseFloat(d.p));
    } 
    else if (stream === `${SYMBOL}@bookTicker`) {
        const bp = parseFloat(d.b);
        const ap = parseFloat(d.a);
        depthBuffer.push({
            time: now,
            bidPrice: bp, bidQty: parseFloat(d.B),
            askPrice: ap, askQty: parseFloat(d.A),
            midPrice: (bp + ap) / 2
        });
    }
    else if (stream === `${SYMBOL}@kline_1m`) {
        const kline = d.k;
        if (kline.x) { // Candle closed
            const candle = {
                openTime: kline.t,
                open: parseFloat(kline.o),
                high: parseFloat(kline.h),
                low: parseFloat(kline.l),
                close: parseFloat(kline.c),
                volume: parseFloat(kline.v)
            };
            
            const oppScore = calculateOpportunityScore(candle);
            console.log(`[OOS-11] Candle Closed | Price: ${candle.close} | Opp Score: ${oppScore}`);

            if (oppScore >= 2) {
                const eventId = `EV_${kline.t}_${oppScore}`;
                console.log(`🚨 [OOS-11] TRIGGER ALARM! Opportunity >= 2 detected. Capturing Microstructure Window...`);
                
                const microT0 = extractMicrostructure(now);
                
                activeEvents.push({
                    eventId,
                    t0: now,
                    opportunity_score: oppScore,
                    microstructure_T0: microT0,
                    t30Captured: false,
                    resolved: false,
                    maxPrice: candle.close,
                    minPrice: candle.close,
                    entryPrice: microT0.priceT0
                });
            }
        }
    }

    // Clean buffers (keep only last 60 seconds)
    while (tickBuffer.length > 0 && now - tickBuffer[0].time > 60000) tickBuffer.shift();
    while (depthBuffer.length > 0 && now - depthBuffer[0].time > 60000) depthBuffer.shift();
});

ws.on('close', () => {
    console.log(`[OOS-11] WebSocket closed.`);
});
ws.on('error', (err) => {
    console.error(`[OOS-11] WebSocket error:`, err);
});
