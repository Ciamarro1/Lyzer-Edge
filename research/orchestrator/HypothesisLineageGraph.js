import fs from 'fs';
import path from 'path';

export class HypothesisLineageGraph {
    constructor(graphPath) {
        this.graphPath = graphPath;
        this.graph = this._loadGraph();
    }

    _loadGraph() {
        if (fs.existsSync(this.graphPath)) {
            return JSON.parse(fs.readFileSync(this.graphPath, 'utf8'));
        }
        return {
            nodes: {},
            edges: []
        };
    }

    _saveGraph() {
        fs.writeFileSync(this.graphPath, JSON.stringify(this.graph, null, 2));
    }

    /**
     * Registers a feature in the lineage graph
     */
    registerFeature(featureId, family) {
        if (!this.graph.nodes[featureId]) {
            this.graph.nodes[featureId] = { type: 'FEATURE', family, created_at: new Date().toISOString() };
            this._saveGraph();
        }
    }

    /**
     * Maps an experiment to its constituent features and records the outcome.
     */
    recordExperiment(experimentId, features, outcome, metricValue) {
        this.graph.nodes[experimentId] = {
            type: 'EXPERIMENT',
            outcome,
            metricValue,
            created_at: new Date().toISOString()
        };

        features.forEach(feature => {
            this.graph.edges.push({
                from: feature,
                to: experimentId,
                type: 'CONSTITUTES'
            });
        });

        this._saveGraph();
    }

    /**
     * Checks if a specific feature combination has already been tested and rejected.
     * Prevents re-testing the exact same structural geometry under a new name.
     */
    checkPriorFailure(features) {
        // Find all experiments that use EXACTLY these features
        const featureSet = new Set(features);
        
        const experimentFeatureMaps = {};
        this.graph.edges.forEach(edge => {
            if (edge.type === 'CONSTITUTES') {
                if (!experimentFeatureMaps[edge.to]) experimentFeatureMaps[edge.to] = new Set();
                experimentFeatureMaps[edge.to].add(edge.from);
            }
        });

        for (const [expId, expFeatures] of Object.entries(experimentFeatureMaps)) {
            if (expFeatures.size === featureSet.size && [...expFeatures].every(f => featureSet.has(f))) {
                const node = this.graph.nodes[expId];
                if (node && node.outcome === 'REJECTED') {
                    return {
                        blocked: true,
                        reason: `Feature combination already rejected in experiment ${expId}.`
                    };
                }
            }
        }

        return { blocked: false };
    }
}
