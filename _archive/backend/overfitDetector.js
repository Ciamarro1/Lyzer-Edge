/**
 * ARL v2 Overfitting Detector
 * Analyzes returns to distinguish true alpha from statistical overfit.
 */

export class OverfitDetector {
  detect(trades) {
    if (trades.length < 6) {
      return { overfitScore: 0.1, status: "CLEAN" }; // clean until proven otherwise
    }

    // 1. IS vs OOS comparison (In-sample vs Out-of-sample)
    const mid = Math.floor(trades.length / 2);
    const isTrades = trades.slice(0, mid);
    const oosTrades = trades.slice(mid);

    const isMean = isTrades.reduce((s, t) => s + t.netPnl, 0) / isTrades.length;
    const oosMean = oosTrades.reduce((s, t) => s + t.netPnl, 0) / oosTrades.length;

    // Degradation factor (lower OOS pnl increases overfit risk)
    const degradation = isMean > 0 ? Math.max(0, (isMean - oosMean) / isMean) : 0;

    // 2. Return stability across chunks (lookback variance)
    const chunkSize = Math.max(1, Math.floor(trades.length / 4));
    const chunkMeans = [];
    for (let c = 0; c < 4; c++) {
      const chunk = trades.slice(c * chunkSize, (c + 1) * chunkSize);
      if (chunk.length > 0) {
        chunkMeans.push(chunk.reduce((s, t) => s + t.netPnl, 0) / chunk.length);
      }
    }
    const avgChunkMean = chunkMeans.reduce((a, b) => a + b, 0) / chunkMeans.length;
    const chunkVariance = chunkMeans.reduce((s, m) => s + Math.pow(m - avgChunkMean, 2), 0) / chunkMeans.length;
    const chunkVolatility = Math.sqrt(chunkVariance);

    const sensitivity = avgChunkMean !== 0 ? Math.min(1.0, chunkVolatility / Math.abs(avgChunkMean)) : 1.0;

    // Overfit score [0.0 - 1.0]
    const overfitScore = Math.min(1.0, degradation * 0.4 + sensitivity * 0.6);

    return {
      overfitScore: Number(overfitScore.toFixed(2)),
      status: overfitScore > 0.8 ? "OVERFITTED" : "CLEAN"
    };
  }
}
