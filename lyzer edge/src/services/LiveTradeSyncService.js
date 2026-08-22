import db, { TRADE_STATUS, TRADE_RESULT } from '../db/database.js';
import { wsClient } from './wsClient.js';

class LiveTradeSyncService {
  constructor() {
    this._initialized = false;
    this._onMessage = this._onMessage.bind(this);
    this._syncInterval = null;
  }

  start() {
    if (this._initialized) return;
    
    console.log('[LiveTradeSync] Conectando ao fluxo da Binance Testnet para gravação silenciosa...');
    wsClient.onData(this._onMessage);
    this._initialized = true;

    // Run initial deduplication & sync with backend
    this.cleanDuplicateTrades().then(() => {
      this.syncWithBackend().catch(err => console.error('[LiveTradeSync] Startup sync failed:', err));
    });

    // Periodic sync every 30 seconds to reconcile state cleanly
    this._syncInterval = setInterval(() => {
      this.syncWithBackend().catch(err => console.error('[LiveTradeSync] Periodic sync failed:', err));
    }, 30000);
  }

  stop() {
    wsClient.offData(this._onMessage);
    if (this._syncInterval) {
      clearInterval(this._syncInterval);
      this._syncInterval = null;
    }
    this._initialized = false;
  }

  normalizeSymbol(symbol) {
    if (!symbol) return 'BTC/USD';
    return symbol.toUpperCase().replace('USDT', '/USD').replace('-USD', '/USD');
  }

  /**
   * Scans IndexedDB and removes duplicate trades (same symbol + time window)
   * Ensures at most 1 OPEN trade per symbol, and removes duplicate closed entries.
   */
  async cleanDuplicateTrades() {
    try {
      const allTrades = await db.trades.toArray();
      if (!allTrades || allTrades.length === 0) return 0;

      const toDelete = new Set();
      const openBySymbol = new Map();

      // Sort by ID ascending (older first)
      allTrades.sort((a, b) => a.id - b.id);

      for (const trade of allTrades) {
        const sym = this.normalizeSymbol(trade.symbol);
        const timeMs = new Date(trade.entryDate).getTime();

        // 1. Check for open trades per symbol: max 1 genuine open trade per symbol
        if (trade.status === TRADE_STATUS.OPEN) {
          if (openBySymbol.has(sym)) {
            const prevOpen = openBySymbol.get(sym);
            toDelete.add(prevOpen.id);
            openBySymbol.set(sym, trade);
          } else {
            openBySymbol.set(sym, trade);
          }
        }

        // 2. Find near-duplicate trades with matching symbol, direction, entryPrice within same minute
        const duplicates = allTrades.filter(other => 
          other.id !== trade.id &&
          !toDelete.has(other.id) &&
          !toDelete.has(trade.id) &&
          this.normalizeSymbol(other.symbol) === sym &&
          other.direction === trade.direction &&
          (other.backendId && trade.backendId ? other.backendId === trade.backendId : Math.abs(new Date(other.entryDate).getTime() - timeMs) < 60000) &&
          Math.abs((other.entryPrice || 0) - (trade.entryPrice || 0)) < 0.005 * (trade.entryPrice || 1)
        );

        for (const dup of duplicates) {
          // If one is closed and one is open, keep the closed one and delete the open duplicate
          if (trade.status === TRADE_STATUS.CLOSED && dup.status === TRADE_STATUS.OPEN) {
            toDelete.add(dup.id);
          } else if (trade.status === TRADE_STATUS.OPEN && dup.status === TRADE_STATUS.CLOSED) {
            toDelete.add(trade.id);
          } else {
            // Keep the one with highest ID (most recent)
            if (dup.id < trade.id) {
              toDelete.add(dup.id);
            } else {
              toDelete.add(trade.id);
            }
          }
        }
      }

      if (toDelete.size > 0) {
        const idsToDelete = Array.from(toDelete);
        await db.transaction('rw', [db.trades, db.tradeEvents, db.marketContext], async () => {
          await db.trades.bulkDelete(idsToDelete);
          await db.tradeEvents.where('tradeId').anyOf(idsToDelete).delete();
          await db.marketContext.where('tradeId').anyOf(idsToDelete).delete();
        });
        console.log(`[LiveTradeSync] 🧹 Deduplication complete: removed ${idsToDelete.length} duplicate/ghost records.`);
        return idsToDelete.length;
      }
      return 0;
    } catch (err) {
      console.warn('[LiveTradeSync] Error during cleanDuplicateTrades:', err);
      return 0;
    }
  }

