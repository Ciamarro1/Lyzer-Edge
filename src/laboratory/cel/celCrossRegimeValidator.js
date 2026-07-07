/**
 * @module celCrossRegimeValidator
 * @description Counterfactual Evaluation Layer (CEL) - Cross-Regime Validator.
 * Evaluates the stability of a mutation across 7 distinct market/data regimes.
 * 
 * Target Regimes:
 * 1. Trend
 * 2. Range
 * 3. Whipsaw
 * 4. Crash
 * 5. Recovery
 * 6. Semantic Corruption
 * 7. Unknown Unknown
 */

'use strict';

const REQUIRED_REGIMES = [
  'Trend',
  'Range',
  'Whipsaw',
  'Crash',
  'Recovery',
  'Semantic Corruption',
  'Unknown Unknown'
];

/**
 * Validates a mutation's stability across the 7 required regimes.
 * 
 * @param {Object|Function} mutation - The mutation strategy. Must be a function or expose an evaluate() method.
 * @param {Object} regimesData - A map where keys are regime names and values are the corresponding simulation data.
 * @returns {Object} Evaluation results containing the CRS score.
 */
function validateCrossRegimeStability(mutation, regimesData) {
  if (!mutation) {
    throw new Error('Mutation parameter is required.');
  }

  if (!regimesData || typeof regimesData !== 'object') {
    throw new Error('regimesData must be an object mapping regimes to their data.');
  }

  let survivedCount = 0;
  const survivalDetails = {};

  for (const regime of REQUIRED_REGIMES) {
    const data = regimesData[regime];
    let survived = false;

    try {
      if (typeof mutation.evaluate === 'function') {
        survived = mutation.evaluate(data, regime);
      } else if (typeof mutation === 'function') {
        survived = mutation(data, regime);
      } else {
        throw new Error('Mutation must be a function or provide an evaluate() method.');
      }
      
      // Ensure survived is strictly boolean
      survived = Boolean(survived);
    } catch (err) {
      // If the mutation throws an error in a regime, it failed to survive
      survived = false;
    }

    survivalDetails[regime] = survived;
    if (survived) {
      survivedCount++;
    }
  }

  // Cross-Regime Stability (CRS) Scoring
  // Constraint: If mutation only survives in 1 regime (overfitting), CRS = 0.
  let crs = 0;
  if (survivedCount > 1) {
    crs = survivedCount / REQUIRED_REGIMES.length;
  }

  return {
    crs: Number(crs.toFixed(4)), // Normalize to 4 decimal places
    survivedCount,
    totalRegimes: REQUIRED_REGIMES.length,
    survivalDetails,
    isOverfitted: survivedCount === 1,
    isFragile: survivedCount === 0
  };
}

module.exports = {
  validateCrossRegimeStability,
  REQUIRED_REGIMES
};
