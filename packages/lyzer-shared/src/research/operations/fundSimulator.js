import { CapitalGovernor } from '../execution/capitalGovernor.js';
import { PortfolioManager } from '../execution/portfolioManager.js';
import { InstitutionalRealityScore } from './institutionalRealityScore.js';
import { OperationalChaosEngine } from './operationalChaosEngine.js';

export class FundSimulator {
  constructor(initialAUM = 100000) {
    this.governor = new CapitalGovernor();
    this.portfolio = new PortfolioManager(initialAUM);
    this.irs = new InstitutionalRealityScore();
    this.chaos = new OperationalChaosEngine();
    
    // Config do simulador
    this.totalEvents = 3000;
    this.baseWinRate = 0.45; // Win rate teórico do Alpha (abaixo de 50%)
    this.payoffRatio = 1.3; // Ganha 1.3, Perde 1.0
    
    this.history = [];
  }

  runSimulation() {
    console.log(`[L9] Starting 30-Days in Hell Simulation...`);
    console.log(`[L9] Initial AUM: USD ${this.portfolio.currentAUM}`);

    for (let i = 0; i < this.totalEvents; i++) {
      // 1. Sintetizar Payload do Mercado
      let marketPayload = {
        liquidityScore: 0.8 + (Math.random() * 0.2), // Default bom
        regimeAccuracy: 0.7 + (Math.random() * 0.3),
        latency: 50
      };

      // 2. Injetar Caos
      try {
        marketPayload = this.chaos.corruptMarketData(marketPayload);
        marketPayload.latency = this.chaos.injectLatency(marketPayload.latency);
      } catch (e) {
        // Ex: API Offline - aborta o trade silenciosamente (Nenhuma ordem sai)
        continue;
      }

      // 3. Avaliar IRS
      const irsResult = this.irs.calculateIRS({
        alphaSurvivalScore: 20,
        executionQuality: marketPayload.latency > 500 ? 5 : 22,
        liquidityHealth: marketPayload.liquidityScore !== undefined ? marketPayload.liquidityScore * 25 : 0,
        regimeAccuracy: 20,
        operationalRiskPenalty: marketPayload.close === -1 ? 50 : 0
      });

      if (irsResult.state === "HALT") {
        continue;
      }

      // 4. Decisão do Capital Governor
      const govDecision = this.governor.allocateRisk({
        lssScore: 90,
        alphaDecayPercent: 5,
        regimeProbability: marketPayload.regimeAccuracy,
        currentDrawdown: this.portfolio.currentDrawdown ? this.portfolio.currentDrawdown * 100 : 0,
        liquidityScore: marketPayload.liquidityScore || 0,
        realityGap: marketPayload.latency > 500 ? 20 : 2,
        dailyLossRealized: this.governor.dailyLossRealized || 0,
        recentTrades: this.history.slice(-3) // Envia últimos trades
      });

      if (govDecision.allocation === 0) {
        // Veto
        continue;
      }

      // 5. Portfolio Manager - Position Sizing & Real Execution
      const sizing = this.portfolio.calculatePositionSizing(
        govDecision.allocation, 
        marketPayload.liquidityScore || 1
      );

      // Simulação do PnL base
      const isWin = Math.random() < this.baseWinRate;
      let rawPnlPercent = isWin ? 0.015 * this.payoffRatio : -0.015; // Ganha ~2%, perde 1.5% base
      
      // Aplicar Slippage da Capacidade 
      if (isWin) rawPnlPercent -= sizing.expectedSlippage;
      else rawPnlPercent -= sizing.expectedSlippage; // Aumenta a perda

      // Atualiza Portfolio
      this.portfolio.logTradeResult(rawPnlPercent, sizing.notional);
      
      // Grava no histórico para o governador (mantendo memória de 5 trades)
      this.history.push({ pnl: rawPnlPercent });
      if (this.history.length > 5) this.history.shift();

      // Zera daily loss do governador simulado a cada ~100 trades (1 dia)
      if (i % 100 === 0) {
        this.governor.dailyLossRealized = 0;
        this.governor.capitalFreeze = false; // "Reset" de novo dia
      } else {
        this.governor.dailyLossRealized += rawPnlPercent;
      }
    }

    console.log(`[L9] End of Simulation.`);
    console.log(`[L9] Final AUM: USD ${this.portfolio.currentAUM.toFixed(2)}`);
    console.log(`[L9] Max Drawdown: ${(this.portfolio.maxDrawdownRealized * 100).toFixed(2)}%`);
    console.log(`[L9] Total Trades Executed: ${this.portfolio.totalTrades}`);
    
    return {
      initialAUM: this.portfolio.initialAUM,
      finalAUM: this.portfolio.currentAUM,
      maxDrawdown: this.portfolio.maxDrawdownRealized,
      totalTrades: this.portfolio.totalTrades
    };
  }
}
