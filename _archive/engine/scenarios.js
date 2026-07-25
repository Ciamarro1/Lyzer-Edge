/**
 * Lyzer Edge Analyst — Scenario Engine
 *
 * Core engine to simulate different trading scenarios by applying configurations
 * of rules to a set of trades. Outputs a complete statistical profile comparing
 * the scenario to reality.
 *
 * @module scenarios
 */

import { calcAllStats } from './stats.js';
import { calcEdgeScore } from './edgescore.js';
import { runBootstrapSimulation } from './montecarlo.js';

/**
 * Applies filters (e.g., symbol, direction) to the trades.
 * @param {import('./stats.js').Trade[]} trades
 * @param {Object} filters
 * @returns {import('./stats.js').Trade[]}
 */
function applyFilters(trades, filters) {
  if (!filters) return trades;
  return trades.filter(trade => {
    if (filters.symbols && filters.symbols.length > 0 && !filters.symbols.includes(trade.symbol)) return false;
    if (filters.directions && filters.directions.length > 0 && !filters.directions.includes(trade.direction)) return false;
    if (filters.custom && typeof filters.custom === 'function' && !filters.custom(trade)) return false;
    return true;
  });
}

/**
 * Applies behavior rules (e.g., time of day, session).
 * @param {import('./stats.js').Trade[]} trades
 * @param {Object} behaviorRules
 * @returns {import('./stats.js').Trade[]}
 */
function applyBehaviorRules(trades, behaviorRules) {
  if (!behaviorRules) return trades;
  return trades.filter(trade => {
    if (!trade.entryDate) return true;
    const d = new Date(trade.entryDate);
    if (Number.isNaN(d.getTime())) return true;
    
    const hour = d.getUTCHours();
    const day = d.getUTCDay();
    
    if (behaviorRules.startHour !== undefined && hour < behaviorRules.startHour) return false;
    if (behaviorRules.endHour !== undefined && hour > behaviorRules.endHour) return false;
    if (behaviorRules.daysOfWeek !== undefined && !behaviorRules.daysOfWeek.includes(day)) return false;
    
    return true;
  });
}

/**
 * Applies execution rules (e.g., slippage, commissions).
 * Modifies trade PnL and R-Multiples. Returns a new array of cloned and modified trades.
 * @param {import('./stats.js').Trade[]} trades
 * @param {Object} executionRules
 * @returns {import('./stats.js').Trade[]}
 */
function applyExecutionRules(trades, executionRules) {
  if (!executionRules) return trades;
  
  return trades.map(t => {
    const trade = { ...t };
    let cost = 0;
    
    if (executionRules.commission) {
      cost += executionRules.commission;
    }
    
    if (executionRules.slippageR && typeof trade.rMultiple === 'number') {
      const rSlippage = executionRules.slippageR;
      trade.rMultiple -= rSlippage;
      
      if (trade.riskAmount) {
        cost += trade.riskAmount * rSlippage;
      }
    } else if (executionRules.slippageCurrency) {
      cost += executionRules.slippageCurrency;
    }
    
    if (typeof trade.pnl === 'number') {
      trade.pnl -= cost;
      
      // Update result if necessary
      if (trade.pnl > 0) trade.result = 'win';
      else if (trade.pnl < 0) trade.result = 'loss';
      else trade.result = 'breakeven';
    }
    
    return trade;
  });
}

/**
 * Applies risk rules (e.g., fixed risk per trade).
 * Modifies PnL and Risk Amount based on rules.
 * @param {import('./stats.js').Trade[]} trades
 * @param {Object} riskRules
 * @returns {import('./stats.js').Trade[]}
 */
function applyRiskRules(trades, riskRules) {
  if (!riskRules) return trades;
  
  return trades.map(t => {
    const trade = { ...t };
    
    if (riskRules.fixedRisk && typeof trade.rMultiple === 'number') {
      trade.riskAmount = riskRules.fixedRisk;
      trade.pnl = trade.rMultiple * riskRules.fixedRisk;
      
      if (trade.pnl > 0) trade.result = 'win';
      else if (trade.pnl < 0) trade.result = 'loss';
      else trade.result = 'breakeven';
    }
    
    return trade;
  });
}

/**
 * Calculates a simplified delta between two sets of stats.
 * @param {Object} baseline 
 * @param {Object} scenario 
 * @returns {Object}
 */
function calculateDelta(baseline, scenario) {
  return {
    tradeCount: scenario.tradeCount - baseline.tradeCount,
    winRate: scenario.winRate - baseline.winRate,
    expectancy: scenario.expectancy - baseline.expectancy,
    profitFactor: scenario.profitFactor - baseline.profitFactor,
    edgeScore: scenario.edgeScore - baseline.edgeScore,
    maxDrawdown: scenario.maxDrawdown - baseline.maxDrawdown,
  };
}

/**
 * Run a scenario with given rules against historical trades.
 * 
 * @param {import('./stats.js').Trade[]} originalTrades 
 * @param {Object} rules 
 * @param {Object} [rules.filters]
 * @param {Object} [rules.executionRules]
 * @param {Object} [rules.riskRules]
 * @param {Object} [rules.behaviorRules]
 * @returns {{
 *   tradeCount: number,
 *   winRate: number,
 *   expectancy: number,
 *   profitFactor: number,
 *   edgeScore: number,
 *   confidence: string,
 *   maxDrawdown: number,
 *   monteCarlo: Object|null,
 *   deltaVsReality: Object
 * }} Complete statistical profile
 */
export function runScenario(originalTrades, rules = {}) {
  const safeOriginalTrades = Array.isArray(originalTrades) ? originalTrades : [];

  // 1. Baseline stats for delta calculation
  const baselineStats = calcAllStats(safeOriginalTrades);
  const baselineEdge = calcEdgeScore(safeOriginalTrades);
  const baseline = {
    tradeCount: baselineStats.totalTrades,
    winRate: baselineStats.winRate,
    expectancy: baselineStats.expectancy,
    profitFactor: baselineStats.profitFactor,
    edgeScore: baselineEdge.score,
    maxDrawdown: baselineStats.maxDrawdown ? baselineStats.maxDrawdown.maxDrawdown : 0,
  };

  // 2. Apply rules sequentially
  let simulatedTrades = applyFilters(safeOriginalTrades, rules.filters);
  simulatedTrades = applyBehaviorRules(simulatedTrades, rules.behaviorRules);
  simulatedTrades = applyExecutionRules(simulatedTrades, rules.executionRules);
  simulatedTrades = applyRiskRules(simulatedTrades, rules.riskRules);

  // 3. Calculate scenario stats
  const stats = calcAllStats(simulatedTrades);
  const edge = calcEdgeScore(simulatedTrades);
  
  // 4. Monte Carlo simulation
  let mcResult = null;
  if (simulatedTrades.length > 0) {
    mcResult = runBootstrapSimulation(simulatedTrades, 10000);
  }

  // 5. Build output profile
  const profile = {
    tradeCount: stats.totalTrades,
    winRate: stats.winRate,
    expectancy: stats.expectancy,
    profitFactor: stats.profitFactor,
    edgeScore: edge.score,
    confidence: edge.confidence,
    maxDrawdown: stats.maxDrawdown ? stats.maxDrawdown.maxDrawdown : 0,
    monteCarlo: mcResult,
    deltaVsReality: {}
  };

  // 6. Calculate Delta vs Reality
  profile.deltaVsReality = calculateDelta(baseline, profile);

  return profile;
}
 