import db from '../db/database.js';
import { TRADE_STATUS, TRADE_RESULT } from '../db/database.js';

export class DataSeederService {
  /**
   * Forja um histórico matemático robusto simulando 2 anos de operações.
   * Utiliza parâmetros realistas de Win Rate (55%), R/R médio (1.5) e variância gausiana.
   * @param {number} totalTrades Número de operações para forjar
   */
  static async seedMassiveHistory(totalTrades = 3000) {
    try {
      const now = new Date().getTime();
      const twoYearsAgo = now - (2 * 365 * 24 * 60 * 60 * 1000);
      const timeStep = (now - twoYearsAgo) / totalTrades; // Espaço de tempo médio entre as operações
      
      const trades = [];
      const marketContexts = [];

      const symbols = ['EUR/USD', 'GBP/USD', 'SPX500', 'NAS100', 'XAU/USD'];
      const sessions = ['asia', 'london', 'new_york', 'london_ny_overlap'];
      const states = ['trending', 'ranging', 'expansion', 'compression', 'high_volatility'];

      // Parâmetros do Operador
      const winRate = 0.55; // 55%
      const baseLoss = 200; // $200 de risco médio
      const rewardToRisk = 1.6; // Ouro: Lucro é 1.6x o Risco

      let currentTime = twoYearsAgo;

      for (let i = 1; i <= totalTrades; i++) {
        // Randomizar o tempo (fuzzing) para não ficar perfeitamente linear
        const timeFuzz = (Math.random() - 0.5) * timeStep * 0.5;
        currentTime += timeStep + timeFuzz;

        // Distribuição de Win/Loss
        const isWin = Math.random() < winRate;
        
        // PnL com alguma variância
        const variance = 1 + ((Math.random() - 0.5) * 0.4); // +/- 20% de variância
        const pnl = isWin ? (baseLoss * rewardToRisk * variance) : -(baseLoss * variance);

        const direction = Math.random() > 0.5 ? 'long' : 'short';
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];

        // Trade Object
        trades.push({
          symbol: symbol,
          asset: symbol.includes('USD') && !symbol.includes('XAU') ? 'Forex' : 'Indices',
          market: 'CFD',
          status: TRADE_STATUS.CLOSED,
          direction: direction,
          entryDate: new Date(currentTime - (Math.random() * 2 * 60 * 60 * 1000)).toISOString(), // 0 a 2 horas antes
          exitDate: new Date(currentTime).toISOString(),
          result: isWin ? TRADE_RESULT.WIN : TRADE_RESULT.LOSS,
          pnl: pnl
        });

        // Não podemos dar push direto com o ID porque o bulkAdd auto-incrementa. 
        // O IndexedDB não retorna os IDs gerados do bulkAdd facilmente se passarmos um array simples com chaves compostas em outra tabela.
        // Contudo, se adicionarmos o 'id' sequencialmente sabendo o count atual, funciona.
      }

      // 1. Obter o próximo ID disponível
      const lastTrade = await db.trades.orderBy('id').last();
      const startingId = lastTrade ? lastTrade.id + 1 : 1;

      for(let i=0; i<trades.length; i++) {
          trades[i].id = startingId + i;
          
          marketContexts.push({
            tradeId: trades[i].id,
            session: sessions[Math.floor(Math.random() * sessions.length)],
            marketState: states[Math.floor(Math.random() * states.length)]
          });
      }

      // 2. Transação Bulk Massiva
      await db.transaction('rw', db.trades, db.marketContext, async () => {
        await db.trades.bulkAdd(trades);
        await db.marketContext.bulkAdd(marketContexts);
      });

      return true;
    } catch (error) {
      console.error("[DataSeederService] Falha na injeção massiva:", error);
      return false;
    }
  }
}
