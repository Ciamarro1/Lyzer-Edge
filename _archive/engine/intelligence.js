import { calcEdgeScore, getConfidenceScore } from './edgescore.js';
import { calculateSystemReliabilityScore } from './reliability.js';
import { analyzeBehavior } from './behavior.js';
import { calcRiskOfRuin } from './risk.js';
import { calculateEdgeSlope } from './decay.js';
import { calcAllStats } from './stats.js';

/**
 * Lyzer Edge - Trading Intelligence Score
 * 
 * Sits *above* the Edge Score. The Edge Score measures the setup's statistical advantage; 
 * the Trading Intelligence Score measures how intelligently the trader is operating.
 * 
 * Formula: (25% Edge Quality) + (20% Confidence) + (20% Persistence) + (15% Behavior) + (10% Risk Control) + (10% Edge Decay)
 */

export function calcIntelligenceScore(trades) {
  if (!trades || trades.length === 0) {
    return {
      score: 0,
      baseEdgeScore: null,
      components: { edgeQuality: 0, confidence: 0, persistence: 0, behavior: 0, riskControl: 0, edgeDecay: 0 }
    };
  }

  const stats = calcAllStats(trades);
  
  // 1. Edge Quality (25%)
  const edge = calcEdgeScore(trades);
  const edgeQuality = edge.score; // 0-100

  // 2. Confidence (20%)
  const confidence = getConfidenceScore(trades.length);

  // 3. Persistence (20%)
  const persistence = calculateSystemReliabilityScore(trades);

  // 4. Behavior (15%)
  // Based on tilt (performance after loss vs after win) and consistency
  let behavior = edge.components.consistencyScore || 50; 
  const behaviorAnalysis = analyzeBehavior(trades);
  if (behaviorAnalysis && behaviorAnalysis.tiltStats) {
    const { afterWin, afterLoss } = behaviorAnalysis.tiltStats;
    // If expectancy after loss is drastically worse, penalize behavior
    const expWin = afterWin.expectancy || 0;
    const expLoss = afterLoss.expectancy || 0;
    if (expLoss < expWin) {
      const penalty = Math.min(50, ((expWin - expLoss) * 10)); // Arbitrary scaling
      behavior = Math.max(0, behavior - penalty);
    } else {
      const bonus = Math.min(20, ((expLoss - expWin) * 10));
      behavior = Math.min(100, behavior + bonus);
    }
  }

  // 5. Risk Control (10%)
  // Calculate Risk of Ruin using a theoretical 50R capital
  const winRate = stats.winRate;
  const avgWinR = stats.avgWin; // Assuming PnL is R-multiple or we can use expectancy components
  const avgLossR = stats.avgLoss; 
  // Wait, stats.avgWin is in $, we need avgR. We can approximate with winRate and RR
  const rr = stats.avgRR || 1;
  const w = winRate / 100;
  // For Risk of ruin formula: avgWinR = rr, avgLossR = -1
  const ror = calcRiskOfRuin(w, rr, -1, 50); 
  const riskControl = 100 - (ror * 100);

  // 6. Edge Decay (10%)
  const slope = calculateEdgeSlope(trades, Math.min(30, Math.floor(trades.length / 2)));
  let edgeDecay = 50;
  if (slope >= 0) {
    edgeDecay = Math.min(100, 50 + (slope * 500)); // Positive slope = better score
  } else {
    edgeDecay = Math.max(0, 50 + (slope * 1000)); // Negative slope = penalty
  }
  if (trades.length < 10) edgeDecay = 50; // Not enough data to assess decay

  // Calculate final score
  const score = (0.25 * edgeQuality) +
                (0.20 * confidence) +
                (0.20 * persistence) +
                (0.15 * behavior) +
                (0.10 * riskControl) +
                (0.10 * edgeDecay);

  return {
    score: Math.round(score * 10) / 10,
    baseEdgeScore: edge, // Score Hierarchy: Intelligence Score sits above Edge Score
    components: {
      edgeQuality: Math.round(edgeQuality),
      confidence: Math.round(confidence),
      persistence: Math.round(persistence),
      behavior: Math.round(behavior),
      riskControl: Math.round(riskControl),
      edgeDecay: Math.round(edgeDecay)
    }
  };
}
 