import { runDataProviderComplianceSuite } from '../contracts/dataProvider.contract.js';
import { MockProvider } from '../../../src/components/commandCenter/sdk/providers/MockProvider.js';
import { RealityTags } from '../../../src/components/commandCenter/sdk/types.js';

runDataProviderComplianceSuite(
  'MockProvider',
  async () => {
    const provider = new MockProvider('mock-1');
    await provider.connect();
    return provider;
  },
  RealityTags.SYNTHETIC_REALITY
);
