export const runtimeInspectorManifest = {
  id: 'runtime-inspector-widget',
  name: 'Lyzer Runtime DevTools Inspector',
  version: '1.0.0',
  minRuntimeVersion: '3.4.0',
  description: 'DevTools-grade internal inspector for runtime governance, metrics, and widget tree.',
  author: 'Lyzer Edge Architecture Board',
  targetPane: 'RIGHT_PANE',
  capabilities: ['telemetry:read', 'court:read', 'ui_event:listen'],
  realityTag: 'OBSERVED_REALITY'
};
