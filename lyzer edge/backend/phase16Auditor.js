import fs from 'fs';
import path from 'path';

export function getLedgerFile() {
    const DATA_DIR = process.env.DATA_DIR || '/tmp/data';
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, 'forward_validation_ledger_v2.jsonl');
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '');
    }
    return file;
}

export function appendToLedger(data) {
    const file = getLedgerFile();
    fs.appendFileSync(file, JSON.stringify(data) + '\n');
}

export function attachPhase16Auditor(engine) {
    const state = { trades: new Map() };
    
    // Override placeOrder to capture real execution parameters
    if (engine.execution) {
        const originalPlaceOrder = engine.execution.placeOrder.bind(engine.execution);
        engine.execution.placeOrder = async (symbol, side, type, quantity, currentPrice) => {
            const reqTime = Date.now();
            // C4 fix: Capture position context BEFORE async exchange call
            const positionId = engine.activePosition?.id;
            const isEntry = engine.activePosition && !state.trades.get(positionId)?.entry_request_timestamp;
            console.log(`[FORWARD-VALIDATION] ORDER REQUEST: ${side} ${quantity} ${symbol} at ${reqTime}`);
            try {
                const result = await originalPlaceOrder(symbol, side, type, quantity, currentPrice);
                const ackTime = Date.now();
                console.log(`[FORWARD-VALIDATION] ORDER ACK: ${result.orderId || 'MOCK'} at ${ackTime}`);
                
                if (positionId) {
                    const t = state.trades.get(positionId) || {};
                    if (isEntry) {
                        t.entry_request_timestamp = reqTime;
                        t.entry_ack_timestamp = ackTime; // M3 fix
                        t.actual_filled_quantity = result.executedQty || quantity;
                        t.actual_entry_price = result.price || currentPrice;
                        t.fee_pnl = t.fee_pnl || 0;
                        const feeRate = type === 'MARKET' ? 0.0005 : 0.0001; 
                        t.fee_pnl -= (t.actual_entry_price * t.actual_filled_quantity) * feeRate;
                        state.trades.set(positionId, t);
                    } else {
                        t.exit_request_timestamp = reqTime;
                        t.exit_ack_timestamp = ackTime;
                        t.actual_exit_price = result.price || currentPrice;
                        t.actual_exit_quantity = result.executedQty || quantity;
                        const feeRate = type === 'MARKET' ? 0.0005 : 0.0001;
                        t.fee_pnl -= (t.actual_exit_price * t.actual_exit_quantity) * feeRate;
                        state.trades.set(positionId, t);
                    }
                }
                return result;
            } catch (err) {
                console.error(`[FORWARD-VALIDATION] ORDER FAILED:`, err);
                throw err;
            }
        };
    }
    
    setInterval(() => {
        if (engine.activePosition) {
            const pos = engine.activePosition;
            const t = state.trades.get(pos.id) || {};
            const elapsed = Math.floor(Date.now()/1000) - pos.timestamp;
            
            if (elapsed >= 15 * 60 && !t.time_exit_triggered) {
                t.time_exit_triggered = true;
                state.trades.set(pos.id, t);
            }
        }
    }, 1000);

    const processedTradeIds = new Set();

    function processTrade(trade) {
        if (!trade || processedTradeIds.has(trade.id)) return;
        processedTradeIds.add(trade.id);

        const t = state.trades.get(trade.id) || {};
        const duration = trade.timestamp ? (Date.now() - trade.timestamp * 1000) / 1000 : 0;
        
        const violations = [];
        
        // TP disabled check
        if (trade.reasonCodes && trade.reasonCodes.includes('RANGE_SCALP_TAKE_PROFIT')) {
            violations.push('TP_DISABLED_BUT_TRIGGERED');
        }
        
        // TIME_EXIT constraints
        if (trade.reasonCodes && trade.reasonCodes.includes('TIME_EXIT')) {
            if (duration < 890) { // 14m 50s allowing minor latency
                violations.push(`TIME_EXIT_PREMATURE_AT_${duration}s`);
            }
        }

        // Risk & Notional constraints
        const riskTargetUsd = 1000 * 0.005;
        let slDistanceBps = 0;
        if (trade.entryPrice && trade.initialStopLoss) {
           slDistanceBps = Math.abs(trade.entryPrice - trade.initialStopLoss) / trade.entryPrice;
        }
        
        const stopDistanceUsd = trade.entryPrice * slDistanceBps;
        const rawQuantity = stopDistanceUsd > 0 ? riskTargetUsd / stopDistanceUsd : 0;
        const entryQty = t.actual_filled_quantity || trade.quantity || 0;
        const riskAtEntry = entryQty * stopDistanceUsd;
        const notionalAtEntry = entryQty * (trade.entryPrice || 0);

        if (riskAtEntry > 5.1) {
            violations.push(`RISK_EXCEEDED_5USD_LIMIT_${riskAtEntry.toFixed(2)}`);
        }
        if (notionalAtEntry > 1005) {
            violations.push(`NOTIONAL_EXCEEDED_1000USD_LIMIT_${notionalAtEntry.toFixed(2)}`);
        }

        const actualEntry = t.actual_entry_price || trade.entryPrice;
        const actualExit = t.actual_exit_price || trade.exitPrice;
        let entrySlippageBps = 0;
        let exitSlippageBps = 0;
        if (trade.entryPrice) entrySlippageBps = Math.abs(actualEntry - trade.entryPrice) / trade.entryPrice * 10000;
        if (trade.exitPrice) exitSlippageBps = Math.abs(actualExit - trade.exitPrice) / trade.exitPrice * 10000;
        const slippagePnl = trade.direction === 'LONG' ? ((trade.exitPrice || 0) - actualExit) + (actualEntry - (trade.entryPrice || 0)) : (actualExit - (trade.exitPrice || 0)) + ((trade.entryPrice || 0) - actualEntry);

        const realizedR = slDistanceBps > 0 ? ((trade.pnl || 0) / slDistanceBps) : 0;

        const ledgerEntry = {
            TRADE_ID: trade.id,
            SIGNAL: {
                timestamp: trade.timestamp,
                symbol: trade.symbol,
                direction: trade.direction,
                imbalance: trade.signal?.imbalance || 'N/A',
                oppScore: trade.signal?.oppScore || 'N/A',
                ATR: trade.signal?.atr || 'N/A',
                confidence: trade.signal?.confidence || 'N/A',
                regime: trade.regime || 'N/A'
            },
            PREDICTION: {
                entry: trade.entryPrice,
                sl_distance_bps: slDistanceBps * 10000,
                predicted_risk: riskTargetUsd,
                predicted_quantity: rawQuantity,
                predicted_notional: rawQuantity * (trade.entryPrice || 0)
            },
            EXECUTION: {
                requested_quantity: trade.quantity,
                filled_quantity: entryQty,
                requested_price: trade.entryPrice,
                average_fill: actualEntry,
                slippage_bps: entrySlippageBps,
                fee_pnl: t.fee_pnl || 0,
                latency_ms: t.entry_ack_timestamp ? t.entry_ack_timestamp - t.entry_request_timestamp : 0
            },
            EXIT: {
                exit_price: actualExit,
                exit_reason: (trade.reasonCodes || []).join(','),
                duration_seconds: duration,
                MFE_R: slDistanceBps > 0 ? ((trade.mfe || 0) / slDistanceBps) : 0,
                MAE_R: slDistanceBps > 0 ? ((trade.mae || 0) / slDistanceBps) : 0,
                REALIZED_R: realizedR,
                REALIZED_PNL: trade.pnl,
                SLIPPAGE_PNL: slippagePnl,
                RISK_AT_ENTRY: riskAtEntry,
                NOTIONAL_AT_ENTRY: notionalAtEntry
            },
            CONSTITUTIONAL_VIOLATION: violations.length > 0 ? violations.join(' | ') : 'OK'
        };
        
        appendToLedger(ledgerEntry);
        console.log(`\n[LEDGER V2] ${trade.symbol || ''} Trade ${ledgerEntry.TRADE_ID} Logged. Violations: ${ledgerEntry.CONSTITUTIONAL_VIOLATION}`);
    }

    if (typeof engine.on === 'function') {
        engine.on('trade_closed', processTrade);
    }

    setInterval(() => {
        if (engine.tradeHistory && engine.tradeHistory.length > 0) {
            for (const trade of engine.tradeHistory) {
                processTrade(trade);
            }
        }
    }, 500);
    
    console.log(`[FORWARD-VALIDATION] Hooked Phase 16 Auditor to ${engine.symbol}`);
}
