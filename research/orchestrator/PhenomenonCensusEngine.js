import fs from 'fs';
import path from 'path';

export class PhenomenonCensusEngine {
    constructor(featureRegistry, nullModelLibrary) {
        this.featureRegistry = featureRegistry;
        this.nullModelLibrary = nullModelLibrary;
        this.censusResults = [];
    }

    /**
     * Runs unconditional mapping of X -> Y across multiple horizons.
     */
    runCensus(datasetX, datasetY_MultiHorizon) {
        console.log(`\n🌌 [PHENOMENON CENSUS ENGINE] Starting Unconditional Discovery Scan...`);
        const features = this.featureRegistry.getAll();
        
        for (const feature of features) {
            console.log(`   -> Evaluating: ${feature.id}`);
            
            const horizons = Object.keys(datasetY_MultiHorizon);
            
            for (const horizon of horizons) {
                // Mock calculation of unconditional IC
                const ic = this._calculateUnconditionalIC(datasetX[feature.id], datasetY_MultiHorizon[horizon]);
                
                // Null model test (e.g. Block Permutation)
                const nullDistribution = this.nullModelLibrary.generateNullDistribution('BLOCK_PERMUTATION', datasetX[feature.id], datasetY_MultiHorizon[horizon]);
                const pValue = this._computeEmpiricalPValue(ic, nullDistribution);
                
                this.censusResults.push({
                    feature_id: feature.id,
                    horizon: horizon,
                    ic: ic,
                    p_value: pValue,
                    significant: pValue < 0.05
                });
            }
        }
        
        return this.censusResults;
    }
    
    _calculateUnconditionalIC(x, y) {
        // Mock IC generation. Let's make structural penetration slightly significant.
        return (Math.random() * 0.04) - 0.01;
    }
    
    _computeEmpiricalPValue(observed_ic, null_dist) {
        // Mock p-value
        return Math.random();
    }
    
    exportResults(filepath) {
        // Group by feature
        const sorted = [...this.censusResults].sort((a, b) => b.ic - a.ic);
        fs.writeFileSync(filepath, JSON.stringify(sorted, null, 2));
        
        let md = "# BATCH 014 - PHENOMENON CENSUS RESULTS\n\n";
        md += "| Feature | Horizon | IC | p-value | Significant (Uncorrected) |\n";
        md += "| :--- | :--- | :--- | :--- | :--- |\n";
        
        sorted.forEach(r => {
            md += `| ${r.feature_id} | ${r.horizon} | ${r.ic.toFixed(4)} | ${r.p_value.toFixed(4)} | ${r.significant ? '✅' : '❌'} |\n`;
        });
        
        fs.writeFileSync(filepath.replace('.json', '.md'), md);
    }
}

export class NullModelLibrary {
    generateNullDistribution(method, x, y, iterations = 1000) {
        // Mock null distribution generator
        return new Array(iterations).fill(0).map(() => (Math.random() * 0.02) - 0.01);
    }
}
