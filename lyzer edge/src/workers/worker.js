import { buildTransitionGraph, findFrequentSequences } from '../engine/patterndiscovery.js';
import { calculateTimeWeights, calculateDecayedExpectancy, calculateEdgeSlope } from '../engine/decay.js';
import { ReplayEngine } from '../engine/replay.js';
import { analyzeBehavior } from '../engine/behavior.js';

// Generic task router for Lyzer Edge Analyst
self.onmessage = async (event) => {
  const { id, action, payload } = event.data;

  try {
    let result = null;

    if (action === 'ANALYTICS_TASK') {
      const { task, data } = payload;
      
      switch (task) {
        case 'RUN_MONTE_CARLO':
          // TODO: Implement actual Monte Carlo logic
          result = { status: 'success', task, data };
          break;

        case 'RUN_RISK_ANALYSIS':
          // TODO: Implement actual Risk Analysis logic
          result = { status: 'success', task, data };
          break;

        case 'RUN_PATTERN_DISCOVERY':
          result = {
            transitionGraph: buildTransitionGraph(data.trades || []),
            frequentSequences: findFrequentSequences(data.trades || [], data.sequenceLength || 3, data.minSupport || 0.1)
          };
          break;

        case 'RUN_EDGE_RECALC':
          // TODO: Implement actual Edge Recalc logic
          result = { status: 'success', task, data };
          break;

        case 'RUN_OUTLIER_SCAN':
          // TODO: Implement actual Outlier Scan logic
          result = { status: 'success', task, data };
          break;
          
        case 'RUN_DECAY':
          result = {
            timeWeights: calculateTimeWeights(data.trades || [], data.halfLife || 50),
            decayedExpectancy: calculateDecayedExpectancy(data.trades || [], data.halfLife || 50),
            edgeSlope: calculateEdgeSlope(data.trades || [], data.windowSize || 30)
          };
          break;

        case 'RUN_REPLAY': {
          const engine = new ReplayEngine(data.trades || []);
          if (data.currentIndex !== undefined) {
             engine.currentIndex = data.currentIndex;
          }
          
          if (data.action === 'next') {
            engine.next();
          } else if (data.action === 'prev') {
            engine.prev();
          } else if (data.action === 'reset') {
            engine.reset();
          }
          
          result = {
            currentIndex: engine.currentIndex,
            current: engine.current(),
            replayedTrades: engine.getReplayedTrades(),
            progress: engine.getProgress(),
            isFinished: engine.isFinished()
          };
          break;
        }

        case 'RUN_BEHAVIOR':
          result = analyzeBehavior(data.trades || []);
          break;

        default:
          throw new Error(`Unknown analytics task: ${task}`);
      }
    } else {
      throw new Error(`Unknown action type: ${action}`);
    }

    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message });
  }
};
 