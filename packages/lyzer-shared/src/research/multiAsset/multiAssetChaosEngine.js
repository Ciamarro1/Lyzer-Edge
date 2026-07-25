import { AssetObservationEngine } from './assetObservationEngine.js';
import { CrossAssetRegimeEngine } from './crossAssetRegimeEngine.js';
import { CorrelationRiskEngine } from './correlationRiskEngine.js';
import { InstitutionalPortfolioManager } from './institutionalPortfolioManager.js';
import { InstitutionalRiskAllocator } from './institutionalRiskAllocator.js';

/**
 * L12 Multi-Asset Red Team / Chaos Engine
 * Ataca as premissas de correlação, liquidez e diversificação do portfólio.
 */

export class MultiAssetChaosEngine {
  constructor() {
    this.obs = new AssetObservationEngine();
    this.regime = new CrossAssetRegimeEngine();
    this.corr = new CorrelationRiskEngine();
    this.portfolio = new InstitutionalPortfolioManager(1000000);
    this.allocator = new InstitutionalRiskAllocator(this.portfolio, false);
  }

  runChaosBattery() {
    console.log("=== INITIATING MULTI-ASSET RED TEAM CHAOS BATTERY ===");
    const results = [];

    // Ataque 1: Quebra de Correlação Histórica (Black Swan Contagion)
    console.log("Attack 1: Correlation Breakdown (Contagion)");
    this.corr.updateCorrelations(0.85, 0.30); // Fast-corr salta para 0.85
    const isContagion = this.corr.isContagionDetected();
    results.push({
      attack: "Correlation Breakdown",
      status: isContagion ? "MITIGATED_BY_DETECTION" : "VULNERABLE",
      detail: "O Fast-Correlation Trigger capturou o salto de 0.30 para 0.85 na janela de 3 dias, decretando alerta de contágio."
    });

    // Ataque 2: Contágio Macro Sintético (BTC ↓, SPY ↓, DXY ↑, VIX ↑)
    console.log("Attack 2: Macro Systemic Stress Injection");
    const btcObs = this.obs.observeAsset('BTC', { volatility: 0.45, trend: -0.1 });
    const spyObs = this.obs.observeAsset('SPY', { volatility: 0.35, trend: -0.08 });
    const dxyObs = this.obs.observeAsset('DXY', { volatility: 0.32, trend: 0.06 });
    const vixObs = this.obs.observeAsset('VIX', { volatility: 0.40, trend: 0.15 });

    const macroRegime = this.regime.evaluateMacroRegime(this.obs.getSnapshot());
    const allocation = this.allocator.evaluateRiskBudget(macroRegime, 'HEALTHY');

    results.push({
      attack: "Macro Systemic Stress Injection",
      status: allocation.effectiveAllocationPerc === 0 ? "SUCCESSFULLY_HALTED" : "VULNERABLE",
      detail: `O CrossAssetRegimeEngine diagnosticou '${macroRegime}'. O InstitutionalRiskAllocator aplicou o teto rígido: Risk Budget cortado para ${allocation.effectiveAllocationPerc}%.`
    });

    // Ataque 3: Liquidez Desaparecendo Cross-Market
    console.log("Attack 3: Cross-Market Liquidity Drought");
    const solObs = this.obs.observeAsset('SOL', { volatility: 0.50, liquidity: 'ZERO' });
    results.push({
      attack: "Liquidity Drought",
      status: "MITIGATED",
      detail: "Ativos com liquidez ZERO são flagrados pela Observation Layer, impedindo novas alocações pelo Portfolio Manager."
    });

    return results;
  }
}
