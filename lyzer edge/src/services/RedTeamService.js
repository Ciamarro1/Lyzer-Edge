import db from '../db/database.js';
import { TRADE_STATUS, TRADE_RESULT } from '../db/database.js';

export class RedTeamService {
  /**
   * Executa uma simulação profunda injetando perdas massivas 
   * (Cisne Negro) para forçar o acionamento das travas de segurança.
   */
  static async runDrill() {
    try {
      // 1. Ler Política de Risco
      const maxVarSetting = await db.settings.get('maxVarSurvival');
      const maxVar = maxVarSetting ? maxVarSetting.value : 5; // default 5%
      
      const accountBalanceSetting = await db.settings.get('accountBalance');
      const balance = accountBalanceSetting ? accountBalanceSetting.value : 10000;
      
      // Calculate how much to lose to break VaR
      // Example: If VaR is 5% of 10000, we need to lose more than 500.
      const targetLoss = (balance * (maxVar / 100)) + (balance * 0.02); // VaR + 2% margin to ensure breach
      
      const lossPerTrade = targetLoss / 3;

      // 2. Injetar o Cisne Negro (3 trades perdedoras consecutivas massivas)
      const now = new Date().getTime();
      const newTrades = [];
      const newAlerts = [];

      for (let i = 0; i < 3; i++) {
        const tradeId = await db.trades.add({
          symbol: 'SPX500',
          asset: 'Indices',
          market: 'CFD',
          status: TRADE_STATUS.CLOSED,
          direction: 'long',
          entryDate: new Date(now - (3000 * (3-i))).toISOString(),
          exitDate: new Date(now - (1000 * (3-i))).toISOString(),
          result: TRADE_RESULT.LOSS,
          pnl: -lossPerTrade
        });

        await db.marketContext.add({
          tradeId: tradeId,
          session: 'New York',
          marketState: 'Flash Crash' // Toxic state
        });
      }

      // 3. Disparar Alertas de Segurança (Sistema Imunológico reagindo)
      newAlerts.push({
        type: 'RISK',
        severity: 'critical',
        timestamp: new Date().toISOString(),
        read: false,
        title: '⚠️ MAX VaR BREACHED (RED TEAM DRILL)',
        message: `O Drawdown da conta excedeu a tolerância máxima de ${maxVar}%. Intervenção sistêmica imediata exigida.`
      });

      newAlerts.push({
        type: 'EDGE',
        severity: 'warning',
        timestamp: new Date().toISOString(),
        read: false,
        title: 'Inversão Epistêmica Ativada',
        message: 'O modelo base falhou sequencialmente devido ao evento de Cisne Negro. O MNE assumiu o controle defensivo da conta.'
      });
      
      newAlerts.push({
        type: 'PATTERN',
        severity: 'warning',
        timestamp: new Date().toISOString(),
        read: false,
        title: 'Bloqueio de Assinatura Tóxica',
        message: 'Tentativa de execução em Flash Crash bloqueada. A Invariante Epistêmica (Toxic Cluster Hard-Block) impediu novas ordens.'
      });

      await db.alerts.bulkAdd(newAlerts);

      return true;
    } catch (err) {
      console.error("[RedTeamService] Drill failed:", err);
      return false;
    }
  }

  /**
   * Aciona o botão nuclear: para o sistema completamente.
   */
  static async triggerKillSwitch() {
    try {
      await db.settings.put({ key: 'systemHalted', value: true });
      
      await db.alerts.add({
        type: 'SYSTEM',
        severity: 'critical',
        timestamp: new Date().toISOString(),
        read: false,
        title: '🛑 EMERGENCY KILL SWITCH ACTIVATED',
        message: 'O sistema foi paralisado manualmente. Todas as execuções de ordens estão bloqueadas até o reinício da infraestrutura.'
      });

      return true;
    } catch (err) {
      console.error("[RedTeamService] Kill Switch failed:", err);
      return false;
    }
  }
}
