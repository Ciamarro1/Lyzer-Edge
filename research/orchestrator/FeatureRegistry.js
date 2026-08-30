import fs from 'fs';
import path from 'path';

/**
 * FeatureRegistry is the central catalog of all atomic mathematical observations 
 * extracted from legacy Human Priors (V1-V8) and new discoveries.
 */
export class FeatureRegistry {
    constructor() {
        this.features = new Map();
    }

    /**
     * @param {Object} definition 
     * { id, family, mathematical_definition, units, normalization, dependencies, minimum_history, causal_timestamp, leakage_status, stationarity_properties, source_lineage }
     */
    register(definition) {
        if (this.features.has(definition.id)) {
            throw new Error(`Feature ${definition.id} already exists in the registry.`);
        }
        
        // Ensure no human interpretative language
        const restrictedTerms = ['BUY', 'SELL', 'LONG', 'SHORT', 'bullish', 'bearish', 'target', 'stop'];
        const textToAudit = JSON.stringify(definition).toUpperCase();
        for (const term of restrictedTerms) {
            if (textToAudit.includes(term.toUpperCase())) {
                throw new Error(`Feature ${definition.id} rejected. Contains prohibited human interpretative term: ${term}`);
            }
        }

        this.features.set(definition.id, definition);
    }

    getFeature(id) {
        return this.features.get(id);
    }

    getAll() {
        return Array.from(this.features.values());
    }

    exportCatalog(filepath) {
        const catalog = this.getAll();
        fs.writeFileSync(filepath, JSON.stringify(catalog, null, 2));
    }
}
