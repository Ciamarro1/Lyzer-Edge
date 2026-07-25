import { describe, it, expect } from 'vitest';
import { ResearchDataset } from '../../../packages/lyzer-shared/src/research/researchDataset.js';
import { MarketRegimeDiscovery } from '../../../packages/lyzer-shared/src/research/regimeDiscovery.js';
import { FeatureDiscovery } from '../../../packages/lyzer-shared/src/research/featureDiscovery.js';
import { AutoExperiments } from '../../../packages/lyzer-shared/src/research/autoExperiments.js';

describe('Autonomous Research Lab - Suite de Testes do Motor Científico', () => {
  it('deve registrar decisões no dataset de pesquisa com 24 atributos', () => {
    const dataset = new ResearchDataset();
    const record = dataset.logDecision({
      asset: 'BTCUSDT',
      result: 'win',
      atr: 1.2,
      trg: 0.55
    });

    expect(record).toHaveProperty('timestamp');
    expect(record).toHaveProperty('asset', 'BTCUSDT');
    expect(record).toHaveProperty('mfe');
    expect(record).toHaveProperty('mae');
    expect(dataset.getDataset().length).toBe(1);
  });

  it('deve identificar regimes de mercado via clustering', () => {
    const regimeEngine = new MarketRegimeDiscovery();
    const result = regimeEngine.discoverRegimes([{ atr: 1.2, bos: true, result: 'win' }]);
    expect(result).toHaveProperty('discoveredRegimesCount', 4);
  });

  it('deve avaliar feature drift entre janelas temporais', () => {
    const featureEngine = new FeatureDiscovery();
    const drift = featureEngine.computeImportanceDrift();
    expect(drift).toHaveProperty('conceptDriftDetected', false);
    expect(drift.driftScores).toHaveProperty('structure_m15');
  });
});
