import { runDataProviderComplianceSuite } from '../contracts/dataProvider.contract.js';
import { LiveProvider } from '../../../src/components/commandCenter/sdk/providers/LiveProvider.js';
import { RealityTags } from '../../../src/components/commandCenter/sdk/types.js';

runDataProviderComplianceSuite(
  'LiveProvider',
  async () => {
    const provider = new LiveProvider('live-1');
    await provider.connect();
    return provider;
  },
  RealityTags.OBSERVED_REALITY
);
