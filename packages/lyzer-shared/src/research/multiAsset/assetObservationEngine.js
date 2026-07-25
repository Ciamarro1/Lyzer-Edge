/**
 * L12 Multi-Asset Observation Layer
 * NÃO gera sinais de trade nem altera o Alpha Core.
 * Observa passivamente: volatilidade, regime, liquidez e cluster de correlação.
 */

export class AssetObservationEngine {
  constructor() {
    this.monitoredAssets = {
      // Crypto Cluster
      BTC: { cluster: 'CRYPTO_HIGH_BETA', type: 'CRYPTO' },
      ETH: { cluster: 'CRYPTO_HIGH_BETA', type: 'CRYPTO' },
      SOL: { cluster: 'CRYPTO_HIGH_BETA', type: 'CRYPTO' },
      
      // Macro Equities & Rates Cluster
      SPY: { cluster: 'US_EQUITIES', type: 'MACRO' },
      QQQ: { cluster: 'US_EQUITIES_TECH', type: 'MACRO' },
      DXY: { cluster: 'US_DOLLAR_INDEX', type: 'MACRO' },
      VIX: { cluster: 'VOLATILITY_INDEX', type: 'MACRO' },
      TLT: { cluster: 'US_TREASURY_20Y', type: 'MACRO' },
      
      // Commodities Cluster
      GLD: { cluster: 'PRECIOUS_METALS', type: 'COMMODITIES' },
      USOIL: { cluster: 'ENERGY_COMMODITIES', type: 'COMMODITIES' }
    };
    
    this.observations = {};
  }

  observeAsset(ticker, rawMetrics) {
    if (!this.monitoredAssets[ticker]) {
      throw new Error(`[OBSERVATION ERROR] Asset ${ticker} is not part of L12 institutional universe.`);
    }

    const meta = this.monitoredAssets[ticker];
    
    // Classificação de regime por ativo de forma autônoma
    let regime = 'RISK_NEUTRAL';
    if (rawMetrics.volatility > 0.40) {
      regime = 'RISK_OFF';
    } else if (rawMetrics.volatility < 0.20 && rawMetrics.trend > 0) {
      regime = 'RISK_ON';
    }

    // Regra específica: se VIX ou DXY explodir, é RISK_OFF local
    if ((ticker === 'VIX' || ticker === 'DXY') && rawMetrics.trend > 0.05) {
      regime = 'RISK_OFF';
    }

    const observation = {
      asset: ticker,
      regime: regime,
      volatility: rawMetrics.volatility || 0.25,
      liquidity: rawMetrics.liquidity || 'HIGH',
      correlationCluster: meta.cluster,
      timestamp: new Date().toISOString()
    };

    this.observations[ticker] = observation;
    return observation;
  }

  getSnapshot() {
    return this.observations;
  }
}
