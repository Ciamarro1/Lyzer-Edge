/**
 * V4 Provider: Institutional Market Causality Engine (IMCE)
 * 
 * PRIMARY DIRECTIVE:
 * The market has priority over any theory.
 * ICT/SMC concepts are treated strictly as probabilistic features, NEVER absolute truth.
 * Reconstructs narrative bar by bar across the 3 Causal Questions:
 * 1. WHAT HAPPENED?
 * 2. WHERE DOES PRICE WANT TO GO?
 * 3. IS NOW THE BEST MOMENT TO EXECUTE?
 */

import { MarketStateEngine, MARKET_STATES } from '../causality/marketStateEngine.js';
import { LiquidityGraph } from '../causality/liquidityGraph.js';
import { MetaAgentValidator } from '../causality/metaAgentValidator.js';

export class InstitutionalMarketCausalityEngine {
  constructor(config = {}) {
    this.marketStateEngine = new MarketStateEngine();
    this.liquidityGraph = new LiquidityGraph();
    this.metaAgentValidator = new MetaAgentValidator();
    this.minScore = config.minScore || 60;
    this.targetAtrMultiplier = config.targetAtrMultiplier || 2.0;
  }

  /**
   * Reconstructs market causality bar by bar.
   * @param {Object} mtfCandles - { fast: [], intermediate: [], slow: [] }
   * @returns {Object} IMCE Causal Hypothesis & Trade DNA
   */
  reconstruct(mtfCandles) {
    const candles = (mtfCandles.fast && mtfCandles.fast.length >= 14)
      ? mtfCandles.fast
      : (mtfCandles.intermediate || []);

    if (candles.length < 14) {
      return {
        signal: 'flat',
        confidence: 0,
        narrative: 'INSUFFICIENT_IMCE_DATA',
        tradeDna: null,
        causalAnswers: null
      };
    }

    const current = candles[candles.length - 1];
    const prev1 = candles[candles.length - 2];
    const prev2 = candles[candles.length - 3];
    const prev3 = candles[candles.length - 4];

    // Q1: WHAT HAPPENED?
    const marketStateResult = this.marketStateEngine.evaluateState(candles);
    const isBullishSweep = current.low < prev1.low && current.close > prev1.low;
    const isBearishSweep = current.high > prev1.high && current.close < prev1.high;
    const isBullishMss = prev2.close < prev2.open && current.close > prev1.high;
    const isBearishMss = prev2.close > prev2.open && current.close < prev1.low;

    let whatHappened = 'CONSOLIDATION_FLAT';
    let signal = 'flat';
    let narrativeScore = 0;

    if (isBullishSweep) {
      whatHappened = 'SELL_SIDE_LIQUIDITY_SWEPT';
      signal = 'long';
      narrativeScore += 35;
    } else if (isBearishSweep) {
      whatHappened = 'BUY_SIDE_LIQUIDITY_SWEPT';
      signal = 'short';
      narrativeScore += 35;
    }

    if (isBullishMss && signal === 'long') {
      whatHappened += '_WITH_BULLISH_MSS';
      narrativeScore += 35;
    } else if (isBearishMss && signal === 'short') {
      whatHappened += '_WITH_BEARISH_MSS';
      narrativeScore += 35;
    }

    // Q2: WHERE DOES PRICE WANT TO GO? (Liquidity Target)
    const atr = marketStateResult.metrics.atr || 1;
    const activeNodes = this.liquidityGraph.updateGraph(current.close, atr);

    const primaryTargetPrice = signal === 'long'
      ? current.close + atr * 2.0
      : current.close - atr * 2.0;

    const wherePriceWantsToGo = signal === 'long'
      ? `BUY_SIDE_POOL_AT_${primaryTargetPrice.toFixed(2)}`
      : `SELL_SIDE_POOL_AT_${primaryTargetPrice.toFixed(2)}`;
    
    let targetScore = 20;

    // Q3: IS NOW THE BEST MOMENT TO EXECUTE?
    const executionScore = (marketStateResult.state === MARKET_STATES.EXPANSION || marketStateResult.state === MARKET_STATES.STOP_HUNT)
      ? 20
      : 10;

    const finalScore = Math.min(100, narrativeScore + targetScore + executionScore);
    const confidence = finalScore;

    // Red Team Meta-Agent Audit
    const metaAudit = this.metaAgentValidator.auditProposal(
      { symbol: 'IMCE' },
      { atr, spread: 0.1, dailyDrawdownPct: 0.005 }
    );

    if (metaAudit.vetoed) {
      signal = 'flat';
    }

    // Trade DNA Engine
    const tradeDna = {
      sweep: isBullishSweep || isBearishSweep,
      mss: isBullishMss || isBearishMss,
      fvg: (prev3.high < prev1.low) || (prev3.low > prev1.high),
      breaker: false,
      premium: current.close > (prev3.high + prev3.low) / 2,
      volume: 'high',
      session: 'london_ny',
      volatility: marketStateResult.metrics.rangeSize > atr ? 'high' : 'normal',
      htf: signal === 'long' ? 'bullish' : signal === 'short' ? 'bearish' : 'neutral',
      alignment: true,
      news: false,
      marketState: marketStateResult.state
    };

    const explanationText = `[IMCE V4] ${whatHappened}. Objective: ${wherePriceWantsToGo}. State: ${marketStateResult.state}. Final Score: ${finalScore}/100. RedTeam: ${metaAudit.reason}.`;

    return {
      signal: finalScore >= this.minScore ? signal : 'flat',
      confidence,
      narrative: whatHappened,
      explanationText,
      tradeDna,
      causalAnswers: {
        whatHappened,
        wherePriceWantsToGo,
        isNowBestMoment: !metaAudit.vetoed
      },
      targets: {
        tp1: signal === 'long' ? current.close + atr * 1.5 : current.close - atr * 1.5,
        tp2: signal === 'long' ? current.close + atr * 2.5 : current.close - atr * 2.5
      }
    };
  }
}
