import { runDataProviderComplianceSuite } from '../contracts/dataProvider.contract.js';
import { ReplayProvider } from '../../../src/components/commandCenter/sdk/providers/ReplayProvider.js';
import { RealityTags } from '../../../src/components/commandCenter/sdk/types.js';

runDataProviderComplianceSuite(
  'ReplayProvider',
  async () => {
    const provider = new ReplayProvider('replay-1', []);
    await provider.connect();
    return provider;
  },
  RealityTags.RECONSTRUCTED_REALITY
);
