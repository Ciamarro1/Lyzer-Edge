import db from '../db/database.js';
import { TRADE_STATUS, TRADE_RESULT } from '../db/database.js';

export class BinanceSeederService {
  /**
   * Baixa OHLCV real da Binance e simula operações (HFT, Day Trade, Swing)
   * aplicando taxas e slippage realistas.
   */
  static async seedRealCryptoHistory() {
    try {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
      const trades = [];
      const marketContexts = [];
      
      const accountBalanceSetting = await db.settings.get('accountBalance');
      const balance = accountBalanceSetting ? accountBalanceSetting.value : 10000;
      
      // Constants for realistic simulation
      const RISK_PER_TRADE = balance * 0.02; // Risking 2% per trade (~$200)
      const EXCHANGE_FEE_RATE = 0.001; // 0.1% Binance Spot Maker/Taker fee
      
      for (const symbol of symbols) {
        // Fetch last 1000 days of data (approx 3 anos)
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=1000`);
        if (!response.ok) throw new Error(`Binance API error for ${symbol}`);
        
        const klines = await response.json();
        /*
          Klines format:
          [0] Open time
          [1] Open
          [2] High
          [3] Low
          [4] Close
          [5] Volume
          [6] Close time
        */
        
        let openSwingTrade = null;

        for (let i = 0; i < klines.length; i++) {
          const kline = klines[i];
          const openTime = kline[0];
          const open = parseFloat(kline[1]);
          const high = parseFloat(kline[2]);
          const low = parseFloat(kline[3]);
          const close = parseFloat(kline[4]);
          const closeTime = kline[6];
          
          const dailyRange = (high - low) / open;
          
          // 1. SWING TRADE LOGIC (Holds for multiple days)
          if (openSwingTrade) {
            // Should we close it? (Random chance or hit 'target')
            if (Math.random() > 0.7 || i === klines.length - 1) {
              const exitPrice = close;
              openSwingTrade.exitPrice = exitPrice;
              openSwingTrade.exitDate = new Date(closeTime).toISOString();
              
              const priceDeltaPct = openSwingTrade.direction === 'long' 
                ? (exitPrice - openSwingTrade.entryPrice) / openSwingTrade.entryPrice 
                : (openSwingTrade.entryPrice - exitPrice) / openSwingTrade.entryPrice;
                
              // Notional position size = Risk / (StopLossPct) -> Let's assume fixed leverage of 10x
              const positionSize = (RISK_PER_TRADE * 10);
              
              // Slippage & Fees
              const slippage = positionSize * (Math.random() * 0.0005); // up to 0.05% slippage total
              const fees = positionSize * (EXCHANGE_FEE_RATE * 2); // Entry + Exit fee
              
              const netPnl = (positionSize * priceDeltaPct) - fees - slippage;
              
              trades.push({
                symbol: symbol.replace('USDT', '/USD'),
                asset: 'Crypto',
                market: 'Spot',
                status: TRADE_STATUS.CLOSED,
                direction: openSwingTrade.direction,
                entryDate: openSwingTrade.entryDate,
                exitDate: openSwingTrade.exitDate,
                entryPrice: openSwingTrade.entryPrice,
                exitPrice: openSwingTrade.exitPrice,
                result: netPnl > 0 ? TRADE_RESULT.WIN : TRADE_RESULT.LOSS,
                pnl: netPnl
              });
              
              openSwingTrade = null;
            }
          } else {
            // Maybe open a swing trade
            if (Math.random() > 0.8) {
              openSwingTrade = {
                direction: Math.random() > 0.5 ? 'long' : 'short',
                entryPrice: open,
                entryDate: new Date(openTime).toISOString()
              };
            }
          }

          // 2. DAY TRADE LOGIC (Opens and closes within the same daily candle)
          if (Math.random() > 0.5) {
            // Trend follow the daily candle
            const direction = close > open ? 'long' : 'short';
            const entryPrice = open + ((close - open) * 0.1); // enter slightly after open
            const exitPrice = close;
            
            const priceDeltaPct = direction === 'long' 
              ? (exitPrice - entryPrice) / entryPrice 
              : (entryPrice - exitPrice) / entryPrice;
              
            const positionSize = (RISK_PER_TRADE * 20); // 20x leverage for day trade
            const slippage = positionSize * (Math.random() * 0.0002);
            const fees = positionSize * (EXCHANGE_FEE_RATE * 2);
            const netPnl = (positionSize * priceDeltaPct) - fees - slippage;
            
            trades.push({
              symbol: symbol.replace('USDT', '/USD'),
              asset: 'Crypto',
              market: 'CFD',
              status: TRADE_STATUS.CLOSED,
              direction: direction,
              entryDate: new Date(openTime + (1000 * 60 * 60)).toISOString(), // 1 hr into the day
              exitDate: new Date(closeTime - (1000 * 60 * 60)).toISOString(), // 1 hr before close
              entryPrice: entryPrice,
              exitPrice: exitPrice,
              result: netPnl > 0 ? TRADE_RESULT.WIN : TRADE_RESULT.LOSS,
              pnl: netPnl
            });
          }
        }
      }

      // 4. Inject into IndexedDB
      if (trades.length === 0) return false;

      // Ensure IDs and contexts
      const lastTrade = await db.trades.orderBy('id').last();
      const startingId = lastTrade ? lastTrade.id + 1 : 1;
      
      const sessions = ['asia', 'london', 'new_york'];
      const states = ['trending', 'ranging', 'high_volatility'];

      for(let i=0; i<trades.length; i++) {
          trades[i].id = startingId + i;
          
          marketContexts.push({
            tradeId: trades[i].id,
            session: sessions[Math.floor(Math.random() * sessions.length)],
            marketState: states[Math.floor(Math.random() * states.length)]
          });
      }

      await db.transaction('rw', db.trades, db.marketContext, async () => {
        await db.trades.bulkAdd(trades);
        await db.marketContext.bulkAdd(marketContexts);
      });

      console.log(`[BinanceSeeder] Injected ${trades.length} real-data based trades.`);
      return true;

    } catch (error) {
      console.error("[BinanceSeederService] Falha na injeção da Binance:", error);
      return false;
    }
  }
}
