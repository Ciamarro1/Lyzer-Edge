export const manifest = {
  id: 'evidence-fusion-widget',
  name: 'Evidence Fusion & Bayesian Ranking',
  version: '1.0.0',
  minRuntimeVersion: '3.5.0',
  targetPane: 'RIGHT_PANE',
  realityTag: 'INFERRED_REALITY',
  capabilities: [
    'market_data:read',
    'evidence:publish',
    'telemetry:read'
  ],
  description: 'Visualizes dynamic Bayesian evidence weights, posterior scores, and ranked hypotheses.'
};
