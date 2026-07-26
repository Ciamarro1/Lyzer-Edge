export const manifest = {
  id: 'alpha-discovery-widget',
  name: 'Empirical Alpha Discovery & Research Scheduler',
  version: '1.0.0',
  minRuntimeVersion: '3.7.0',
  targetPane: 'RIGHT_PANE',
  realityTag: 'INFERRED_REALITY',
  capabilities: [
    'market_data:read',
    'evidence:publish',
    'telemetry:read'
  ],
  description: 'Displays Net Alpha metrics (IR, t-stat), 8-Stage Graduation Pipeline, 24/7 Research Scheduler, and Hypothesis Falsification stats.'
};
