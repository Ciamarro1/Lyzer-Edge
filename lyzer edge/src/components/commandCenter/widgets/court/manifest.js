export const courtManifest = {
  id: 'court-widget',
  name: 'Constitutional Court Governance',
  version: '1.0.0',
  minRuntimeVersion: '3.4.0',
  description: 'Displays Constitutional Court decisions, veto audit logs, and immutable decision ledger entries.',
  author: 'Lyzer Edge Architecture Board',
  targetPane: 'RIGHT_PANE',
  capabilities: ['court:read', 'telemetry:read'],
  realityTag: 'OBSERVED_REALITY'
};
