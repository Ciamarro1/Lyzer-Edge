/**
 * Lyzer Edge - Pattern Discovery (Graph)
 */

/**
 * Builds a Markov transition graph from discrete trade states (e.g., W, L).
 * 
 * @param {Array<{rMultiple: number}>} trades 
 * @returns {Object} Transition probability graph
 */
export function buildTransitionGraph(trades) {
  if (!trades || trades.length < 2) return {};

  const graph = {
    nodes: ['W', 'L'],
    transitions: {
      'W': { 'W': 0, 'L': 0, total: 0 },
      'L': { 'W': 0, 'L': 0, total: 0 }
    },
    probabilities: {
      'W': { 'W': 0, 'L': 0 },
      'L': { 'W': 0, 'L': 0 }
    }
  };

  const getState = (r) => r > 0 ? 'W' : 'L';

  for (let i = 0; i < trades.length - 1; i++) {
    const currentState = getState(trades[i].rMultiple);
    const nextState = getState(trades[i + 1].rMultiple);

    graph.transitions[currentState][nextState]++;
    graph.transitions[currentState].total++;
  }

  // Calculate probabilities
  ['W', 'L'].forEach(state => {
    const total = graph.transitions[state].total;
    if (total > 0) {
      graph.probabilities[state]['W'] = graph.transitions[state]['W'] / total;
      graph.probabilities[state]['L'] = graph.transitions[state]['L'] / total;
    }
  });

  return graph;
}

/**
 * Discovers frequent sequences of R-multiple outcomes.
 * 
 * @param {Array<{rMultiple: number}>} trades 
 * @param {number} sequenceLength 
 * @param {number} minSupport (0-1) Minimum frequency to consider significant
 * @returns {Array<{sequence: string, count: number, frequency: number}>}
 */
export function findFrequentSequences(trades, sequenceLength = 3, minSupport = 0.1) {
  if (!trades || trades.length < sequenceLength) return [];

  const getState = (r) => r > 0 ? 'W' : 'L';
  const sequenceCounts = {};
  let totalSequences = 0;

  for (let i = 0; i <= trades.length - sequenceLength; i++) {
    const seq = trades.slice(i, i + sequenceLength).map(t => getState(t.rMultiple)).join('-');
    sequenceCounts[seq] = (sequenceCounts[seq] || 0) + 1;
    totalSequences++;
  }

  const results = [];
  for (const [sequence, count] of Object.entries(sequenceCounts)) {
    const frequency = count / totalSequences;
    if (frequency >= minSupport) {
      results.push({ sequence, count, frequency });
    }
  }

  return results.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Calculates Pearson correlation coefficient between two arrays of numbers.
 */
function calculatePearson(x, y) {
  if (x.length !== y.length || x.length < 2) return 0;
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);

  const num = (n * sumXY) - (sumX * sumY);
  const den = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
  
  if (den === 0) return 0;
  return num / den;
}

/**
 * Builds a dynamic correlation matrix grouped by Regime and Volatility.
 * Calculates mathematical correlation between entities (assets, setups) to prevent false diversification.
 * 
 * @param {Array<Object>} trades 
 * @param {string} dimension - The dimension to correlate, e.g., 'symbol' or 'setup'
 * @returns {Object} Correlation matrix organized by Context -> Dim1 -> Dim2
 */
export function buildDynamicCorrelationMatrix(trades, dimension = 'symbol') {
  if (!trades || trades.length === 0) return {};

  // Group trades by Context (Regime + Volatility) and Time (e.g., date string)
  const contextGroups = {};

  for (const t of trades) {
    const regime = t.regime || 'Global';
    const volatility = t.volatility || 'Normal';
    
    // Evaluate dynamically by REGIME and VOLATILITY
    const contexts = [
        `${regime}_${volatility}`, // Dynamic Context
        'Global_Global'            // Baseline Global Context
    ];

    const timeKey = t.entryDate ? new Date(t.entryDate).toISOString().split('T')[0] : 'NoDate';
    const dimValue = t[dimension] || 'Unknown';

    for (const ctx of contexts) {
        if (!contextGroups[ctx]) {
            contextGroups[ctx] = {};
        }

        if (!contextGroups[ctx][timeKey]) {
            contextGroups[ctx][timeKey] = {};
        }

        if (!contextGroups[ctx][timeKey][dimValue]) {
            contextGroups[ctx][timeKey][dimValue] = 0;
        }
        
        // Sum rMultiple for the dimension on that day
        contextGroups[ctx][timeKey][dimValue] += (t.rMultiple || 0);
    }
  }

  const result = {};

  for (const [context, timeMap] of Object.entries(contextGroups)) {
      // Find all unique dimension values in this context
      const dimValues = new Set();
      for (const timeKey in timeMap) {
          for (const d in timeMap[timeKey]) dimValues.add(d);
      }

      const dims = Array.from(dimValues);
      result[context] = {};

      for (let i = 0; i < dims.length; i++) {
          result[context][dims[i]] = {};
          for (let j = 0; j < dims.length; j++) {
              if (i === j) {
                  result[context][dims[i]][dims[j]] = 1;
                  continue;
              }

              // Build arrays to correlate
              const x = [];
              const y = [];
              
              for (const timeKey in timeMap) {
                  const val1 = timeMap[timeKey][dims[i]] || 0;
                  const val2 = timeMap[timeKey][dims[j]] || 0;
                  
                  // Include if at least one side traded that day to capture correlation
                  if (val1 !== 0 || val2 !== 0) {
                      x.push(val1);
                      y.push(val2);
                  }
              }

              result[context][dims[i]][dims[j]] = calculatePearson(x, y);
          }
      }
  }

  return result;
}
 