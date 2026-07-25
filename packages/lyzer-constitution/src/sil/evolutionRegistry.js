/**
 * Semantic Evolution Registry
 * 
 * Central dictionary that defines the irreducible ontology of the system.
 * Prevents "Corruptive Drift" while allowing "Evolutionary Drift".
 */

export const evolutionRegistry = {
    Risk: {
        coreMeaning: "Possibility of permanent capital impairment.",
        allowedExtensions: [
            "Market Risk",
            "Model Risk",
            "Governance Risk",
            "Epistemic Risk"
        ],
        forbiddenMutations: [
            "Volatility",
            "Drawdown only",
            "Temporary discomfort",
            "Ignoring slippage"
        ],
        revisionHistory: [
            { version: "1.7.6", change: "Formalized foundational core meaning vs volatility." }
        ]
    },
    Edge: {
        coreMeaning: "Statistically verified predictive advantage that survives transaction costs.",
        allowedExtensions: [
            "Microstructural Edge",
            "Latency Edge",
            "Regime Conditional Edge"
        ],
        forbiddenMutations: [
            "Backtest illusion",
            "Unverified hypothesis",
            "Pre-fee profitability"
        ],
        revisionHistory: [
            { version: "1.7.6", change: "Added transaction cost survival constraint." }
        ]
    },
    Success: {
        coreMeaning: "Long term compounding of real capital with positive Reality Divergence Index.",
        allowedExtensions: [
            "Epistemic validation",
            "System survival"
        ],
        forbiddenMutations: [
            "Trade volume maximization",
            "Paper trading optimization without execution anchor"
        ],
        revisionHistory: [
            { version: "1.7.6", change: "Separated Real Capital from paper simulation." }
        ]
    }
};

/**
 * Validates if an intent represents an allowed extension or a forbidden mutation.
 * @param {string} concept - The ontological concept (e.g., 'Risk')
 * @param {string} intendedMeaning - The meaning trying to be applied
 * @returns {string} - 'ALLOWED', 'FORBIDDEN', or 'UNKNOWN'
 */
export function evaluateDrift(concept, intendedMeaning) {
    if (!evolutionRegistry[concept]) return 'UNKNOWN';

    const entry = evolutionRegistry[concept];
    
    // Check forbidden mutations
    for (let forbidden of entry.forbiddenMutations) {
        if (intendedMeaning.toLowerCase().includes(forbidden.toLowerCase())) {
            return 'FORBIDDEN';
        }
    }

    // Check allowed extensions
    for (let allowed of entry.allowedExtensions) {
        if (intendedMeaning.toLowerCase().includes(allowed.toLowerCase())) {
            return 'ALLOWED';
        }
    }

    return 'UNKNOWN';
}
