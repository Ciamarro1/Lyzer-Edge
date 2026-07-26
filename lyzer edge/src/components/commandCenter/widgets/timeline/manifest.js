export const timelineManifest = {
  id: 'timeline-widget',
  name: 'Causal Intent Timeline',
  version: '1.0.0',
  minRuntimeVersion: '3.4.0',
  description: 'Displays multi-dimensional chronological execution and decision pipeline traces.',
  author: 'Lyzer Edge Architecture Board',
  targetPane: 'LEFT_PANE',
  capabilities: ['causal_timeline:read', 'telemetry:read'],
  realityTag: 'OBSERVED_REALITY'
};
