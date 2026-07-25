/**
 * evDecompositionLab.js
 * Lyzer Core v0.9 — EV Decomposition Lab (v1)
 * Performs ablactions, regime stress-testing, and execution drag calculations.
 */

import { EvSignalEngine } from './evSignalRedesign.js';
import { evaluateExecution, calculateFillProbability } from './executionReality.js';
import { TruthKernel } from './kernel.js';
import { computeTradeEV } from './evProfiler.js';

export class EvDecompositionLab {
  constructor(candles, opponentCandles, baseConfig = {}) {
    this.candles = candles;
    this.opponentCandles = opponentCandles;
    this.baseConfig = baseConfig;
  }

  /**
   * Helper to run a parameterized simulation over the historical candle trajectory.
   */
  runSimulation({
    disableMTF = false,
    overrideRegimes = null,
    useERL = true,
    benchmark = 'erl', // 'erl', 'ideal', 'historical'
    limitDiscountFactor = 0.0,
    limitExpiry = 3
  } = {}) {
    const signalEngine = new EvSignalEngine({
      disableMTF,
      overrideRegimes,
      instabilityThreshold: this.baseConfig.instabilityThreshold ?? 0.40,
      regimeInfluence: this.baseConfig.regimeInfluence ?? 0.7
    });

    const truthKernel = new TruthKernel({
      masterSwitchThreshold: this.baseConfig.confidenceThreshold ?? 50,
      chopPenalty: this.baseConfig.chopPenalty ?? 0.7
    });

    let balance = 10000;
    const initialBalance = 10000;
    let position = null;
    let limitOrder = null;
    const candidatesList = [];
    const localHistory = [];

    // Helper to calculate volatility
    const calculateVolPct = (idx) => {
      if (idx < 20) return 0.005;
      const recentCloses = this.candles.slice(idx - 19, idx + 1).map(c => c.close);
      const meanVal = recentCloses.reduce((a, b) => a + b, 0) / 20;
      const varianceVal = recentCloses.reduce((sum, val) => sum + Math.pow(val - meanVal, 2), 0) / 20;
      return Math.sqrt(varianceVal) / meanVal;
    };

    // Helper to calculate correlation
    const calculateCorrelation = (idx) => {
      const recentSelf = this.candles.slice(Math.max(0, idx - 10), idx + 1).map(c => c.close);
      const recentOpp = this.opponentCandles.slice(Math.max(0, idx - 10), idx + 1).map(c => c.close);
      const n = Math.min(recentSelf.length, recentOpp.length);
      if (n === 0) return 1.0;
      const mean1 = recentSelf.reduce((sum, val) => sum + val, 0) / n;
      const mean2 = recentOpp.reduce((sum, val) => sum + val, 0) / n;

      let num = 0, den1 = 0, den2 = 0;
      for (let i = 0; i < n; i++) {
        const diff1 = recentSelf[i] - mean1;
        const diff2 = recentOpp[i] - mean2;
        num += diff1 * diff2;
        den1 += diff1 * diff1;
        den2 += diff2 * diff2;
      }
      if (den1 === 0 || den2 === 0) return 1.0;
      return num / Math.sqrt(den1 * den2);
    };

    for (let i = 51; i < this.candles.length; i++) {
      const currentCandle = this.candles[i];
      const sigResult = signalEngine.evaluate(this.candles, i);

      let candidate = null;
      if (sigResult.signal !== 'caution') {
        let idealPrice = currentCandle.close;
        const lookahead = this.candles.slice(i, Math.min(this.candles.length, i + 3));
        if (sigResult.signal === 'go') {
          idealPrice = Math.min(...lookahead.map(c => c.low));
        } else {
          idealPrice = Math.max(...lookahead.map(c => c.high));
        }
        const timingOffset = Math.abs(currentCandle.close - idealPrice) / currentCandle.close;

        // Compute execution reality metrics
        const recentCandles = this.candles.slice(Math.max(0, i - 19), i + 1);
        const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
        const volPct = calculateVolPct(i);

        let slippageVal = 0.0002;
        let spreadVal = 0.0001;
        let distortionVal = 1.0;

        if (useERL) {
          if (benchmark === 'erl') {
            const execMetrics = evaluateExecution({
              orderType: limitDiscountFactor > 0.0 ? 'LIMIT' : 'MARKET',
              price: currentCandle.close,
              size: 1.0,
              avgVolume,
              volPct,
              spread: 0.0001,
              limitOffset: limitDiscountFactor * currentCandle.close * volPct,
              timeToExpiry: limitExpiry,
              orderBookImbalance: 0.1,
              latencyMs: 15,
              queuePosition: 10,
              totalQueue: 100
            });
            slippageVal = execMetrics.slippage;
            distortionVal = execMetrics.distortionFactor;
          } else if (benchmark === 'historical') {
            slippageVal = 0.0002; // 2bps
            spreadVal = 0.0001;   // 1bp
            distortionVal = 1.0;
          } else if (benchmark === 'ideal') {
            slippageVal = 0.0;
            spreadVal = 0.0;
            distortionVal = 1.0;
          }
        } else {
          slippageVal = 0.0;
          spreadVal = 0.0;
          distortionVal = 1.0;
        }

        candidate = {
          id: `${i}`,
          timestamp: i,
          direction: sigResult.signal === 'go' ? 'LONG' : 'SHORT',
          entryPrice: currentCandle.close,
          limitPrice: currentCandle.close,
          signal: {
            type: sigResult.signal === 'go' ? 'LONG' : 'SHORT',
            confidence: sigResult.confidence,
            reasons: sigResult.reasons
          },
          regime: sigResult.regime,
          wasRejected: false,
          governanceDecision: 'REJECT',
          reasonCodes: [...sigResult.reasons],
          slippage: slippageVal,
          spread: spreadVal,
          distortionFactor: distortionVal,
          timingOffset: timingOffset
        };
      }

      // Assemble TruthKernel inputs
      const correlationVal = calculateCorrelation(i);
      let correlationSignal = 'caution';
      let correlationConf = 60;
      if (correlationVal > 0.65) {
        correlationSignal = 'go';
        correlationConf = Math.round(correlationVal * 100);
      } else if (correlationVal < -0.2) {
        correlationSignal = 'no-go';
        correlationConf = Math.round(Math.abs(correlationVal) * 100);
      }

      const ema100 = signalEngine.calculateEMA(this.candles.slice(0, i + 1), i, 100);
      const timeframeSignal = currentCandle.close > ema100 ? 'go' : 'no-go';
      const timeframeConf = 75;

      let behaviorSignal = 'caution';
      let behaviorConf = 50;
      if (sigResult.rsi < 35) {
        behaviorSignal = 'go';
        behaviorConf = 80;
      } else if (sigResult.rsi > 65) {
        behaviorSignal = 'no-go';
        behaviorConf = 80;
      }

      const enginesInput = {
        regime: {
          signal: sigResult.signal,
          confidence: sigResult.confidence,
          reason_codes: sigResult.reasons,
          market_regime: sigResult.regime,
          trend_strength: sigResult.trendStrength
        },
        timeframe: {
          signal: timeframeSignal,
          confidence: timeframeConf,
          reason_codes: [currentCandle.close > ema100 ? 'HTF_ABOVE_EMA100' : 'HTF_BELOW_EMA100']
        },
        correlation: {
          signal: correlationSignal,
          confidence: correlationConf,
          reason_codes: [correlationVal > 0.65 ? 'STRONG_POSITIVE_LEADER_CORR' : 'DIVERGING_MARKET_CORR']
        },
        behavior: {
          signal: behaviorSignal,
          confidence: behaviorConf,
          reason_codes: [behaviorSignal === 'go' ? 'MOMENTUM_BOUNCE' : 'NORMAL_BEHAVIOR']
        }
      };

      const kernelVerdict = truthKernel.evaluate(enginesInput);

      if (candidate) {
        if (kernelVerdict.signal !== 'caution') {
          candidate.reasonCodes = Array.from(new Set([...candidate.reasonCodes, ...kernelVerdict.reason_codes]));
          if (position) {
            candidate.governanceDecision = 'CAPACITY_CONSTRAINED';
          } else {
            candidate.governanceDecision = 'ALLOW';
          }
        } else {
          candidate.governanceDecision = 'REJECT';
          candidate.wasRejected = true;
          candidate.reasonCodes = Array.from(new Set([...candidate.reasonCodes, ...kernelVerdict.reason_codes]));
        }
        candidatesList.push(candidate);
      }

      // Exit logic
      if (position) {
        let closed = false;
        let exitPrice = 0;
        if (position.type === 'LONG') {
          if (currentCandle.low <= position.stopLoss) {
            closed = true;
            exitPrice = position.stopLoss;
          } else if (currentCandle.high >= position.takeProfit) {
            closed = true;
            exitPrice = position.takeProfit;
          } else if (kernelVerdict.signal === 'no-go' || kernelVerdict.confidence < 50) {
            closed = true;
            exitPrice = currentCandle.close;
          }
        } else {
          if (currentCandle.high >= position.stopLoss) {
            closed = true;
            exitPrice = position.stopLoss;
          } else if (currentCandle.low <= position.takeProfit) {
            closed = true;
            exitPrice = position.takeProfit;
          } else if (kernelVerdict.signal === 'go' || kernelVerdict.confidence < 50) {
            closed = true;
            exitPrice = currentCandle.close;
          }
        }

        if (closed) {
          const pnlPct = position.type === 'LONG'
            ? (exitPrice - position.entryPrice) / position.entryPrice
            : (position.entryPrice - exitPrice) / position.entryPrice;
          balance += pnlPct * balance * 0.25;

          const cand = candidatesList.find(c => c.id === position.candidateId);
          if (cand) {
            cand.exitPrice = exitPrice;
            cand.pnl = pnlPct;
          }
          position = null;
        }
      }

      // Limit order evaluation
      if (!position && limitOrder) {
        let filled = false;
        const limitOffset = Math.abs(currentCandle.close - limitOrder.limitPrice);
        const volPct = calculateVolPct(i);
        const timeToExpiry = Math.max(1, limitOrder.expiryIndex - i);
        const fillProb = useERL 
          ? calculateFillProbability(limitOffset, volPct, currentCandle.close, timeToExpiry)
          : 1.0;

        const roll = ((i * 12345 + Math.floor(limitOrder.limitPrice)) % 1000) / 1000;

        if (limitOrder.type === 'LONG' && currentCandle.low <= limitOrder.limitPrice) {
          if (!useERL || roll <= fillProb) filled = true;
        } else if (limitOrder.type === 'SHORT' && currentCandle.high >= limitOrder.limitPrice) {
          if (!useERL || roll <= fillProb) filled = true;
        }

        if (filled) {
          const entryPrice = limitOrder.limitPrice;
          const R = entryPrice * 0.10;
          const rr = this.baseConfig.riskReward ?? 2.0;

          position = {
            type: limitOrder.type,
            entryPrice,
            takeProfit: limitOrder.type === 'LONG' ? entryPrice + rr * R : entryPrice - rr * R,
            stopLoss: limitOrder.type === 'LONG' ? entryPrice - R : entryPrice + R,
            candidateId: limitOrder.candidateId
          };
          limitOrder = null;
        } else if (i >= limitOrder.expiryIndex) {
          const cand = candidatesList.find(c => c.id === limitOrder.candidateId);
          if (cand) {
            cand.governanceDecision = 'CANCELLED_LIMIT';
            cand.pnl = 0;
            cand.exitPrice = cand.entryPrice;
          }
          limitOrder = null;
        }
      }

      // Position placement triggers
      if (!position && !limitOrder) {
        if (kernelVerdict.signal === 'go' && kernelVerdict.confidence >= 50) {
          const entryPrice = currentCandle.close;
          if (limitDiscountFactor === 0.0) {
            const R = entryPrice * 0.10;
            const rr = this.baseConfig.riskReward ?? 2.0;
            position = {
              type: 'LONG',
              entryPrice,
              takeProfit: entryPrice + rr * R,
              stopLoss: entryPrice - R,
              candidateId: `${i}`
            };
          } else {
            const volPct = calculateVolPct(i);
            const limitPrice = entryPrice - entryPrice * volPct * limitDiscountFactor;
            limitOrder = {
              type: 'LONG',
              limitPrice,
              expiryIndex: i + limitExpiry,
              candidateId: `${i}`
            };
            const cand = candidatesList.find(c => c.id === `${i}`);
            if (cand) cand.limitPrice = limitPrice;
          }
        } else if (kernelVerdict.signal === 'no-go' && kernelVerdict.confidence >= 50) {
          const entryPrice = currentCandle.close;
          if (limitDiscountFactor === 0.0) {
            const R = entryPrice * 0.10;
            const rr = this.baseConfig.riskReward ?? 2.0;
            position = {
              type: 'SHORT',
              entryPrice,
              takeProfit: entryPrice - rr * R,
              stopLoss: entryPrice + R,
              candidateId: `${i}`
            };
          } else {
            const volPct = calculateVolPct(i);
            const limitPrice = entryPrice + entryPrice * volPct * limitDiscountFactor;
            limitOrder = {
              type: 'SHORT',
              limitPrice,
              expiryIndex: i + limitExpiry,
              candidateId: `${i}`
            };
            const cand = candidatesList.find(c => c.id === `${i}`);
            if (cand) cand.limitPrice = limitPrice;
          }
        }
      }
    }

    // Shadow Replay post-pass
    for (const cand of candidatesList) {
      if (cand.pnl !== undefined) continue;

      const entryIdx = cand.timestamp;
      const direction = cand.direction;
      const limitPrice = cand.limitPrice ?? cand.entryPrice;
      let filled = false;
      let filledIdx = entryIdx;

      if (cand.governanceDecision === 'CANCELLED_LIMIT') {
        for (let j = entryIdx + 1; j <= Math.min(this.candles.length - 1, entryIdx + limitExpiry); j++) {
          const candle = this.candles[j];
          if ((direction === 'LONG' && candle.low <= limitPrice) || (direction === 'SHORT' && candle.high >= limitPrice)) {
            const limitOffset = Math.abs(this.candles[entryIdx].close - limitPrice);
            const volPct = calculateVolPct(entryIdx);
            const timeToExpiry = Math.max(1, entryIdx + limitExpiry - j);
            const fillProb = useERL 
              ? calculateFillProbability(limitOffset, volPct, this.candles[entryIdx].close, timeToExpiry)
              : 1.0;

            const roll = ((j * 12345 + Math.floor(limitPrice)) % 1000) / 1000;
            if (!useERL || roll <= fillProb) {
              filled = true;
              filledIdx = j;
              break;
            }
          }
        }
      } else {
        filled = true;
        filledIdx = entryIdx;
      }

      if (!filled) {
        cand.exitPrice = cand.entryPrice;
        cand.pnl = 0;
        continue;
      }

      const R = limitPrice * 0.10;
      const takeProfit = direction === 'LONG' ? limitPrice + (this.baseConfig.riskReward ?? 2.0) * R : limitPrice - (this.baseConfig.riskReward ?? 2.0) * R;
      const stopLoss = direction === 'LONG' ? limitPrice - R : limitPrice + R;
      let exitPrice = 0;
      let closed = false;

      for (let j = filledIdx + 1; j < this.candles.length; j++) {
        const candle = this.candles[j];
        if (direction === 'LONG') {
          if (candle.low <= stopLoss) {
            closed = true;
            exitPrice = stopLoss;
          } else if (candle.high >= takeProfit) {
            closed = true;
            exitPrice = takeProfit;
          }
        } else {
          if (candle.high >= stopLoss) {
            closed = true;
            exitPrice = stopLoss;
          } else if (candle.low <= takeProfit) {
            closed = true;
            exitPrice = takeProfit;
          }
        }
        if (closed) break;
      }
      if (!closed) exitPrice = this.candles[this.candles.length - 1].close;

      cand.exitPrice = exitPrice;
      cand.pnl = direction === 'LONG'
        ? (exitPrice - limitPrice) / limitPrice
        : (limitPrice - exitPrice) / limitPrice;
    }

    // Process trade EV and calculate totals
    for (const cand of candidatesList) {
      const evReport = computeTradeEV(cand, {}, localHistory);
      localHistory.push({
        ...cand,
        ev: evReport
      });
    }

    const avgEV = localHistory.reduce((sum, h) => sum + h.ev.totalEV, 0) / (localHistory.length || 1);
    return {
      history: localHistory,
      avgEV: avgEV
    };
  }

