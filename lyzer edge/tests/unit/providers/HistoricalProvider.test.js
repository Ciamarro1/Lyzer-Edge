import { runDataProviderComplianceSuite } from '../contracts/dataProvider.contract.js';
import { HistoricalProvider } from '../../../src/components/commandCenter/sdk/providers/HistoricalProvider.js';
import { RealityTags } from '../../../src/components/commandCenter/sdk/types.js';

runDataProviderComplianceSuite(
  'HistoricalProvider',
  async () => {
    const provider = new HistoricalProvider('historical-1');
    await provider.connect();
    return provider;
  },
  RealityTags.RECONSTRUCTED_REALITY
);
