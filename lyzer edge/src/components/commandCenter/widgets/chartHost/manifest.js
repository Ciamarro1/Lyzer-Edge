export const chartHostManifest = {
  id: 'chart-host-widget',
  name: 'Trading View Chart Host',
  version: '1.0.0',
  minRuntimeVersion: '3.4.0',
  description: 'High-performance real-time candlestick visualization widget.',
  author: 'Lyzer Edge Architecture Board',
  targetPane: 'FULL_WIDTH',
  capabilities: ['market_data:read', 'telemetry:read', 'ui_event:listen'],
  realityTag: 'OBSERVED_REALITY'
};
