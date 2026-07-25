/**
 * Goal Mutation Detector
 * 
 * Specifically monitors the "Success" concept to ensure the system 
 * doesn't optimize for a weak proxy (Success Rewriting).
 */

import { evaluateDrift } from './evolutionRegistry.js';

export class GoalMutationDetector {
    /**
     * Validates if the objective function metrics represent true success.
     * @param {string[]} objectiveMetrics - E.g. ['Maximize win rate', 'Ignore transaction costs']
     * @returns {boolean} True if safe, False if mutated
     */
    isGoalMutated(objectiveMetrics) {
        for (let metric of objectiveMetrics) {
            const result = evaluateDrift('Success', metric);
            if (result === 'FORBIDDEN') {
                return true;
            }
        }
        return false;
    }
}
