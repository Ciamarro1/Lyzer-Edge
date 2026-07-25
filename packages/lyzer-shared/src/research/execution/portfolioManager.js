export class PortfolioManager {
  constructor(initialAUM = 100000) {
    this.initialAUM = initialAUM;
    this.currentAUM = initialAUM;
    this.highWaterMark = initialAUM;
    this.maxDrawdownRealized = 0;
    this.totalTrades = 0;
    
    // Configurações de Capacidade e Slippage
    this.baseCapacity = 25000; // Capital confortável por operação sem sofrer slippage logarítmico na Binance
    this.baseSlippage = 0.0005; // 5 BPS
  }

  /**
   * Registra um trade finalizado e atualiza o patrimônio global.
   */
  logTradeResult(netPnLPercentage, allocatedNotional) {
    this.totalTrades++;
    const pnlCash = netPnLPercentage * allocatedNotional;
    this.currentAUM += pnlCash;

    if (this.currentAUM > this.highWaterMark) {
      this.highWaterMark = this.currentAUM;
    }

    const currentDrawdown = (this.highWaterMark - this.currentAUM) / this.highWaterMark;
    if (currentDrawdown > this.maxDrawdownRealized) {
      this.maxDrawdownRealized = currentDrawdown;
    }
  }

  /**
   * Converte o risco em % emitido pelo Capital Governor em valor notacional real (USD/BRL).
   * Applica slippage punitivo de tamanho.
   */
  calculatePositionSizing(governorAllocationPct, liquidityScore) {
    // 1. Capital Bruto Alocado
    let notional = this.currentAUM * governorAllocationPct;

    // 2. Trava de Liquidez L2
    // Se a liquidez do ativo estiver ruim, truncamos o capital.
    const liquidityCap = this.baseCapacity * liquidityScore;
    if (notional > liquidityCap) {
      notional = liquidityCap;
    }

    // 3. Penalty de Auto-Slippage (Capacity Limit)
    // Se a ordem passar da baseCapacity, sofre slippage logarítmico.
    let simulatedSlippage = this.baseSlippage;
    if (notional > this.baseCapacity) {
      const overSizedRatio = notional / this.baseCapacity;
      // Ex: Dobro do size -> 1.5x Slippage Base. Triplo -> 2.0x
      simulatedSlippage *= (1 + Math.log10(overSizedRatio)); 
    }

    return {
      notional: parseFloat(notional.toFixed(2)),
      expectedSlippage: parseFloat(simulatedSlippage.toFixed(6)),
      portfolioAUM: parseFloat(this.currentAUM.toFixed(2)),
      portfolioDrawdown: parseFloat(((this.highWaterMark - this.currentAUM) / this.highWaterMark).toFixed(4))
    };
  }
}
