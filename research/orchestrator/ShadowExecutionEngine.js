/**
 * Shadow Execution Engine
 * Maps theoretical Execution Reality Gap (ERG) against L2 depth without submitting orders.
 * Strictly enforces Execution Contracts and Monotonic Clocks.
 */
export class ShadowExecutionEngine {
    constructor() {
        this.contracts = [];
        this.ergRecords = [];
    }

    /**
     * @param {Object} executionContract 
     * @param {Object} l2Snapshot 
     */
    simulateShadowExecution(executionContract, l2Snapshot) {
        // Enforce Provider Integrity
        if (!executionContract.provider_hash || executionContract.provider !== "REC_COMP_INSTITUTIONAL_v1") {
            throw new Error("K3 TRIGGERED: Invalid Provider Hash in Execution Contract");
        }

        // Monotonic Clock Extraction
        const T_signal = executionContract.timestamp;
        const T_book = l2Snapshot.timestamp;
        const T_hypothetical_fill = T_book + Math.floor(Math.random() * 50) + 10; // +10-60ms synthetic latency

        if (T_book < T_signal || T_hypothetical_fill < T_book) {
            throw new Error("K3 TRIGGERED: Monotonic Clock Violation");
        }

        const size = executionContract.requested_exposure;
        const forecast = executionContract.forecast; // Base theoretical edge
        const midPrice = (l2Snapshot.bestBid + l2Snapshot.bestAsk) / 2;
        const spreadBps = ((l2Snapshot.bestAsk - l2Snapshot.bestBid) / midPrice) * 10000;

        // 1. Calculate ERG Dimensions based on L2 Snapshot Depth
        // ERG_slippage depends on taking liquidity
        const erg_slippage = spreadBps / 2; 

        // ERG_market_impact scales with order size vs available depth
        const depthRatio = size / l2Snapshot.availableDepth10bps; 
        const erg_impact = Math.pow(depthRatio, 1.5) * 12; // Synthetically map non-linear depth impact

        // ERG_latency penalty
        const erg_latency = ((T_hypothetical_fill - T_book) / 1000) * l2Snapshot.volatilityBps;

        // ERG_adverse_selection (if bid/ask imbalance is against us)
        const imbalance = (executionContract.direction === "LONG") ? l2Snapshot.askDensity / l2Snapshot.bidDensity : l2Snapshot.bidDensity / l2Snapshot.askDensity;
        const erg_adverse = imbalance > 1.5 ? 2.5 : 0; 

        const erg_total = erg_slippage + erg_impact + erg_latency + erg_adverse;

        const netExecutableEdge = forecast - erg_total;

        // 2. Counterfactual Order Types
        const marketOrder = forecast - erg_total; // Guarantees fill, pays all ERG
        const limitOrder = forecast - erg_latency - erg_adverse; // Might miss fill (ERG_fill_prob)
        const fillProb = limitOrder > 0 ? l2Snapshot.fillProbability : 0;

        const record = {
            id: executionContract.decision_id,
            compression_state: executionContract.compression_state,
            size,
            l2_spread: spreadBps,
            erg_slippage,
            erg_impact,
            erg_latency,
            erg_adverse,
            erg_total,
            gross_edge: forecast,
            net_executable_edge: netExecutableEdge,
            counterfactuals: {
                market_edge: marketOrder,
                limit_expected_value: limitOrder * fillProb
            }
        };

        this.ergRecords.push(record);
        return record;
    }

    calculateDistribution() {
        const total = this.ergRecords.length;
        if (total === 0) return null;

        const sortedNet = this.ergRecords.map(r => r.net_executable_edge).sort((a, b) => a - b);
        
        return {
            count: total,
            avgNetEdge: sortedNet.reduce((a, b) => a + b, 0) / total,
            medianNetEdge: sortedNet[Math.floor(total / 2)],
            tail5thNetEdge: sortedNet[Math.floor(total * 0.05)],
            tail95thNetEdge: sortedNet[Math.floor(total * 0.95)],
            avgErgSlippage: this.ergRecords.reduce((sum, r) => sum + r.erg_slippage, 0) / total,
            avgErgImpact: this.ergRecords.reduce((sum, r) => sum + r.erg_impact, 0) / total,
            avgErgAdverse: this.ergRecords.reduce((sum, r) => sum + r.erg_adverse, 0) / total
        };
    }
}
