import { ScaleNormalizer } from "../../packages/lyzer-shared/src/csrl/ScaleNormalizer.js";
import { CrossScaleTensorGraph } from "../../packages/lyzer-shared/src/csrl/CrossScaleTensorGraph.js";
import { CausalMemoryDB } from './db.js';

/**
 * Dual Reality Divergence Monitor (Phase 6)
 * Compares the Live "Sensory" Reality (noisy, unclosed candles) with the 
 * Historical "Causal Memory" Reality (perfectly formed baseline) to detect 
 * Temporal Leakage and Structural Hallucinations (LHDS).
 */
export class DualRealityMonitor {
    constructor() {
        this.scaleNormalizer = new ScaleNormalizer();
        this.cstg = new CrossScaleTensorGraph();
        this.db = new CausalMemoryDB();
        
        // Caching historical topologies to prevent DB spam on every tick
        this.historicalCache = new Map(); 
    }

    /**
     * Compute Live-Historical Divergence Score (LHDS)
     * @param {string} symbol - Asset symbol (e.g. BTCUSDT)
     * @param {number} currentMs - Current timestamp in MS
     * @param {Object} liveMtfState - The unclosed live candle arrays
     * @returns {Promise<number>} LHDS score between 0.0 and 1.0
     */
    async calculateDivergence(symbol, currentMs, liveMtfState) {
        // 1. Build Live Topology
        const liveTensors = {};
        for (const tf of ['1m', '5m', '15m', '1h', '4h', '1d']) {
            if (liveMtfState[tf]) {
                liveTensors[tf] = this.scaleNormalizer.normalize(liveMtfState[tf]);
            }
        }
        const liveTopology = this.cstg.buildTopology(liveTensors);

        // 2. Build Historical Topology (The Baseline)
        // We round down to the nearest hour to fetch the nearest "stable" historical structure
        const anchorMs = currentMs - (currentMs % 3600000); 
        const cacheKey = `${symbol}_${anchorMs}`;
        
        let historicalTopology = this.historicalCache.get(cacheKey);

        if (!historicalTopology) {
            // Reconstruct causal memory from SQLite
            const histMtfState = {};
            for (const tf of ['1m', '5m', '15m', '1h', '4h', '1d']) {
                histMtfState[tf] = await this.db.getVisibleHistory(symbol, tf, anchorMs, 100);
            }
            
            const histTensors = {};
            for (const tf of ['1m', '5m', '15m', '1h', '4h', '1d']) {
                histTensors[tf] = this.scaleNormalizer.normalize(histMtfState[tf]);
            }
            historicalTopology = this.cstg.buildTopology(histTensors);
            
            // Manage cache size
            if (this.historicalCache.size > 10) {
                const oldestKey = this.historicalCache.keys().next().value;
                this.historicalCache.delete(oldestKey);
            }
            this.historicalCache.set(cacheKey, historicalTopology);
        }

        // 3. Compute Distance between Topologies
        return this.computeTopologicalDistance(liveTopology, historicalTopology);
    }

    computeTopologicalDistance(live, hist) {
        if (!live || !hist || live.edges.length === 0 || hist.edges.length === 0) return 0;

        let maxDiff = 0;

        // Compare edge distances (correlation mappings) between scales
        for (let i = 0; i < live.edges.length; i++) {
            const liveEdge = live.edges[i];
            const histEdge = hist.edges.find(e => e.from === liveEdge.from && e.to === liveEdge.to);
            
            if (histEdge) {
                const diff = Math.abs(liveEdge.distance - histEdge.distance);
                if (diff > maxDiff) {
                    maxDiff = diff;
                }
            }
        }

        // Return the maximum topological divergence across any cross-scale link
        // Normalize 0 to 1
        return Math.min(1.0, Math.max(0.0, maxDiff));
    }
    
    close() {
        this.db.close();
    }
}
