// Empirical Verification Script for StreamEngine and Deployment Dependencies
import path from 'path';
import { pathToFileURL } from 'url';

const baseBackend = 'E:/projcts/lyzer/lyzer edge/backend/';
const baseShared = 'E:/projcts/lyzer/packages/lyzer-shared/src/';
const baseConst = 'E:/projcts/lyzer/packages/lyzer-constitution/src/';
const baseEdgeSrc = 'E:/projcts/lyzer/lyzer edge/src/';

const modulesToTest = [
  { name: 'EvSignalEngine', path: baseShared + 'engine/evSignalRedesign.js' },
  { name: 'computeTradeEV', path: baseShared + 'engine/evProfiler.js' },
  { name: 'EVAlphaResearchEngineV3_3', path: baseBackend + 'EVAlphaResearchEngineV3_3.js' },
  { name: 'LiveDataIngestor', path: baseBackend + 'liveDataIngestor.js' },
  { name: 'ExchangeExecution', path: baseBackend + 'exchangeExecution.js' },
  { name: 'safeMerge', path: baseBackend + 'utils/safeJson.js' },
  { name: 'RealityGapMonitor', path: baseBackend + 'realityGapMonitor.js' },
  { name: 'TruthKernel', path: baseShared + 'engine/kernel.js' },
  { name: 'ConstitutionalCourt', path: baseConst + 'eca/court.js' },
  { name: 'LiquidityReconstructionEngine (V1)', path: baseShared + 'providers/v1_smc_ict.js' },
  { name: 'StructuralBoundaryEngine (V2)', path: baseShared + 'providers/v2_snd_snr.js' },
  { name: 'MomentumRsiEngine (V3)', path: baseShared + 'providers/v3_momentum_rsi.js' },
  { name: 'InstitutionalMarketCausalityEngine (V4)', path: baseShared + 'providers/v4_imce.js' },
  { name: 'LiquidityEngine', path: baseShared + 'smc/liquidityEngine.js' },
  { name: 'StructureEngine', path: baseShared + 'smc/structureEngine.js' },
  { name: 'SmcEngineFacade', path: baseShared + 'smc/smcFacade.js' },
  { name: 'ScaleNormalizer', path: baseShared + 'csrl/ScaleNormalizer.js' },
  { name: 'CrossScaleTensorGraph', path: baseShared + 'csrl/CrossScaleTensorGraph.js' },
  { name: 'InvariantExtractor', path: baseShared + 'csrl/InvariantExtractor.js' },
  { name: 'DivergenceDetector', path: baseShared + 'csrl/DivergenceDetector.js' },
  { name: 'DualRealityMonitor', path: baseBackend + 'dualRealityMonitor.js' },
  { name: 'SpectrogramUI', path: baseBackend + 'spectrogramUI.js' },
  { name: 'telegram', path: baseBackend + 'telegram.js' },
  { name: 'observability', path: baseEdgeSrc + 'observability/index.js' },
  { name: 'MicrostructureDampener', path: baseShared + 'engine/MicrostructureDampener.js' },
  { name: 'DynamicSizing', path: baseEdgeSrc + 'engine/sizing.js' },
  { name: 'riskGatewayClient', path: baseBackend + 'riskGatewayClient.js' }
];

async function run() {
  console.log("--- EMPIRICAL IMPORT RESOLUTION TEST ---");
  let passed = 0;
  let failed = 0;
  
  for (const mod of modulesToTest) {
    try {
      const fileUrl = pathToFileURL(mod.path).href;
      const imported = await import(fileUrl);
      console.log(`[PASS] ${mod.name} -> ${mod.path}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${mod.name} -> ${mod.path}\n       Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed out of ${modulesToTest.length}`);
}

run();