  /**
   * Generates a detailed trade-level EV decomposition report.
   */
  generateTradeReport() {
    const report = [];

    // 1. Compute Base Signal Only (1m Redesign solo, no MTF, ideal ERL execution)
    const baseSim = this.runSimulation({
      disableMTF: true,
      useERL: false,
      limitDiscountFactor: 0.0
    });

    // 2. Compute Signal + MTF (MTF consensus, ideal execution)
    const mtfSim = this.runSimulation({
      disableMTF: false,
      useERL: false,
      limitDiscountFactor: 0.0
    });

    // 3. Compute Signal + MTF + ERL (Full Simulated System)
    const erlSim = this.runSimulation({
      disableMTF: false,
      useERL: true,
      benchmark: 'erl',
      limitDiscountFactor: this.baseConfig.limitDiscountFactor ?? 0.4,
      limitExpiry: this.baseConfig.limitExpiry ?? 5
    });

    // 4. Compute Regime Shuffle Stress Test
    const regimes = this.candles.map(c => {
      const emaDiff = Math.abs(c.close - c.open) / (c.open || 1);
      return emaDiff > 0.005 ? (c.close > c.open ? 'trending_up' : 'trending_down') : 'ranging';
    });
    const shuffledRegimes = [...regimes].sort(() => Math.random() - 0.5);
    const shuffleSim = this.runSimulation({
      disableMTF: false,
      overrideRegimes: shuffledRegimes,
      useERL: true,
      benchmark: 'erl',
      limitDiscountFactor: this.baseConfig.limitDiscountFactor ?? 0.4,
      limitExpiry: this.baseConfig.limitExpiry ?? 5
    });

    // 5. Compute Regime Invert Stress Test
    const invertedRegimes = regimes.map(r => {
      if (r === 'trending_up') return 'trending_down';
      if (r === 'trending_down') return 'trending_up';
      return r;
    });
    const invertSim = this.runSimulation({
      disableMTF: false,
      overrideRegimes: invertedRegimes,
      useERL: true,
      benchmark: 'erl',
      limitDiscountFactor: this.baseConfig.limitDiscountFactor ?? 0.4,
      limitExpiry: this.baseConfig.limitExpiry ?? 5
    });

    // 6. Compute Execution benchmark: Static Historical Frictions (2bps slippage, 1bp spread)
    const histSim = this.runSimulation({
      disableMTF: false,
      useERL: true,
      benchmark: 'historical',
      limitDiscountFactor: this.baseConfig.limitDiscountFactor ?? 0.4,
      limitExpiry: this.baseConfig.limitExpiry ?? 5
    });

    return {
      aggregated: {
        EV_signal: baseSim.avgEV,
        EV_timing: mtfSim.avgEV - baseSim.avgEV,
        EV_execution: erlSim.avgEV - mtfSim.avgEV,
        EV_regime_shuffle: shuffleSim.avgEV - erlSim.avgEV,
        EV_regime_invert: invertSim.avgEV - erlSim.avgEV,
        delta_vs_historical_friction: erlSim.avgEV - histSim.avgEV,
        EV_total: erlSim.avgEV
      },
      details: {
        baseSignalsCount: baseSim.history.length,
        mtfSignalsCount: mtfSim.history.length,
        erlSignalsCount: erlSim.history.length
      }
    };
  }
}
 