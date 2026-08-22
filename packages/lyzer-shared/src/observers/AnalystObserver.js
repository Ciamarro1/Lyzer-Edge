/**
 * Analyst Observer — Observer Dynamics Lab (Era 7.1 Wave 3)
 * Tracks analyst consensus, price targets, rating revisions,
 * models "Herding Bias" and cognitive anchoring lag.
 */
export class AnalystObserver {
  constructor(options = {}) {
    this.herdingFactor = options.herdingFactor || 0.65; // High herding tendency
    this.inertiaLagPeriods = options.inertiaLagPeriods || 5;
    this.opinions = new Map();
    this.consensusHistory = [];
  }

  /**
   * Registers or updates an analyst's forecast.
   * @param {Object} opinion - { analystId, timestamp, targetPrice, recommendation ('BUY'|'HOLD'|'SELL'), confidence (0-100) }
   */
  registerAnalystOpinion(opinion) {
    if (!opinion || !opinion.analystId) return null;

    const record = {
      analystId: opinion.analystId,
      timestamp: opinion.timestamp || Date.now(),
      targetPrice: opinion.targetPrice,
      recommendation: (opinion.recommendation || 'HOLD').toUpperCase(),
      confidence: opinion.confidence || 50
    };

    this.opinions.set(opinion.analystId, record);
    return record;
  }

  /**
   * Computes consensus price target and rating distribution.
   */
  getConsensus() {
    const list = Array.from(this.opinions.values());
    if (list.length === 0) {
      return {
        analystsCount: 0,
        consensusPrice: null,
        buyRatio: 0,
        holdRatio: 0,
        sellRatio: 0,
        consensusBias: 'NEUTRAL'
      };
    }

    let sumPrice = 0;
    let validPriceCount = 0;
    let buys = 0, holds = 0, sells = 0;

    for (const op of list) {
      if (typeof op.targetPrice === 'number' && op.targetPrice > 0) {
        sumPrice += op.targetPrice;
        validPriceCount++;
      }
      if (op.recommendation === 'BUY') buys++;
      else if (op.recommendation === 'SELL') sells++;
      else holds++;
    }

    const consensusPrice = validPriceCount > 0 ? sumPrice / validPriceCount : null;
    const buyRatio = buys / list.length;
    const holdRatio = holds / list.length;
    const sellRatio = sells / list.length;

    let consensusBias = 'NEUTRAL';
    if (buyRatio > 0.6) consensusBias = 'BULLISH';
    else if (sellRatio > 0.6) consensusBias = 'BEARISH';

    const consensus = {
      analystsCount: list.length,
      consensusPrice,
      buyRatio,
      holdRatio,
      sellRatio,
      consensusBias
    };

    this.consensusHistory.push({ timestamp: Date.now(), ...consensus });
    if (this.consensusHistory.length > 200) this.consensusHistory.shift();

    return consensus;
  }

  /**
   * Calculates Herding Divergence between market spot price and analyst consensus.
   */
  getHerdingDivergence(currentMarketPrice) {
    const consensus = this.getConsensus();
    if (!consensus.consensusPrice || !currentMarketPrice) {
      return { divergencePct: 0, herdingLagBps: 0, isLagging: false };
    }

    const divergencePct = (currentMarketPrice - consensus.consensusPrice) / consensus.consensusPrice;
    const herdingLagBps = Math.abs(divergencePct) * 10000;
    const isLagging = Math.abs(divergencePct) > 0.05; // 5% divergence signals analyst cognitive lag

    return {
      divergencePct,
      herdingLagBps,
      isLagging,
      consensusBias: consensus.consensusBias
    };
  }
}
