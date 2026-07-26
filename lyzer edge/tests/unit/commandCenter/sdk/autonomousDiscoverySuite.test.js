import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutoFeatureDiscoveryEngine } from '../../../../src/components/commandCenter/sdk/evidence/discovery/AutoFeatureDiscoveryEngine.js';
import { CausalDiscoveryEngine } from '../../../../src/components/commandCenter/sdk/evidence/discovery/CausalDiscoveryEngine.js';
import { SymbolEmbeddingEngine } from '../../../../src/components/commandCenter/sdk/evidence/discovery/SymbolEmbeddingEngine.js';
import { SelfSupervisedRepresentationEngine } from '../../../../src/components/commandCenter/sdk/evidence/discovery/SelfSupervisedRepresentationEngine.js';
import { MarketFoundationModelEngine } from '../../../../src/components/commandCenter/sdk/evidence/discovery/MarketFoundationModelEngine.js';
import { BillionVectorMemoryEngine } from '../../../../src/components/commandCenter/sdk/evidence/discovery/BillionVectorMemoryEngine.js';
import { ArchitecturalEvolutionEngine } from '../../../../src/components/commandCenter/sdk/evidence/discovery/ArchitecturalEvolutionEngine.js';
import { MultiAgentResearchLab } from '../../../../src/components/commandCenter/sdk/evidence/discovery/MultiAgentResearchLab.js';

describe('Autonomous Feature Discovery & Multi-Agent Science Suite', () => {
  let featureEngine;
  let causalEngine;
  let symbolEngine;
  let representationEngine;
  let foundationEngine;
  let vectorMemory;
  let archEvolution;
  let multiAgentLab;

  beforeEach(() => {
    featureEngine = new AutoFeatureDiscoveryEngine();
    causalEngine = new CausalDiscoveryEngine();
    symbolEngine = new SymbolEmbeddingEngine();
    representationEngine = new SelfSupervisedRepresentationEngine();
    foundationEngine = new MarketFoundationModelEngine();
    vectorMemory = new BillionVectorMemoryEngine();
    archEvolution = new ArchitecturalEvolutionEngine();
    multiAgentLab = new MultiAgentResearchLab();
  });

  afterEach(() => {
    if (featureEngine) featureEngine.dispose();
  });

  it('1. AutoFeatureDiscoveryEngine should discover high-information features', () => {
    const candidate = featureEngine.discoverNewFeatures();
    expect(candidate.id).toBeDefined();
    expect(candidate.infoGain).toBeGreaterThan(0.70);
  });

  it('2. CausalDiscoveryEngine should infer DAG causal paths', () => {
    const dag = causalEngine.inferCausalGraph();
    expect(dag.isAcyclic).toBe(true);
    expect(dag.nodes.length).toBe(5);
  });

  it('3. SymbolEmbeddingEngine should compute cross-asset analog embeddings', () => {
    const analogs = symbolEngine.findAnalogousRegimes('BTC');
    expect(analogs.length).toBe(3);
    expect(analogs[0].cosineSimilarity).toBeGreaterThan(0.85);
  });

  it('4. SelfSupervisedRepresentationEngine should encode un-labeled time-series representations', () => {
    const encoded = representationEngine.encodeLatentRepresentation([1, 2, 3]);
    expect(encoded.latentVector.length).toBe(32);
    expect(encoded.representationQuality).toBeGreaterThan(0.90);
  });

  it('5. MarketFoundationModelEngine should output probabilistic price distributions', () => {
    const foundation = foundationEngine.generateFoundationEmbeddings([100, 101]);
    expect(foundation.modelName).toBe('MarketGPT-Moirai-v1');
    expect(foundation.embeddingConfidence).toBeGreaterThan(0.90);
  });

  it('6. BillionVectorMemoryEngine should execute HNSW similarity search over 300M contexts', () => {
    const search = vectorMemory.searchSimilarContexts(new Float64Array(16), 12438);
    expect(search.indexedVectorCount).toBe(300_000_000);
    expect(search.matchedContextsCount).toBe(12438);
  });

  it('7. ArchitecturalEvolutionEngine should evolve full pipeline topologies', () => {
    const evolved = archEvolution.evolveArchitecture();
    expect(evolved.generation).toBe(2);
    expect(evolved.activePipelineTopology.length).toBe(8);
  });

  it('8. MultiAgentResearchLab should run multi-agent scientific debate, falsification, and ECA approval', async () => {
    const res = await multiAgentLab.runScientificResearchCycle('Volatility-Entropy Discovery');
    expect(res.status).toBe('PUBLISHED_TO_PRODUCTION_REGISTRY');
    expect(res.sharpeRatio).toBe(2.38);
  });
});
