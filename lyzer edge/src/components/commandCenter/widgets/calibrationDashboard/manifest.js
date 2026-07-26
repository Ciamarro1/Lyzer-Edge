export const manifest = {
  id: 'calibration-dashboard-widget',
  name: 'Empirical Validation & Calibration Dashboard',
  version: '1.0.0',
  minRuntimeVersion: '3.5.0',
  targetPane: 'RIGHT_PANE',
  realityTag: 'INFERRED_REALITY',
  capabilities: [
    'market_data:read',
    'evidence:publish',
    'telemetry:read'
  ],
  description: 'Displays Brier Score, Expected Calibration Error (ECE), Controlled Experiments, OOS Guards, and Decision Replay.'
};
