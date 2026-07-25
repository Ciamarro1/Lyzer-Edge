let workerInstance = null;
let messageIdCounter = 0;
const pendingPromises = new Map();

function getWorker() {
  if (!workerInstance) {
    // Initialize native Web Worker using Vite standard syntax
    workerInstance = new Worker(new URL('../workers/worker.js', import.meta.url), { type: 'module' });
    
    workerInstance.onmessage = (event) => {
      const { id, success, result, error } = event.data;
      const deferred = pendingPromises.get(id);
      
      if (deferred) {
        if (success) {
          deferred.resolve(result);
        } else {
          deferred.reject(new Error(error));
        }
        pendingPromises.delete(id);
      }
    };
    
    workerInstance.onerror = (error) => {
      console.error('Web Worker encountered an error:', error);
    };
  }
  
  return workerInstance;
}

/**
 * Promise-based wrapper around the native Web Worker.
 * 
 * @param {string} action - The action to perform (e.g., 'RUN_MONTE_CARLO')
 * @param {any} payload - The data to pass to the worker
 * @returns {Promise<any>}
 */
export async function runWorkerTask(task, payload) {
  const worker = getWorker();
  const id = ++messageIdCounter;
  
  return new Promise((resolve, reject) => {
    pendingPromises.set(id, { resolve, reject });
    worker.postMessage({ 
      id, 
      action: 'ANALYTICS_TASK', 
      payload: { task, data: payload } 
    });
  });
}
 