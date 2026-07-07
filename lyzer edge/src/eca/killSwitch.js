/**
 * @fileoverview ECA Kill Switch Runtime
 * Hooks for process isolation termination.
 */

export class KillSwitch {
  /**
   * Executes a HARD termination of the Execution Engine process.
   * This is triggered by a Human Override or a catastrophic Veto.
   */
  static executeHardKill() {
    console.error('!!! CONSTITUTIONAL KILL-SWITCH ACTIVATED !!!');
    console.error('Terminating Execution Node immediately...');
    
    // In a multi-process environment, this would send SIGKILL to Process 1.
    // For local simulation, we kill the current process.
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1); 
    } else {
      // In tests, we throw a special error
      throw new Error('SYSTEM_HALT_SIGKILL_EMULATED');
    }
  }

  /**
   * Cancels all pending actions at the MIC.
   * This bypasses the Execution engine completely.
   */
  static emergencyCancelAll() {
    console.warn('[MIC GATEWAY] Sending emergency CANCEL_ALL to all endpoints.');
    // Simulated call to Exchange API
  }
}
