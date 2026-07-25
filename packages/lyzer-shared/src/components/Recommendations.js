import { getAllTrades } from '../db/queries.js';
import { calcAllStats } from '../engine/stats.js';
import { calcEdgeScore } from '../engine/edgescore.js';

export class Recommendations {
  constructor() {
    this._container = null;
  }

  async mount(container) {
    this._container = container;
    
    // Initial UI
    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Recommendations Engine</h1>
          <p class="page-subtitle">Evidence-based insights to improve your trading edge</p>
        </div>
        <div id="recommendations-content">
          <p>Analyzing intelligence engines...</p>
        </div>
      </div>
    `;

    await this._loadData();
  }

  unmount() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  async _loadData() {
    const trades = await getAllTrades();
    const closedTrades = trades.filter(t => t.status === 'closed');
    const stats = calcAllStats(closedTrades);
    const edge = calcEdgeScore(closedTrades);

    const content = this._container.querySelector('#recommendations-content');
    if (!content) return;

    // Evidence Threshold Gate (Invisible filter)
    // Suppresses recommendations unless statistical significance is met (min 30 trades / sampleConfidence > 0)
    if (edge.components.sampleConfidence === 0 || closedTrades.length < 30) {
      content.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem; border: 1px dashed var(--color-border, #333);">
          <div style="font-size: 2rem; margin-bottom: 1rem;">🛡️</div>
          <h3 style="color: var(--color-warning, #f59e0b);">Evidence Threshold Not Met</h3>
          <p class="text-muted" style="max-width: 400px; margin: 0 auto;">Recommendations are suppressed to prevent "infinite auto-coaching". Please gather at least 30 closed trades to generate statistically significant insights.</p>
          <p class="text-muted" style="margin-top: 1rem;">Current Sample Size: <strong>${closedTrades.length}</strong> trades</p>
        </div>
      `;
      return;
    }

    const tactical = this._generateTactical(closedTrades, stats, edge);
    const strategic = this._generateStrategic(closedTrades, stats, edge);
    const developmental = this._generateDevelopmental(closedTrades, stats, edge);
    const protective = this._generateProtective(closedTrades, stats, edge);

    content.innerHTML = `
      <div class="recommendations-grid" style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
        
        <div class="card recommendation-card" style="border-left: 4px solid var(--color-accent, #3b82f6);">
          <h3>Tactical <span style="font-size: 0.8rem; font-weight: normal; color: var(--color-muted, #9ca3af);">Next Few Trades</span></h3>
          <p>${tactical}</p>
        </div>

        <div class="card recommendation-card" style="border-left: 4px solid var(--color-success, #06d6a0);">
          <h3>Strategic <span style="font-size: 0.8rem; font-weight: normal; color: var(--color-muted, #9ca3af);">Next Few Weeks</span></h3>
          <p>${strategic}</p>
        </div>

        <div class="card recommendation-card" style="border-left: 4px solid var(--color-warning, #f59e0b);">
          <h3>Developmental <span style="font-size: 0.8rem; font-weight: normal; color: var(--color-muted, #9ca3af);">Trader Improvement</span></h3>
          <p>${developmental}</p>
        </div>

        <div class="card recommendation-card" style="border-left: 4px solid var(--color-danger, #ef4444);">
          <h3>Protective <span style="font-size: 0.8rem; font-weight: normal; color: var(--color-muted, #9ca3af);">Capital Preservation</span></h3>
          <p>${protective}</p>
        </div>

      </div>
    `;
  }

  _generateTactical(trades, stats, edge) {
    if (trades.length < 5) return "Not enough recent data to form tactical advice. Focus on executing your plan.";
    
    // Sort oldest to newest usually, or maybe newest is first? The queries.js usually returns newest first or oldest first.
    // Let's assume trades array is whatever. We'll take the last 10 by date.
    const sorted = [...trades].sort((a, b) => new Date(b.exitDate || b.entryDate) - new Date(a.exitDate || a.entryDate));
    const recent = sorted.slice(0, 10);
    const recentWinRate = recent.filter(t => t.pnl > 0).length / recent.length * 100;
    
    if (recentWinRate < 30) {
      return "Recent win rate is low. Avoid Range environments in the coming sessions. Consider reducing position size temporarily and reviewing your recent setups for tilt or execution errors.";
    } else if (recentWinRate > 70) {
      return "You are in a hot streak. Maintain discipline and avoid sizing up aggressively out of overconfidence.";
    }
    return "Market conditions seem balanced. Stick to standard execution parameters for upcoming sessions.";
  }

  _generateStrategic(trades, stats, edge) {
    if (trades.length < 10) return "Gather more trade data to establish long-term strategic adjustments.";
    
    if (edge.score >= 70) {
      return "Your edge is strong (" + edge.score + "). Concentrate risk capital on your primary setups (e.g., Trend) and consider scaling up slightly.";
    } else if (edge.score < 40) {
      return "Your edge is weakening (" + edge.score + "). Step back, analyze the current market regime, and optimize your highest-conviction setup.";
    }
    return "Your edge is stable (" + edge.score + "). Continue gathering data to identify outperforming setups across different market regimes.";
  }

  _generateDevelopmental(trades, stats, edge) {
    if (trades.length === 0) return "Awaiting trade data to analyze developmental areas.";
    
    if (edge.components.rrScore < 40) {
      return "Your average reward-to-risk ratio is holding back profitability. Primary focus: Let winners run or improve entry precision. Execute TP entirely.";
    } else if (edge.components.winRateScore < 40) {
      return "Your win rate is below breakeven threshold. Primary focus: Review setup quality and avoid forcing marginal trades.";
    } else if (edge.components.drawdownScore < 50) {
      return "Drawdowns are larger than expected. Primary focus: Tighter risk control and avoiding revenge trading during losing streaks.";
    }
    return "Performance metrics are well-rounded. Primary focus: Maintain emotional equilibrium and refine your daily routines.";
  }

  _generateProtective(trades, stats, edge) {
    if (trades.length === 0) return "Awaiting trade data for protective measures.";
    
    if (stats.maxDrawdown.maxDrawdown > 15) {
      return "WARNING: Significant drawdown detected (>15%). Halt trading, switch to simulation, and perform a full review of your system.";
    } else if (edge.components.consistencyScore < 40) {
      return "High volatility in returns. Enforce strict daily/weekly loss limits to protect capital from erratic performance.";
    }
    return "Capital protection metrics are healthy. Keep your risk-per-trade steady and continue to respect stop losses.";
  }
}
 