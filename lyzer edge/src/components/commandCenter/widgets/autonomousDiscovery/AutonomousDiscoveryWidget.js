import { manifest } from './manifest.js';
import { AutoFeatureDiscoveryEngine } from '../../sdk/evidence/discovery/AutoFeatureDiscoveryEngine.js';
import { CausalDiscoveryEngine } from '../../sdk/evidence/discovery/CausalDiscoveryEngine.js';
import { SymbolEmbeddingEngine } from '../../sdk/evidence/discovery/SymbolEmbeddingEngine.js';
import { SelfSupervisedRepresentationEngine } from '../../sdk/evidence/discovery/SelfSupervisedRepresentationEngine.js';
import { MarketFoundationModelEngine } from '../../sdk/evidence/discovery/MarketFoundationModelEngine.js';
import { BillionVectorMemoryEngine } from '../../sdk/evidence/discovery/BillionVectorMemoryEngine.js';
import { ArchitecturalEvolutionEngine } from '../../sdk/evidence/discovery/ArchitecturalEvolutionEngine.js';
import { MultiAgentResearchLab } from '../../sdk/evidence/discovery/MultiAgentResearchLab.js';

export class AutonomousDiscoveryWidget {
  constructor() {
    this.manifest = manifest;
    this._container = null;
    this._featureEngine = new AutoFeatureDiscoveryEngine();
    this._causalEngine = new CausalDiscoveryEngine();
    this._symbolEngine = new SymbolEmbeddingEngine();
    this._representationEngine = new SelfSupervisedRepresentationEngine();
    this._foundationEngine = new MarketFoundationModelEngine();
    this._vectorMemory = new BillionVectorMemoryEngine();
    this._archEvolution = new ArchitecturalEvolutionEngine();
    this._multiAgentLab = new MultiAgentResearchLab();
    this._disposed = false;
  }

  async mount(container, context) {
    this._container = container;

    const features = this._featureEngine.getDiscoveredFeatures();
    const causalGraph = this._causalEngine.inferCausalGraph();
    const analogs = this._symbolEngine.findAnalogousRegimes('BTC');
    const foundation = this._foundationEngine.generateFoundationEmbeddings([100, 101, 102]);
    const memorySearch = this._vectorMemory.searchSimilarContexts(new Float64Array(16), 12438);
    const arch = this._archEvolution.evolveArchitecture();
    const researchCycle = await this._multiAgentLab.runScientificResearchCycle('Autonomous Volatility-Entropy Hypothesis');

    this._container.innerHTML = `
      <div style="padding: 12px; font-family: monospace; background: #070a12; color: #f8fafc; border-radius: 6px; font-size: 11px; border: 1px solid #1e293b;">
        <div style="font-weight: bold; color: #a855f7; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>AUTONOMOUS DISCOVERY & MULTI-AGENT SCIENCE</span>
          <span style="color: #38bdf8;">PHASE 8</span>
        </div>

        <div style="margin-bottom: 8px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">Auto Feature Discovery (${features.length} Features Discovered):</div>
          <div style="color: #4ade80;">Top: ${features[9].name} (InfoGain: ${features[9].infoGain})</div>
        </div>

        <div style="margin-bottom: 8px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">Causal Discovery (PC / DirectLiNGAM):</div>
          <div style="color: #cbd5e1;">Graph: ${causalGraph.nodes.join(' → ')}</div>
        </div>

        <div style="margin-bottom: 8px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">Multi-Asset Analog Embeddings:</div>
          <div style="color: #38bdf8;">BTC matches ${analogs[0].matchedSymbol} (${analogs[0].historicalPeriod}) - Cosine: ${analogs[0].cosineSimilarity}</div>
        </div>

        <div style="margin-bottom: 8px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">Market Foundation Model (${foundation.modelName}):</div>
          <div style="color: #facc15;">Mean Return: +${(foundation.forecastDistribution.meanReturn * 100).toFixed(2)}% | Confidence: ${(foundation.embeddingConfidence * 100).toFixed(1)}%</div>
        </div>

        <div style="margin-bottom: 8px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">300M Vector Memory Retrieval:</div>
          <div style="color: #e2e8f0;">Retrieved ${memorySearch.matchedContextsCount} contexts in ${memorySearch.retrievalLatencyMs}ms (Win Rate: ${memorySearch.ensembleWinRate}%)</div>
        </div>

        <div style="background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">Multi-Agent Scientific Lab Cycle:</div>
          <div style="color: #f43f5e;">Status: <strong>${researchCycle.status}</strong> (Sharpe: ${researchCycle.sharpeRatio})</div>
        </div>
      </div>
    `;

    return {
      dispose: () => this.dispose()
    };
  }

  dispose() {
    this._disposed = true;
    if (this._featureEngine) this._featureEngine.dispose();
    if (this._container) this._container.innerHTML = '';
  }
}
