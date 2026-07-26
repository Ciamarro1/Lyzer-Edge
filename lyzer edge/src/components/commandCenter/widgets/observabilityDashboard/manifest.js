export const manifest = {
  id: 'observability-dashboard-widget',
  name: 'Distributed Observability & Reproducibility Dashboard',
  version: '1.0.0',
  minRuntimeVersion: '3.9.0',
  targetPane: 'RIGHT_PANE',
  realityTag: 'INFERRED_REALITY',
  capabilities: [
    'telemetry:read',
    'traces:read',
    'history:read'
  ],
  description: 'Three-panel dashboard: distributed trace/span visualization, historical trend sparklines with regression alerts, and benchmark reproducibility manifests.'
};
