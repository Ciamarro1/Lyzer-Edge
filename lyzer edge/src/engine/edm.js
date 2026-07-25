/**
 * Calculates the Epistemic Drift Momentum (EDM).
 * Inputs: epsHistory, windowSize (default 4)
 * Outputs: { edmScore, trend, warning }
 * 
 * @param {number[]} epsHistory
 * @param {number} [windowSize=4]
 * @returns {{ edmScore: number, trend: 'UPWARD'|'DOWNWARD'|'STABLE', warning: boolean }}
 */
export function calculateEDM(epsHistory, windowSize = 4) {
  if (!epsHistory || epsHistory.length < windowSize) {
    return { edmScore: 0, trend: 'STABLE', warning: false };
  }

  const recent = epsHistory.slice(-windowSize);

  // Check if strictly decreasing: recent[i] < recent[i-1]
  let strictlyDecreasing = true;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i] >= recent[i - 1]) {
      strictlyDecreasing = false;
      break;
    }
  }

  const edmScore = Math.round(Math.abs(recent[recent.length - 1] - recent[0]) * 10000) / 10000;

  let trend = 'STABLE';
  if (strictlyDecreasing) {
    trend = 'DOWNWARD';
  } else {
    let strictlyIncreasing = true;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i] <= recent[i - 1]) {
        strictlyIncreasing = false;
        break;
      }
    }
    if (strictlyIncreasing) {
      trend = 'UPWARD';
    }
  }

  const latestEps = recent[recent.length - 1];
  // Warning: trend is downward AND the latest EPS is still above the quality gate (EPS >= 0.5)
  const warning = strictlyDecreasing && latestEps >= 0.5;

  return {
    edmScore,
    trend,
    warning
  };
}
