export const manifest = {
  id: 'research-lab-widget',
  name: 'Quantitative Research Lab & Strategy Genome',
  version: '1.0.0',
  minRuntimeVersion: '3.5.0',
  targetPane: 'RIGHT_PANE',
  realityTag: 'INFERRED_REALITY',
  capabilities: [
    'market_data:read',
    'evidence:publish',
    'telemetry:read'
  ],
  description: 'Displays Research Lab experiments, Model Registry status, Concept Drift auto-protection alerts, Evidence Marketplace plugins, and Strategy Genome evolutionary progress.'
};
