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
  }

  stop() {
    wsClient.offData(this._onMessage);
    this._initialized = false;
  }

  async _onMessage(data) {
    if (!data) return;
    
    // O backend pode emitir payloads de telemetry (data.trade simulado) ou execuções reais (data.liveExecution)
    // O streamEngine emite data.trade dentro de payload.trade (que é um sumário de simulação),
    // mas também emite payload.liveExecution quando um trade é de fato enviado pra Binance.
    
    // Vamos gravar tanto os trades da telemetria da streamEngine (que têm gov ALLOW/REJECT)
    // se quisermos ver o comportamento completo. Mas para evitar duplicidade, gravaremos apenas
    // trades quando data.trade existir e a governança for ALLOW (ou seja, o robô operou).
    // Nota: O backend emite `arl` payload com { trade: ... }. 
    
    if (data.trade && data.trade.governance === 'ALLOW') {
      try {
        const lastTrade = await db.trades.orderBy('id').last();
        const nextId = lastTrade ? lastTrade.id + 1 : 1;

        // O payload.trade tem: index, direction, price, pnl, governance
        // Mas a symbol vem do payload root ou market? Em streamEngine.js payload tem `market: candle`
        // Porém, não tem a symbol fácil no `data.trade`. O backend não injeta symbol em `data.trade`.
        // Vamos buscar a symbol de `data.market.symbol` (se houver) ou inferir. 
        // No streamEngine, ele emite { symbol: this.symbol, side, order, price, quantity } em `liveExecution`.
        // É mais seguro usar `data.liveExecution`!
      } catch (err) {
        console.error('Erro ao sincronizar', err);
      }
    }

    if (data.liveExecution) {
      const exec = data.liveExecution;
      try {
        const lastTrade = await db.trades.orderBy('id').last();
        const nextId = lastTrade ? lastTrade.id + 1 : 1;

        const tradeDoc = {
          id: nextId,
          symbol: exec.symbol.replace('USDT', '/USD'),
          asset: 'Crypto',
          market: 'Spot (Testnet)',
          status: TRADE_STATUS.OPEN, // Robôs live geralmente começam OPEN
          direction: exec.side === 'BUY' ? 'LONG' : 'SHORT',
          entryDate: new Date().toISOString(),
          exitDate: null,
          entryPrice: exec.price,
          exitPrice: null,
          result: null, // Será preenchido quando fechar
          pnl: 0,
        };

        // Vamos salvar no Dexie
        await db.transaction('rw', db.trades, db.marketContext, async () => {
          await db.trades.add(tradeDoc);
          
          await db.marketContext.add({
            tradeId: nextId,
            session: 'new_york', // simplified
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
