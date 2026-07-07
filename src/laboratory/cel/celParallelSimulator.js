/**
 * Counterfactual Evaluation Layer (CEL) - Parallel Simulator
 * Executes a mutated branch in parallel to a baseline over identical data streams.
 * Captures and returns divergent states.
 */
class CELParallelSimulator {
    constructor(baselineFn, mutatedFn) {
        this.baselineFn = baselineFn;
        this.mutatedFn = mutatedFn;
    }

    async simulate(dataPayloads) {
        const results = {
            totalEvaluated: 0,
            divergencesCount: 0,
            divergentStates: [],
            identicalStates: []
        };

        const promises = dataPayloads.map(async (record, index) => {
            try {
                // Execute in parallel
                const [baselineOutput, mutatedOutput] = await Promise.all([
                    this.baselineFn(record),
                    this.mutatedFn(record)
                ]);

                const isIdentical = JSON.stringify(baselineOutput) === JSON.stringify(mutatedOutput);

                if (!isIdentical) {
                    return {
                        index,
                        record,
                        baselineOutput,
                        mutatedOutput,
                        status: 'DIVERGENT'
                    };
                }

                return { index, status: 'IDENTICAL' };
            } catch (error) {
                 return {
                    index,
                    record,
                    error: error.message,
                    status: 'ERROR'
                };
            }
        });

        const evaluated = await Promise.all(promises);

        for (const evalResult of evaluated) {
            results.totalEvaluated++;
            if (evalResult.status === 'DIVERGENT') {
                results.divergencesCount++;
                results.divergentStates.push(evalResult);
            } else if (evalResult.status === 'IDENTICAL') {
                 results.identicalStates.push(evalResult);
            }
        }

        return results;
    }
}

module.exports = CELParallelSimulator;
