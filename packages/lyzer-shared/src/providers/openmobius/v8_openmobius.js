import { findSwings } from './pivots.js';
import { analyzeStructure } from './structure.js';
import { find_fvgs, find_displacements, find_volume_anomalies } from './imbalance.js';
import { find_sweeps } from './liquidity.js';
import { find_order_blocks } from './orderBlocks.js';
import { analyze_dealing_range } from './location.js';

export class OpenMobiusEngine {
    constructor() {
        this.version = "8.0.0";
    }

    /**
     * Extracts pure evidence (STRUCTURAL STATE) from candles without emitting trading signals.
     * @param {Array} candles - Array of candle objects {open, high, low, close, volume, is_bullish}
     * @returns {Object} STRUCTURAL STATE
     */
    analyze(candles) {
        if (!candles || candles.length === 0) {
            return this._getEmptyState();
        }

        // Add is_bullish helper property if it's missing
        const processedCandles = candles.map(c => ({
            ...c,
            is_bullish: c.close >= c.open
        }));

        const pivots = findSwings(processedCandles);
        const marketStructure = analyzeStructure(pivots);
        
        const fvgs = find_fvgs(processedCandles);
        const displacements = find_displacements(processedCandles);
        const volumeAnomalies = find_volume_anomalies(processedCandles);
        
        const sweeps = find_sweeps(processedCandles, pivots);
        const orderBlocks = find_order_blocks(processedCandles);
        const location = analyze_dealing_range(processedCandles);

        // Compute a high-level bias based on market structure sequence
        let bias = "FLAT";
        if (marketStructure.events && marketStructure.events.length > 0) {
            const lastEvent = marketStructure.events[marketStructure.events.length - 1];
            if (lastEvent.type === "BOS" || lastEvent.type === "CHoCH") {
                bias = lastEvent.direction === "bullish" ? "BULLISH" : "BEARISH";
            }
        }

        return {
            version: this.version,
            bias,
            marketStructure,
            liquidity: { sweeps },
            imbalance: { fvgs, displacements, volumeAnomalies },
            orderBlocks,
            location,
            pivots
        };
    }

    _getEmptyState() {
        return {
            version: this.version,
            bias: "FLAT",
            marketStructure: { sequence: [], events: [] },
            liquidity: { sweeps: [] },
            imbalance: { fvgs: [], displacements: [], volumeAnomalies: [] },
            orderBlocks: [],
            location: { premium: false, discount: false, equilibrium: 0 },
            pivots: []
        };
    }
}
