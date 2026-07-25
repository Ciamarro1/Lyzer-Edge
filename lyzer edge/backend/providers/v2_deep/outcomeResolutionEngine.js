import { getPendingTrades, updateTradeResolution } from './tradeMemoryRegistry.js';
import { recordLesson } from './lessonRegistry.js';

/**
 * CIA Mandated Error Taxonomy
 */
const ErrorTaxonomy = {
    TREND_REVERSAL: 'TREND_REVERSAL',
    REGIME_SHIFT: 'REGIME_SHIFT',
    OVERCONFIDENCE: 'OVERCONFIDENCE',
    UNDERCONFIDENCE: 'UNDERCONFIDENCE',
    NOISE_MISCLASSIFICATION: 'NOISE_MISCLASSIFICATION',
    TIMING_ERROR: 'TIMING_ERROR',
    FEATURE_FAILURE: 'FEATURE_FAILURE',
    UNKNOWN: 'UNKNOWN'
};

function classifyError(trade, actual_direction) {
    if (trade.expected_direction === actual_direction) {
        return null; // No error if direction was correct
    }

    const { confidence, rdm_state, causal_state } = trade;

    if (confidence > 0.8) {
        if (rdm_state === 'DIVERGENT' || rdm_state === 'CHAOS') return ErrorTaxonomy.REGIME_SHIFT;
        return ErrorTaxonomy.OVERCONFIDENCE;
    }
    
    if (confidence < 0.4 && causal_state.includes('Entropy')) {
        return ErrorTaxonomy.NOISE_MISCLASSIFICATION;
    }

    // Default heuristics
    if (Math.abs(trade.entry_price - trade.current_close) < (trade.entry_price * 0.001)) {
        return ErrorTaxonomy.TIMING_ERROR;
    }

    return ErrorTaxonomy.TREND_REVERSAL;
}

function generateLesson(trade, error_type, confidence_error) {
    if (!error_type) {
        return `Hypothesis confirmed. Confidence Error: ${confidence_error.toFixed(4)}.`;
    }
    
    switch (error_type) {
        case ErrorTaxonomy.REGIME_SHIFT:
            return `Model failed to anticipate regime shift (RDM: ${trade.rdm_state}). Expected ${trade.expected_direction} but got opposite.`;
        case ErrorTaxonomy.OVERCONFIDENCE:
            return `Severe overconfidence (${trade.confidence.toFixed(2)}) in a non-conducive causal state (${trade.causal_state}).`;
        case ErrorTaxonomy.TIMING_ERROR:
            return `Horizon (${trade.forecast_horizon} candles) was insufficient or mistimed. Minimal price deviation.`;
        case ErrorTaxonomy.NOISE_MISCLASSIFICATION:
            return `False positive due to high entropy noise.`;
        default:
            return `Epistemic failure: ${error_type} with confidence error ${confidence_error.toFixed(4)}.`;
    }
}

/**
 * Outcome Resolution Engine (ORE)
 * Evaluates pending trades based STRICTLY on the forecast_horizon.
 * @param {Object} currentCandle 
 * @param {Number} currentIndex 
 */
export function resolvePendingTrades(currentCandle, currentIndex) {
    const pendingTrades = getPendingTrades();

    pendingTrades.forEach(trade => {
        // Horizon-Aware Resolution
        if (currentIndex >= trade.entry_index + trade.forecast_horizon) {
            
            const actual_direction = currentCandle.close >= trade.entry_price ? 'UP' : 'DOWN';
            const success = trade.expected_direction === actual_direction;
            
            const confidence_error = Math.abs(trade.confidence - (success ? 1 : 0));
            
            trade.current_close = currentCandle.close; // attach for classification
            const error_type = classifyError(trade, actual_direction);
            const lesson = generateLesson(trade, error_type, confidence_error);

            // Update Memory Registry
            updateTradeResolution(trade.id, {
                actual_direction,
                confidence_error,
                error_type: error_type || 'NONE',
                lesson
            });

            // Send to Batch Learning Registry
            recordLesson({
                trade_id: trade.id,
                signal: trade.signal,
                confidence: trade.confidence,
                confidence_error,
                error_type: error_type || 'NONE',
                lesson,
                causal_state: trade.causal_state,
                rdm_state: trade.rdm_state
            });
        }
    });
}
