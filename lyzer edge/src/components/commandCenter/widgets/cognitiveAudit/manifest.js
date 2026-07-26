export const manifest = {
  id: 'cognitive-audit-widget',
  name: 'Cognitive Maturity & Explainable Audit',
  version: '1.0.0',
  minRuntimeVersion: '3.5.0',
  targetPane: 'RIGHT_PANE',
  realityTag: 'INFERRED_REALITY',
  capabilities: [
    'market_data:read',
    'evidence:publish',
    'telemetry:read'
  ],
  description: 'Visualizes Meta Learning weights, Evidence Attribution breakdown, Market Memory pattern matches, and Simulation Universe robustness.'
};
