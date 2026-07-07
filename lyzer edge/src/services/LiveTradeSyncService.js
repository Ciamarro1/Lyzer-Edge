import db, { TRADE_STATUS, TRADE_RESULT } from '../db/database.js';
import { wsClient } from './wsClient.js';

class LiveTradeSyncService {
  constructor() {
    this._initialized = false;
    this._onMessage = this._onMessage.bind(this);
  }

  start() {
    if (this._initialized) return;
    
    console.log('[LiveTradeSync] Conectando ao fluxo da Binance Testnet para gravação silenciosa...');
    wsClient.onData(this._onMessage);
    this._initialized = true;

    // Trigger asynchronous sync with the backend
    this.syncWithBackend().catch(err => console.error('[LiveTradeSync] Startup sync failed:', err));
  }

  stop() {
    wsClient.offData(this._onMessage);
    this._initialized = false;
  }

  async syncWithBackend() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSDT', 'GBPUSDT'];
    console.log('[LiveTradeSync] Sincronizando histórico de trades com o backend...');
    
    for (const sym of symbols) {
      try {
        const res = await fetch(`/api/candles/${sym}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (!data || !Array.isArray(data.trades)) continue;

        const dbSymbol = sym.replace('USDT', '/USD');

        // Reconcile open trades: close any local open trades that are no longer reported open by the backend
        const backendOpenTrade = data.trades.find(t => t.status === 'open');
        const localOpenTrades = await db.trades
          .where('symbol').equals(dbSymbol)
          .and(t => t.status === TRADE_STATUS.OPEN)
          .toArray();

        for (const localOpen of localOpenTrades) {
          let shouldClose = false;
          if (!backendOpenTrade) {
            shouldClose = true;
          } else {
            const backendEntryStr = typeof backendOpenTrade.timestamp === 'number' && backendOpenTrade.timestamp > 100000
              ? new Date(backendOpenTrade.timestamp * 1000).toISOString()
              : new Date().toISOString();
            const timeDiff = Math.abs(new Date(localOpen.entryDate).getTime() - new Date(backendEntryStr).getTime());
            const priceDiff = Math.abs(localOpen.entryPrice - backendOpenTrade.entryPrice);
            if (timeDiff > 10000 || priceDiff > 0.05) {
              shouldClose = true;
            }
          }
          if (shouldClose) {
            await db.transaction('rw', [db.trades], async () => {
              await db.trades.update(localOpen.id, {
                status: TRADE_STATUS.CLOSED,
                exitDate: new Date().toISOString(),
                exitPrice: localOpen.entryPrice,
                result: TRADE_RESULT.BREAKEVEN,
                pnl: 0
              });
            });
            console.log(`[LiveTradeSync] 🧹 Closed phantom open trade ${localOpen.id} for ${dbSymbol} during reconciliation.`);
          }
        }

        for (const t of data.trades) {
          const entryDateStr = typeof t.timestamp === 'number' && t.timestamp > 100000
            ? new Date(t.timestamp * 1000).toISOString()
            : new Date().toISOString();

          // Check if this trade already exists in IndexedDB
          const existing = await db.trades
            .where('symbol').equals(dbSymbol)
            .and(item => {
              const timeDiff = Math.abs(new Date(item.entryDate).getTime() - new Date(entryDateStr).getTime());
              return timeDiff < 5000 && item.direction === t.direction && Math.abs(item.entryPrice - t.entryPrice) < 0.01;
            })
            .first();

          if (existing) {
            // Update open trade to closed if backend says closed
            if (existing.status === TRADE_STATUS.OPEN && t.status === 'closed') {
              const pnlPct = parseFloat(t.pnl) || 0;
              await db.transaction('rw', [db.trades], async () => {
                await db.trades.update(existing.id, {
                  status: TRADE_STATUS.CLOSED,
                  exitDate: new Date(t.timestamp * 1000 + 60000).toISOString(),
                  exitPrice: t.exitPrice || t.entryPrice * (1 + pnlPct),
                  result: pnlPct > 0 ? TRADE_RESULT.WIN : TRADE_RESULT.LOSS,
                  pnl: pnlPct * 2000
                });
              });
              console.log(`[LiveTradeSync] Trade ${existing.id} sincronizado para FECHADO.`);
            }
            continue;
          }

          // Insert new trade
          const lastTrade = await db.trades.orderBy('id').last();
          const nextId = lastTrade ? lastTrade.id + 1 : 1;
          const pnlPct = parseFloat(t.pnl) || 0;

          const tradeDoc = {
            id: nextId,
            backendId: t.id,
            symbol: dbSymbol,
            asset: 'Crypto',
            market: data.mode === 'SIMULATION' ? 'Spot (Simulation)' : 'Spot (Testnet)',
            status: t.status === 'open' ? TRADE_STATUS.OPEN : TRADE_STATUS.CLOSED,
            direction: t.direction,
            entryDate: entryDateStr,
            exitDate: t.status === 'closed' ? new Date(t.timestamp * 1000 + 60000).toISOString() : null,
            entryPrice: t.entryPrice,
            exitPrice: t.status === 'closed' ? (t.exitPrice || t.entryPrice * (1 + pnlPct)) : null,
            result: t.status === 'closed' ? (pnlPct > 0 ? TRADE_RESULT.WIN : TRADE_RESULT.LOSS) : null,
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
          console.log(`[LiveTradeSync] Sincronizado trade antigo do backend: ${tradeDoc.symbol} (${tradeDoc.status})`);
        }
      } catch (err) {
        console.error(`[LiveTradeSync] Erro ao sincronizar ${sym}:`, err);
      }
    }
  }

  async _onMessage(data) {
    if (!data) return;
    
    if (data.trade && data.trade.governance === 'ALLOW') {
      try {
        const symbol = data.symbol ? data.symbol.replace('USDT', '/USD') : 'BTC/USD';
        const direction = data.trade.direction;
        const entryPrice = data.trade.price;
        const status = data.trade.status || 'closed';
        const pnlPct = parseFloat(data.trade.pnl) / 100 || 0;

        const tradeTimeMs = typeof data.trade.index === 'number' && data.trade.index > 100000
          ? data.trade.index * 1000
          : Date.now();

        const entryDateStr = new Date(tradeTimeMs).toISOString();

        // Check if there is already an open trade for this symbol
        const existingOpen = await db.trades
          .where('symbol').equals(symbol)
          .and(t => t.status === TRADE_STATUS.OPEN)
          .first();

        if (status === 'open') {
          if (existingOpen) return;
          
          const lastTrade = await db.trades.orderBy('id').last();
          const nextId = lastTrade ? lastTrade.id + 1 : 1;
          
          const tradeDoc = {
            id: nextId,
            backendId: data.trade.id,
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
            pnl: 0
          };

          await db.transaction('rw', [db.trades, db.marketContext], async () => {
            await db.trades.add(tradeDoc);
            await db.marketContext.add({
              tradeId: nextId,
              session: 'new_york',
              marketState: 'simulated_live'
            });
          });
          console.log(`[LiveTradeSync] 🟢 Telemetry Trade ABERTO no DB Local: ${tradeDoc.symbol} ${tradeDoc.direction}`);
        } else if (status === 'closed') {
          if (existingOpen) {
            await db.transaction('rw', [db.trades], async () => {
              await db.trades.update(existingOpen.id, {
                status: TRADE_STATUS.CLOSED,
                exitDate: new Date().toISOString(),
                exitPrice: entryPrice * (1 + pnlPct),
                result: pnlPct > 0 ? TRADE_RESULT.WIN : TRADE_RESULT.LOSS,
                pnl: pnlPct * 2000
              });
            });
            console.log(`[LiveTradeSync] 🔴 Telemetry Trade FECHADO no DB Local (ID ${existingOpen.id}): PnL: ${data.trade.pnl}`);
          } else {
            const lastTrade = await db.trades.orderBy('id').last();
            const nextId = lastTrade ? lastTrade.id + 1 : 1;
            
            const tradeDoc = {
              id: nextId,
              backendId: data.trade.id,
              symbol: symbol,
              asset: 'Crypto',
              market: data.mode === 'SIMULATION' ? 'Spot (Simulation)' : 'Spot (Testnet)',
              status: TRADE_STATUS.CLOSED,
              direction: direction,
              entryDate: entryDateStr,
              exitDate: new Date().toISOString(),
              entryPrice: entryPrice,
              exitPrice: entryPrice * (1 + pnlPct),
              result: pnlPct > 0 ? TRADE_RESULT.WIN : TRADE_RESULT.LOSS,
              pnl: pnlPct * 2000
            };

            await db.transaction('rw', [db.trades, db.marketContext], async () => {
              await db.trades.add(tradeDoc);
              await db.marketContext.add({
                tradeId: nextId,
                session: 'new_york',
                marketState: 'simulated_live'
              });
            });
            console.log(`[LiveTradeSync] 🟢 Telemetry Trade Registrada diretamente no DB Local: ${tradeDoc.symbol}`);
          }
        }
      } catch (err) {
        console.error('Erro ao sincronizar telemetry trade:', err);
      }
    }

    if (data.liveExecution) {
      const exec = data.liveExecution;
      try {
        const lastTrade = await db.trades.orderBy('id').last();
        const nextId = lastTrade ? lastTrade.id + 1 : 1;

        const tradeDoc = {
          id: nextId,
          backendId: exec.id || `trade_${Date.now()}`,
          symbol: exec.symbol.replace('USDT', '/USD'),
          asset: 'Crypto',
          market: 'Spot (Testnet)',
          status: TRADE_STATUS.OPEN,
          direction: exec.side === 'BUY' ? 'LONG' : 'SHORT',
          entryDate: new Date().toISOString(),
          exitDate: null,
          entryPrice: exec.price,
          exitPrice: null,
          result: null,
          pnl: 0,
        };

        await db.transaction('rw', [db.trades, db.marketContext], async () => {
          await db.trades.add(tradeDoc);
          await db.marketContext.add({
            tradeId: nextId,
            session: 'new_york',
            marketState: 'live_testnet'
          });
        });

        console.log(`[LiveTradeSync] 🟢 Execução Registrada no DB Local: ${tradeDoc.symbol} ${tradeDoc.direction}`);
      } catch (err) {
        console.error('[LiveTradeSync] Falha ao gravar trade no IndexedDB:', err);
      }
    }
  }
}

export const liveTradeSync = new LiveTradeSyncService();
