/**
 * L12 Institutional Portfolio Manager
 * Evolução do PortfolioManager.
 * Adiciona: exposição por classe, risco agregado, stress contribution e marginal VaR.
 */

export class InstitutionalPortfolioManager {
  constructor(initialAUM = 1000000) {
    this.aum = initialAUM;
    this.exposures = {
      CRYPTO: 0,
      MACRO: 0,
      COMMODITIES: 0
    };
    this.assetWeights = {};
  }

  updateExposure(asset, type, amountBrl) {
    this.exposures[type] = (this.exposures[type] || 0) + amountBrl;
    this.assetWeights[asset] = amountBrl / this.aum;
  }

  getAggregatedRisk() {
    const totalExposure = Object.values(this.exposures).reduce((a, b) => a + b, 0);
    return totalExposure / this.aum;
  }

  /**
   * Responde à pergunta: "Se o ativo X cair dropPerc (ex: 20%), quanto da carteira sofre?"
   */
  calculateMarginalVaR(asset, dropPerc, correlationToPortfolio = 1.0) {
    const weight = this.assetWeights[asset] || 0;
    const directLoss = weight * dropPerc;
    // O impacto sistêmico total é amplificado se a correlação com o resto for alta
    const systemicLoss = directLoss * correlationToPortfolio;
    return {
      asset: asset,
      simulatedDrop: dropPerc,
      directPortfolioImpactPerc: directLoss * 100,
      systemicImpactPerc: systemicLoss * 100
    };
  }

  calculateStressContribution(asset) {
    const weight = this.assetWeights[asset] || 0;
    // Assumindo que ativos cripto contribuem 2.5x mais para o estresse que moedas/commodities
    const multiplier = asset === 'BTC' || asset === 'ETH' || asset === 'SOL' ? 2.5 : 1.0;
    return weight * multiplier;
  }
}
