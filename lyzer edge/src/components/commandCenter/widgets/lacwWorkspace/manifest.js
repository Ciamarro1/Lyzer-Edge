export const manifest = {
  id: 'lacw-workspace-widget',
  name: 'Lyzer Adaptive Cognitive Workspace Master UI',
  version: '1.0.0',
  minRuntimeVersion: '3.9.0',
  targetPane: 'CENTER_CANVAS',
  realityTag: 'INFERRED_REALITY',
  capabilities: [
    'market_data:read',
    'evidence:publish',
    'telemetry:read',
    'traces:read',
    'history:read',
    'layout:manage',
    'command:execute'
  ],
  description: 'Adaptive Cognitive Workspace OS featuring Ctrl+K Raycast command palette, dynamic workspace presets, real-time event bus streaming, and interactive explainability lineage.'
};
