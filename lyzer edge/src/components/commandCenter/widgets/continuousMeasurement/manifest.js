export const manifest = {
  id: 'continuous-measurement-widget',
  name: 'Continuous Empirical Measurement Platform',
  version: '1.0.0',
  minRuntimeVersion: '3.9.0',
  targetPane: 'RIGHT_PANE',
  realityTag: 'INFERRED_REALITY',
  capabilities: [
    'market_data:read',
    'evidence:publish',
    'telemetry:read'
  ],
  description: 'Displays 8-category Empirical Telemetry Table, Microsecond Latency Quantiles (P50-P99.9), Environment Hardware details, and Dynamic AST Graph Coverage.'
};
