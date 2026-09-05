/**
 * Lyzer Edge - Dynamic Sizing Engine
 * 
 * Scales position size based on Allocation Score and Capacity Score.
 * Designed to answer: "How big should this position be given the edge and capacity?"
 */
export class DynamicSizing {
  /**
   * @param {number} baseRiskPercentage - Base risk percentage per trade (e.g., 1.0 for 1%)
   * @param {number} maxRiskPercentage - Maximum allowed risk percentage per trade (e.g., 5.0 for 5%)
   * @param {number} baselineAllocationScore - The reference Allocation Score that results in 1x scale (base risk)
   * @param {Object} config - Config for epistemic sizing (CSI/CoC floors and norm)
   */
  constructor(baseRiskPercentage = 1.0, maxRiskPercentage = 5.0, baselineAllocationScore = 50, config = {}) {
    this.baseRiskPercentage = baseRiskPercentage;
    this.maxRiskPercentage = maxRiskPercentage;
    this.baselineAllocationScore = baselineAllocationScore;

    // Epistemic Sizing configuration (disabled by default in runtime execution)
    this.useEpistemicScaling = config.useEpistemicScaling !== undefined ? config.useEpistemicScaling : false;
    this.csiFloor = config.csiFloor !== undefined ? config.csiFloor : 0.3;
    this.cocFloor = config.cocFloor !== undefined ? config.cocFloor : 0.5;
    this.confidenceBase = config.confidenceBase !== undefined ? config.confidenceBase : 75;
    this.useConfidenceNorm = config.useConfidenceNorm !== undefined ? config.useConfidenceNorm : true;
  }

  /**
   * Calculates the recommended risk percentage based on the allocation and capacity scores,
   * optionally applying the Epistemic Sizing multiplier.
   * 
   * @param {number} allocationScore - Evaluated score of the strategy/setup (typically 0-100)
   * @param {number} capacityScore - Depth/liquidity/trade count score (0-100)
   * @param {number} csi - Confidence Stability Index (0 to 1)
   * @param {number} coc - Confidence of Confidence (0 to 1)
   * @returns {number} The dynamically scaled risk percentage
   */
  calculateRecommendedRisk(allocationScore, capacityScore, csi = 1.0, coc = 1.0) {
    const validAllocScore = Math.max(0, allocationScore || 0);
    const validCapScore = Math.max(0, Math.min(100, capacityScore || 0));

    // Allocation multiplier (scale relative to the baseline score)
    const allocationMultiplier = this.baselineAllocationScore > 0 
      ? validAllocScore / this.baselineAllocationScore 
      : 0;

    // Capacity multiplier (0 to 1 scale)
    const capacityMultiplier = validCapScore / 100;

    // Base risk calculation
    let recommendedRisk = this.baseRiskPercentage * allocationMultiplier * capacityMultiplier;

    // Apply epistemic multiplier if active
    if (this.useEpistemicScaling) {
      const multiplier = this.calculateEpistemicMultiplier(allocationScore, csi, coc);
      recommendedRisk *= multiplier;
    }

    // Clamp to max risk limits and do not allow negative risk
    return Math.max(0, Math.min(this.maxRiskPercentage, recommendedRisk));
  }

  /**
   * Calculates the multiplier from epistemic stability (CSI) and signal density (CoC).
   * 
   * @param {number} confidence - The decision confidence (0-100)
   * @param {number} csi - Confidence Stability Index (0 to 1)
   * @param {number} coc - Confidence of Confidence (0 to 1)
   * @returns {number} Sizing multiplier
   */
  calculateEpistemicMultiplier(confidence, csi = 1.0, coc = 1.0) {
    if (!this.useEpistemicScaling) return 1.0;

    const csiClamped = Math.max(this.csiFloor, csi);
    const cocClamped = Math.max(this.cocFloor, coc);

    let confidenceNorm = 1.0;
    if (this.useConfidenceNorm) {
      confidenceNorm = confidence / this.confidenceBase;
    }

    return confidenceNorm * csiClamped * cocClamped;
  }

  /**
   * Calculates absolute position size (in units) based on dollar risk and stop loss distance.
   * 
   * @param {number} accountBalance - Total portfolio or account balance
   * @param {number} recommendedRiskPct - The risk percentage to take on the trade
   * @param {number} entryPrice - Anticipated or actual entry price
   * @param {number} stopLossPrice - Stop loss price
   * @returns {number} The absolute position size (units)
   */
  calculatePositionSize(accountBalance, recommendedRiskPct, entryPrice, stopLossPrice) {
    if (accountBalance <= 0 || recommendedRiskPct <= 0) return 0;

    const riskAmount = accountBalance * (recommendedRiskPct / 100);
    const priceRisk = Math.abs(entryPrice - stopLossPrice);

    if (priceRisk === 0) return 0; // Avoid division by zero if prices are identical

    return riskAmount / priceRisk;
  }

