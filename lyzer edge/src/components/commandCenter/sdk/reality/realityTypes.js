// Reality Events and States for M1.4.5

export const RealityEvents = {
  TRANSITION_REQUESTED: 'reality:transition_requested',
  TRANSITION_VALIDATED: 'reality:transition_validated',
  TRANSITION_STARTED: 'reality:transition_started',
  TRANSITION_COMPLETED: 'reality:transition_completed',
  TRANSITION_FAILED: 'reality:transition_failed'
};

export const RealityStates = {
  INITIALIZING: 'INITIALIZING',
  OBSERVED: 'OBSERVED',
  RECONSTRUCTED: 'RECONSTRUCTED',
  SYNTHETIC: 'SYNTHETIC',
  DEGRADED: 'DEGRADED',
  ERROR: 'ERROR',
  RECOVERY: 'RECOVERY'
};
