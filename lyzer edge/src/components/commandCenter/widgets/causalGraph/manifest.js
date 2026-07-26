export const causalGraphManifest = {
  id: 'causal-graph-widget',
  name: 'Institutional Causal Graph',
  version: '1.0.0',
  minRuntimeVersion: '3.4.0',
  description: 'Renders the live institutional dependency flow: Provider -> Reality -> Decision -> Runtime -> Widgets -> Chart.',
  author: 'Lyzer Edge Architecture Board',
  targetPane: 'FULL_WIDTH',
  capabilities: ['causal_timeline:read', 'telemetry:read'],
  realityTag: 'OBSERVED_REALITY'
};
