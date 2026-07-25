import { RSISClassifier } from './rsis_classifier.js';
import { RegimeConditioner } from './regime_conditioner.js';
import { Arbitrator } from './arbitrator.js';

// Mocks for provider imports (In actual implementation, these would be the loaded plugin classes)
import { arlEngineInstance as v1FastEngine } from './providers/v1_fast/streamEngine.js';
// We assume v2 deep engine exposes a similar interface
import { arlEngineInstance as v2DeepEngine } from './providers/v2_deep/streamEngine.js';

/**
 * CPS-1.1 Router Layer
 * 
 * Main entrypoint for the Cognitive Ensemble System.
 */
export class CognitiveEnsembleRouter {
    constructor() {
        this.rsis = new RSISClassifier();
        this.conditioner = new RegimeConditioner();
        this.arbitrator = new Arbitrator();
        this.mode = this._parseCliMode();
    }

    _parseCliMode() {
        const args = process.argv.slice(2);
        const providerArg = args.find(a => a.startsWith('--provider='));
        return providerArg ? providerArg.split('=')[1] : 'auto'; // auto | v1 | v2 | hybrid
    }

    /**
     * Executes a tick of the cognitive ensemble system.
     * @param {Object} marketState - Current state from live feed 
     */
    async executeTick(marketState) {
        let v1Output = null;
        let v2Output = null;

        if (this.mode === 'v1' || this.mode === 'hybrid' || this.mode === 'auto') {
            v1Output = await this._runV1(marketState);
        }

        if (this.mode === 'v2' || this.mode === 'hybrid' || this.mode === 'auto') {
            v2Output = await this._runV2(marketState);
        }

        // Static Domination Modes
        if (this.mode === 'v1') return v1Output;
        if (this.mode === 'v2') return v2Output;

        // Ensemble Modes
        let weights;
        if (this.mode === 'hybrid') {
            // Deprecated: Static hybrid weights (Averaging Bias)
            weights = { w1: 0.5, w2: 0.5 };
        } else {
            // AUTO MODE (CPS-1.1 Regime Conditioned Control)
            const regime = this.rsis.classify(marketState);
            weights = this.conditioner.getWeights(regime);
        }

        return this.arbitrator.arbitrate(v1Output, v2Output, weights);
    }

    async _runV1(state) {
        // Wrap V1 stream execution
        // Example output
        return { value: state.stressLevel || 0, confidence: 0.9 };
    }

    async _runV2(state) {
        // Wrap V2 stream execution (deep memory, confidence validation)
        return { value: state.stressLevel || 0, confidence: 0.8 };
    }
}
