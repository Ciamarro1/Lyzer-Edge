import fs from 'fs';
import path from 'path';

export class CapitalGovernor {
  constructor(config = {}) {
    this.baseAllocation = config.baseAllocation || 0.01; // 1% default
    this.maxAllocation = config.maxAllocation || 0.05;   // 5% max limit
    this.dailyRiskBudget = config.dailyRiskBudget || 0.03; // Max 3% loss per day
    this.statePath = config.statePath || 'knowledge/operations/governor_state.json';
    
    // Load state if exists, otherwise initialize default
    const loadedState = this.loadState();
    
    this.recoveryState = loadedState ? loadedState.recoveryState : false;
    this.recoveryConsecutiveWins = loadedState ? loadedState.recoveryConsecutiveWins : 0;
    this.capitalFreeze = loadedState ? loadedState.capitalFreeze : false;
    this.dailyLossRealized = loadedState ? loadedState.dailyLossRealized : 0;
    this.currentDrawdown = loadedState ? loadedState.currentDrawdown : 0;
  }

  loadState() {
    try {
      if (fs.existsSync(this.statePath)) {
        const raw = fs.readFileSync(this.statePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("[GOVERNOR ERROR] Failed to load state, falling back to defaults.", e);
    }
    return null;
  }

  saveState() {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const stateToSave = {
        recoveryState: this.recoveryState,
        recoveryConsecutiveWins: this.recoveryConsecutiveWins,
        capitalFreeze: this.capitalFreeze,
        dailyLossRealized: this.dailyLossRealized,
        currentDrawdown: this.currentDrawdown,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.statePath, JSON.stringify(stateToSave, null, 2), 'utf8');
    } catch (e) {
      console.error("[GOVERNOR ERROR] Failed to save state.", e);
    }
  }

  /**
   * Avalia a velocidade da perda (Loss Velocity).
   * Retorna penalty severa se o capital foi perdido rapidamente em curto período.
   */
  evaluateLossVelocity(recentTrades) {
    if (!recentTrades || recentTrades.length < 3) return 1.0;
    
    // Se os últimos 3 trades foram loss seguidos e estouraram > 1%
    const last3 = recentTrades.slice(-3);
    const isAllLoss = last3.every(t => t.pnl < 0);
    const totalLoss = last3.reduce((acc, t) => acc + t.pnl, 0);

    if (isAllLoss && totalLoss < -0.01) {
      return 0.25; // Corta alocação para 25% (Forte punição de velocity)
    }
    return 1.0;
  }

  /**
   * Decide position sizing dynamically based on systemic and microscopic risks.
   * L8: Added Daily Budget, Velocity, Recovery State and Freeze Mode.
   */
  allocateRisk(metrics) {
    if (this.capitalFreeze) {
      return { allocation: 0, riskState: "VETO_CAPITAL_FREEZE" };
    }

    const { 
        lssScore, 
        alphaDecayPercent, 
        regimeProbability, 
        currentDrawdown, 
        liquidityScore, 
        realityGap,
        dailyLossRealized, // Novo L8
        recentTrades       // Novo L8
    } = metrics;

    let allocation = this.baseAllocation;
    let riskState = "NEUTRAL";

    // Update internal state trackers
    this.dailyLossRealized = dailyLossRealized !== undefined ? dailyLossRealized : this.dailyLossRealized;
    this.currentDrawdown = currentDrawdown !== undefined ? currentDrawdown : this.currentDrawdown;

    // 1. L8 Hard Stops (Daily Budget & Circuit Breakers)
    if (this.dailyLossRealized && Math.abs(this.dailyLossRealized) >= this.dailyRiskBudget) {
      this.capitalFreeze = true;
      this.saveState();
      return { allocation: 0, riskState: "VETO_DAILY_BUDGET_EXCEEDED" };
    }

    if (lssScore < 85) return { allocation: 0, riskState: "VETO_LSS_LOW" };
    if (this.currentDrawdown > 15) {
      this.capitalFreeze = true;
      this.saveState();
      return { allocation: 0, riskState: "VETO_DRAWDOWN_BREACH" };
    }
    if (realityGap > 15) return { allocation: 0, riskState: "VETO_REALITY_GAP" };
    if (liquidityScore < 0.4) return { allocation: 0, riskState: "VETO_ILLIQUID" };

    // 2. Recovery State Logic (L8)
    if (this.currentDrawdown > 10 || this.recoveryState) {
      this.recoveryState = true;
      // Em recovery, o tamanho é travado no mínimo até provar 5 vitórias seguidas
      allocation = this.baseAllocation;
      riskState = "RECOVERY_MODE";
      
      const lastTrade = recentTrades ? recentTrades[recentTrades.length - 1] : null;
      if (lastTrade && lastTrade.pnl > 0) {
        this.recoveryConsecutiveWins++;
      } else if (lastTrade && lastTrade.pnl < 0) {
        this.recoveryConsecutiveWins = 0;
      }

      if (this.recoveryConsecutiveWins >= 5) {
        this.recoveryState = false; // Saiu do recovery
        this.recoveryConsecutiveWins = 0;
      }
      
      this.saveState();

      if (this.recoveryState) {
        // Trava de segurança: impede qualquer scale up
        return { allocation: parseFloat(allocation.toFixed(4)), risk_state: riskState };
      }
    }

    // 3. Dynamic Scaling (L7 + Velocity)
    // Loss Velocity
    const velocityPenalty = this.evaluateLossVelocity(recentTrades);
    allocation *= velocityPenalty;
    if (velocityPenalty < 1.0) riskState = "DEFENSIVE";

    // Regime Confidence
    if (regimeProbability > 0.8 && !this.recoveryState) {
        allocation *= 1.2; 
    } else if (regimeProbability < 0.5) {
        allocation *= 0.5; 
        if (riskState === "NEUTRAL") riskState = "CAUTIOUS";
    }

    // Alpha Decay Check
    if (alphaDecayPercent > 20) {
        allocation *= 0.5; 
        riskState = "DEFENSIVE";
    }

    // Liquidity Penalty
    if (liquidityScore < 0.7) {
        allocation *= liquidityScore; 
        riskState = "CAUTIOUS";
    }

    // Drawdown Scaling (Anti-Martingale)
    if (currentDrawdown > 5 && !this.recoveryState) {
        const ddPenalty = 1 - (currentDrawdown / 15);
        allocation *= ddPenalty;
        riskState = "DEFENSIVE";
    }

    // Clamp limits
    allocation = Math.min(Math.max(allocation, 0), this.maxAllocation);

    if (allocation > this.baseAllocation && riskState === "NEUTRAL") {
        riskState = "AGGRESSIVE";
    }

    this.saveState();

    return {
      allocation: parseFloat(allocation.toFixed(4)),
      risk_state: riskState
    };
  }
}