  async syncWithBackend() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT'];
    
    for (const sym of symbols) {
      try {
        const res = await fetch(`/api/candles/${sym}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (!data || !Array.isArray(data.trades)) continue;

        const dbSymbol = this.normalizeSymbol(sym);

        // 1. Reconcile open trades with backend
        const backendOpenTrade = data.trades.find(t => t.status === 'open');
        const localOpenTrades = await db.trades
          .where('symbol').equals(dbSymbol)
          .and(t => t.status === TRADE_STATUS.OPEN)
          .toArray();

        if (!backendOpenTrade && localOpenTrades.length > 0) {
          // Backend has NO open position: close all local open trades for this symbol
          for (const localOpen of localOpenTrades) {
            await db.transaction('rw', [db.trades], async () => {
              await db.trades.update(localOpen.id, {
                status: TRADE_STATUS.CLOSED,
                exitDate: new Date().toISOString(),
                exitPrice: localOpen.entryPrice,
                result: TRADE_RESULT.BREAKEVEN,
                pnl: 0
              });
            });
            console.log(`[LiveTradeSync] 🧹 Closed stale open trade ${localOpen.id} for ${dbSymbol} (backend has no open position).`);
          }
        }

        // 2. Sync all backend trades
        for (const t of data.trades) {
          const tradeTimeMs = typeof t.timestamp === 'number' && t.timestamp > 100000
            ? (t.timestamp > 10000000000 ? t.timestamp : t.timestamp * 1000)
            : Date.now();
          const entryDateStr = new Date(tradeTimeMs).toISOString();
          const pnlPct = parseFloat(t.pnl) || 0;
          const backendId = t.id || `trade_${sym}_${Math.floor(tradeTimeMs / 1000)}`;

          // Find existing trade in local DB
          const localTrades = await db.trades.where('symbol').equals(dbSymbol).toArray();
          const existing = localTrades.find(item => {
            if (item.backendId && item.backendId === backendId) return true;
            const itemTimeMs = new Date(item.entryDate).getTime();
            const timeDiff = Math.abs(itemTimeMs - tradeTimeMs);
            const priceDiff = Math.abs((item.entryPrice || 0) - (t.entryPrice || 0)) / (t.entryPrice || 1);
            return timeDiff < 90000 && item.direction === t.direction && priceDiff < 0.005;
          });

          if (existing) {
            // Update trade if status changed
            if (existing.status === TRADE_STATUS.OPEN && t.status === 'closed') {
              await db.transaction('rw', [db.trades], async () => {
                await db.trades.update(existing.id, {
                  backendId: backendId,
                  status: TRADE_STATUS.CLOSED,
                  exitDate: t.exit_timestamp ? new Date(t.exit_timestamp).toISOString() : new Date(tradeTimeMs + 60000).toISOString(),
                  exitPrice: t.exitPrice || t.entryPrice * (1 + pnlPct),
                  result: pnlPct > 0 ? TRADE_RESULT.WIN : (pnlPct < 0 ? TRADE_RESULT.LOSS : TRADE_RESULT.BREAKEVEN),
                  pnl: pnlPct * 2000
                });
              });
            } else if (existing.status === TRADE_STATUS.OPEN && t.status === 'open') {
              // Update stop loss / take profit if modified
              if (t.stopLoss || t.takeProfit) {
                await db.trades.update(existing.id, {
                  backendId: backendId,
                  stopLoss: t.stopLoss,
                  takeProfit: t.takeProfit
                });
              }
            }
            continue;
          }

          // Insert new trade from backend
          const lastTrade = await db.trades.orderBy('id').last();
          const nextId = lastTrade ? lastTrade.id + 1 : 1;

          const tradeDoc = {
            id: nextId,
            backendId: backendId,
            symbol: dbSymbol,
            asset: 'Crypto',
            market: data.mode === 'SIMULATION' ? 'Spot (Simulation)' : 'Spot (Testnet)',
            status: t.status === 'open' ? TRADE_STATUS.OPEN : TRADE_STATUS.CLOSED,
            direction: t.direction,
            entryDate: entryDateStr,
            exitDate: t.status === 'closed' ? new Date(tradeTimeMs + 60000).toISOString() : null,
            entryPrice: t.entryPrice,
            exitPrice: t.status === 'closed' ? (t.exitPrice || t.entryPrice * (1 + pnlPct)) : null,
            result: t.status === 'closed' ? (pnlPct > 0 ? TRADE_RESULT.WIN : (pnlPct < 0 ? TRADE_RESULT.LOSS : TRADE_RESULT.BREAKEVEN)) : null,
            pnl: t.status === 'closed' ? pnlPct * 2000 : 0
          };

          await db.transaction('rw', [db.trades, db.marketContext], async () => {
            await db.trades.add(tradeDoc);
            await db.marketContext.add({
              tradeId: nextId,
              session: 'new_york',
              marketState: 'simulated_live'
            });
          });
          console.log(`[LiveTradeSync] Sincronizado trade do backend: ${tradeDoc.symbol} (${tradeDoc.status})`);
        }
      } catch (err) {
        console.error(`[LiveTradeSync] Erro ao sincronizar ${sym}:`, err);
      }
    }
  }

  async _onMessage(data) {
    if (!data) return;

    // Ensure DB is open before processing events
    if (!db.isOpen()) {
        try {
            await db.open();
        } catch (err) {
            console.warn('[LiveTradeSync] Awaiting DB failed:', err);
        }
    }

    // Process canonical trade events from StreamEngine (arl event)
    if (data.trade && data.trade.governance === 'ALLOW') {
      try {
        const symbol = this.normalizeSymbol(data.symbol);
        const direction = data.trade.direction;
        const entryPrice = data.trade.price;
        const status = data.trade.status || 'closed';
        const pnlPct = parseFloat(data.trade.pnl) / 100 || 0;

        const tradeTimeMs = typeof data.trade.index === 'number' && data.trade.index > 100000
          ? (data.trade.index > 10000000000 ? data.trade.index : data.trade.index * 1000)
          : Date.now();

        const entryDateStr = new Date(tradeTimeMs).toISOString();
        const backendId = data.trade.id || `trade_${data.symbol || 'ASSET'}_${Math.floor(tradeTimeMs / 1000)}`;

        // Check if there is already an open trade for this symbol
        const existingOpen = await db.trades
          .where('symbol').equals(symbol)
          .and(t => t.status === TRADE_STATUS.OPEN)
          .first();

        if (status === 'open') {
          if (existingOpen) {
            // Already open — update any dynamic fields, do not insert duplicate
            await db.trades.update(existingOpen.id, {
              backendId: backendId,
              stopLoss: data.trade.stopLoss,
              takeProfit: data.trade.takeProfit,
              entryPrice: entryPrice || existingOpen.entryPrice
            });
            return;
          }

          const lastTrade = await db.trades.orderBy('id').last();
          const nextId = lastTrade ? lastTrade.id + 1 : 1;

          const tradeDoc = {
            id: nextId,
            backendId: backendId,
            symbol: symbol,
            asset: 'Crypto',
            market: data.mode === 'SIMULATION' ? 'Spot (Simulation)' : 'Spot (Testnet)',
            status: TRADE_STATUS.OPEN,
            direction: direction,
            entryDate: entryDateStr,
            exitDate: null,
            entryPrice: entryPrice,
            exitPrice: null,
            result: null,
            pnl: 0,
            stopLoss: data.trade.stopLoss,
            takeProfit: data.trade.takeProfit
          };

          await db.transaction('rw', [db.trades, db.marketContext], async () => {
            await db.trades.add(tradeDoc);
            await db.marketContext.add({
              tradeId: nextId,
              session: 'new_york',
              marketState: 'simulated_live'
            });
          });
          console.log(`[LiveTradeSync] Trade ABERTO no DB Local: ${tradeDoc.symbol} ${tradeDoc.direction}`);
        } else if (status === 'closed') {
          const exitPrice = data.trade.exitPrice || entryPrice * (1 + pnlPct);
          const result = pnlPct > 0 ? TRADE_RESULT.WIN : (pnlPct < 0 ? TRADE_RESULT.LOSS : TRADE_RESULT.BREAKEVEN);
          const pnlUsdt = pnlPct * 2000;

          if (existingOpen) {
            await db.transaction('rw', [db.trades], async () => {
              await db.trades.update(existingOpen.id, {
                backendId: backendId,
                status: TRADE_STATUS.CLOSED,
                exitDate: new Date().toISOString(),
                exitPrice: exitPrice,
                result: result,
                pnl: pnlUsdt
              });
            });
            console.log(`[LiveTradeSync] Trade FECHADO no DB Local (ID ${existingOpen.id}): PnL: ${data.trade.pnl}`);
          } else {
            // Check if already stored as closed to avoid double-insertion
            const existingClosed = await db.trades
              .where('symbol').equals(symbol)
              .and(t => t.backendId === backendId || (t.direction === direction && Math.abs(new Date(t.entryDate).getTime() - tradeTimeMs) < 60000))
              .first();

            if (existingClosed) {
              await db.trades.update(existingClosed.id, {
                backendId: backendId,
                exitPrice: exitPrice,
                result: result,
                pnl: pnlUsdt
              });
              return;
            }

            const lastTrade = await db.trades.orderBy('id').last();
            const nextId = lastTrade ? lastTrade.id + 1 : 1;

            const tradeDoc = {
              id: nextId,
              backendId: backendId,
              symbol: symbol,
              asset: 'Crypto',
              market: data.mode === 'SIMULATION' ? 'Spot (Simulation)' : 'Spot (Testnet)',
              status: TRADE_STATUS.CLOSED,
              direction: direction,
              entryDate: entryDateStr,
              exitDate: new Date().toISOString(),
              entryPrice: entryPrice,
              exitPrice: exitPrice,
              result: result,
              pnl: pnlUsdt
            };

            await db.transaction('rw', [db.trades, db.marketContext], async () => {
              await db.trades.add(tradeDoc);
              await db.marketContext.add({
                tradeId: nextId,
                session: 'new_york',
                marketState: 'simulated_live'
              });
            });
            console.log(`[LiveTradeSync] Trade Fechado Registrado no DB Local: ${tradeDoc.symbol}`);
          }
        }
      } catch (err) {
        console.error('Erro ao sincronizar telemetry trade:', err);
      }
    }

    // C8 fix: Process live exchange execution events (real fills from Binance)
    if (data.liveExecution) {
      try {
        const exec = data.liveExecution;
        const symbol = this.normalizeSymbol(exec.symbol || data.symbol);
        
        // Find the open trade for this symbol and update with real execution data
        const existingOpen = await db.trades
          .where('symbol').equals(symbol)
          .and(t => t.status === TRADE_STATUS.OPEN)
          .first();

        if (existingOpen && exec.side === 'SELL') {
          // This is a close execution — update with real exit price
          const realExitPrice = parseFloat(exec.price) || existingOpen.exitPrice;
          const realQty = parseFloat(exec.quantity) || 0;
          const pnlFromFill = existingOpen.direction === 'LONG'
            ? (realExitPrice - existingOpen.entryPrice) * realQty
            : (existingOpen.entryPrice - realExitPrice) * realQty;

          await db.trades.update(existingOpen.id, {
            exitPrice: realExitPrice,
            pnl: pnlFromFill,
            executionSource: 'LIVE_EXCHANGE'
          });
          console.log(`[LiveTradeSync] 🔴 LIVE EXIT synced: ${symbol} at ${realExitPrice}`);
        } else if (!existingOpen && exec.side === 'BUY') {
          // This is an entry execution — update entry price with real fill
          const recentTrade = await db.trades
            .where('symbol').equals(symbol)
            .reverse().first();
          if (recentTrade) {
            await db.trades.update(recentTrade.id, {
              entryPrice: parseFloat(exec.price) || recentTrade.entryPrice,
              executionSource: 'LIVE_EXCHANGE'
            });
            console.log(`[LiveTradeSync] 🟢 LIVE ENTRY synced: ${symbol} at ${exec.price}`);
          }
        }
      } catch (err) {
        console.error('[LiveTradeSync] Error syncing live execution:', err);
      }
    }
  }
}

export const liveTradeSync = new LiveTradeSyncService();
