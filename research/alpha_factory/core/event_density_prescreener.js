/**
 * ALPHA FACTORY — STAGE 0: EVENT DENSITY & FEASIBILITY PRE-SCREENER
 * Module: event_density_prescreener.js
 * 
 * Objective: Fast-fail (< 100ms) any hypothesis cell before simulation or bootstrap.
 * Rejects cells that suffer from structural event density scarcity or severe microstructural friction.
 */

export class EventDensityPreScreener {
  /**
   * Evaluates raw event density and feasibility ratio across datasets.
   * 
   * @param {Object} datasetStore Map of symbol -> { candles, ind, extremes }
   * @param {Array<string>} targetAssets List of assets to scan
   * @param {string} timeframe Timeframe to evaluate
   * @param {Function} eventDetectorFn (candles, ind, extremes, t) => { isEvent: boolean, rRaw: number, cNow: number }
   * @param {Object} options Configuration thresholds
   * @returns {Object} Prescreen verdict and metrics
   */
  static prescreen(datasetStore, targetAssets, timeframe, eventDetectorFn, options = {}) {
    const nMin = options.nMin || 60;
    const floor80bpsRate = options.floorRate || 0.0080; // 80 bps

    let totalRawEvents = 0;
    let viableEvents = 0;
    let infeasibleEvents = 0;
    const monthlyHistogram = new Map();

    const startTime = Date.now();

    for (const sym of targetAssets) {
      const assetData = datasetStore[sym] && datasetStore[sym][timeframe];
      if (!assetData) continue;

      const { candles, ind, extremes } = assetData;
      const n = candles.length;

      for (let t = 72; t < n; t++) {
        const detection = eventDetectorFn(candles, ind, extremes, t);
        if (detection && detection.isEvent) {
          totalRawEvents++;
          const cNow = detection.cNow || candles[t].close;
          const rRaw = detection.rRaw;
          const floor = floor80bpsRate * cNow;

          // Track calendar month
          const monthKey = new Date(candles[t].timestamp).toISOString().slice(0, 7);
          monthlyHistogram.set(monthKey, (monthlyHistogram.get(monthKey) || 0) + 1);

          if (rRaw < floor) {
            infeasibleEvents++;
          } else {
            viableEvents++;
          }
        }
      }
    }

    const elapsedMs = Date.now() - startTime;
    const viableRatio = totalRawEvents > 0 ? Number((viableEvents / totalRawEvents).toFixed(3)) : 0;
    const passStage0 = viableEvents >= nMin;

    let failReason = null;
    if (!passStage0) {
      if (totalRawEvents < nMin) {
        failReason = `STRUCTURAL_EVENT_SCARCITY: Total raw events (${totalRawEvents}) < N_min (${nMin})`;
      } else {
        failReason = `FRICTION_FLOOR_ATTRITION: ${infeasibleEvents}/${totalRawEvents} events (< 80 bps) leaving only ${viableEvents} viable events (< N_min ${nMin})`;
      }
    }

    return {
      passStage0,
      failReason,
      nMin,
      totalRawEvents,
      viableEvents,
      infeasibleEvents,
      viableRatio,
      elapsedMs,
      monthlyDistribution: Object.fromEntries(monthlyHistogram)
    };
  }
}