  /**
   * Get a complete dynamic sizing recommendation.
   */
  getDynamicSize(accountBalance, entryPrice, stopLossPrice, allocationScore, capacityScore, csi = 1.0, coc = 1.0) {
    const riskPct = this.calculateRecommendedRisk(allocationScore, capacityScore, csi, coc);
    const units = this.calculatePositionSize(accountBalance, riskPct, entryPrice, stopLossPrice);
    const riskAmount = accountBalance * (riskPct / 100);
    
    return {
      recommendedRiskPercentage: riskPct,
      riskAmount: riskAmount,
      positionSizeUnits: units,
      scaleFactors: {
        allocationScore,
        capacityScore,
        csi,
        coc,
        allocationMultiplier: this.baselineAllocationScore > 0 ? (Math.max(0, allocationScore || 0) / this.baselineAllocationScore) : 0,
        capacityMultiplier: Math.max(0, Math.min(100, capacityScore || 0)) / 100,
        epistemicMultiplier: this.calculateEpistemicMultiplier(allocationScore, csi, coc)
      }
    };
  }

  /**
   * Evaluates and returns the sizing recommendation adhering to the Kernel contract schema.
   */
  evaluate(accountBalance, entryPrice, stopLossPrice, allocationScore, capacityScore, csi = 1.0, coc = 1.0) {
    const raw_metrics = this.getDynamicSize(accountBalance, entryPrice, stopLossPrice, allocationScore, capacityScore, csi, coc);
    const riskPct = raw_metrics.recommendedRiskPercentage;
    
    let signal = 'go';
    let confidence = Math.max(0, Math.min(100, allocationScore || 0));
    const reason_codes = [];
    
    if (capacityScore < 30) {
      signal = 'caution';
      reason_codes.push('LOW_CAPACITY');
    }
    
    if (allocationScore < 40) {
      signal = 'no-go';
      reason_codes.push('LOW_ALLOCATION_SCORE');
    }

    if (riskPct === 0) {
      signal = 'no-go';
      reason_codes.push('ZERO_RISK_RECOMMENDED');
    } else if (riskPct >= this.maxRiskPercentage) {
      if (signal !== 'no-go') {
        signal = 'caution';
      }
      reason_codes.push('MAX_RISK_LIMIT_REACHED');
    }

    return {
      signal,
      confidence,
      reason_codes,
      raw_metrics
    };
  }

  /**
   * Calculates analytical Half-Kelly fraction with drawdown volatility dampener.
   * 
   * @param {number} winRate - Expected win rate between 0.0 and 1.0 (e.g. 0.19 for 19%)
   * @param {number} rewardRiskRatio - Payoff multiple R (e.g. 5.0 for 1:5 RR)
   * @param {number} currentDrawdown - Current portfolio drawdown between 0.0 and 1.0
   * @returns {number} Recommended risk percentage (e.g. 1.0 for 1%)
   */
  calculateHalfKellyRisk(winRate, rewardRiskRatio = 5.0, currentDrawdown = 0.0) {
    if (winRate <= 0 || rewardRiskRatio <= 0) return this.baseRiskPercentage;
    
    // Full Kelly: f* = (p * (R + 1) - 1) / R
    const fullKelly = (winRate * (rewardRiskRatio + 1) - 1) / rewardRiskRatio;
    if (fullKelly <= 0) return 0; // No positive edge detected
    
    // Half-Kelly institutional standard (converts to percentage)
    let halfKellyPct = (fullKelly / 2.0) * 100;
    
    // Drawdown dampening: reduce size if drawdown exceeds 10% to prevent volatility drag
    if (currentDrawdown > 0.10) {
      const dampener = Math.max(0.2, 1.0 - (currentDrawdown - 0.10) * 2.0);
      halfKellyPct *= dampener;
    }
    
    // Clamp to conservative bounds [0.1%, maxRiskPercentage]
    return Math.max(0.1, Math.min(this.maxRiskPercentage, halfKellyPct));
  }

  /**
   * Enforces Constitutional Anti-Martingale Law (H018 Invariant).
   * Vetoes any attempt to escalate position size following a loss.
   * 
   * @param {number} proposedRiskPct - The requested risk percentage for the incoming order
   * @param {string} lastTradeOutcome - 'WIN', 'LOSS', or 'FLAT'
   * @param {number} baseRiskPct - The baseline established risk percentage
   * @returns {Object} { allowed: boolean, reason: string|null }
   */
  validateAntiMartingaleConstraint(proposedRiskPct, lastTradeOutcome, baseRiskPct = this.baseRiskPercentage) {
    if (lastTradeOutcome === 'LOSS' && proposedRiskPct > baseRiskPct * 1.05) {
      return {
        allowed: false,
        reason: 'VETO_MARTINGALE_ESCALATION_PROHIBITED'
      };
    }
    if (proposedRiskPct > this.maxRiskPercentage) {
      return {
        allowed: false,
        reason: 'VETO_CAPACITY_VIOLATION_MAX_EXPOSURE_EXCEEDED'
      };
    }
    return { allowed: true, reason: null };
  }
}

export function calculateHalfKellyRisk(winRate, rewardRiskRatio = 5.0, currentDrawdown = 0.0) {
  const ds = new DynamicSizing();
  return ds.calculateHalfKellyRisk(winRate, rewardRiskRatio, currentDrawdown);
}

export function validateAntiMartingaleConstraint(proposedRiskPct, lastTradeOutcome, baseRiskPct) {
  const ds = new DynamicSizing();
  return ds.validateAntiMartingaleConstraint(proposedRiskPct, lastTradeOutcome, baseRiskPct);
}