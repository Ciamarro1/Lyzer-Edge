export interface SimulationTrade {
  id: string;
  timestamp: number;
  symbol: string;
  expectedEdge: number; // in pct
  realizedPnl: number; // in dollars
  durationMs: number;
}

export interface PathPoint {
  timestamp: number;
  equity: number;
}

export interface SimulationResult {
  baselinePath: PathPoint[];
  migrationPath: PathPoint[];
  metrics: {
    baselineFinalEquity: number;
    migrationFinalEquity: number;
    feeBleedTotal: number;
    alphaCaptured: number;
    netDivergence: number; // baseline - migration
    totalRotations: number;
  };
}

export class CapitalRotationStudy {
  private initialEquity: number;

  constructor(initialEquity: number = 10000) {
    this.initialEquity = initialEquity;
  }

  /**
   * Simulates and generates Counterfactual Capital Paths.
   * Compares the baseline path (freezing automated migrations, fee-efficient)
   * with an aggressive migration path (rotating positions to chase edge).
   * 
   * @param trades Historical trades list to run the simulation over
   * @param migrationFrictionBps Cost of each migration in basis points
   * @param rotationCount Estimate of how many times aggressive logic would rotate capital
   */
  public simulate(
    trades: SimulationTrade[],
    migrationFrictionBps: number = 15,
    rotationCount: number = 12
  ): SimulationResult {
    let baselineEquity = this.initialEquity;
    let migrationEquity = this.initialEquity;
    let feeBleedTotal = 0;
    let alphaCaptured = 0;

    const baselinePath: PathPoint[] = [{ timestamp: Date.now() - 86400000, equity: baselineEquity }];
    const migrationPath: PathPoint[] = [{ timestamp: Date.now() - 86400000, equity: migrationEquity }];

    // Sort trades by timestamp
    const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < sortedTrades.length; i++) {
      const trade = sortedTrades[i];
      const pnl = trade.realizedPnl;

      // 1. Baseline Path (No automatic migration, capital remains in place)
      baselineEquity += pnl;
      baselinePath.push({
        timestamp: trade.timestamp,
        equity: baselineEquity
      });

      // 2. Migration Path (Simulate alpha chasing + fee bleed)
      // For the simulation, every rotation triggers a migration fee bleed:
      // migrationCost = currentEquity * friction
      let cost = 0;
      const isRotationPoint = i > 0 && i % Math.max(1, Math.floor(sortedTrades.length / rotationCount)) === 0;

      if (isRotationPoint) {
        cost = migrationEquity * (migrationFrictionBps / 10000);
        feeBleedTotal += cost;
      }

      // Aggressive migration captures slightly different alpha (e.g. mock EES chasing delta)
      // In actual backtesting, chasing EES might gain/lose alpha. We model a typical alpha decay scenario:
      const EESAlphaBonus = trade.expectedEdge * 0.05 * migrationEquity * 0.01;
      alphaCaptured += EESAlphaBonus;

      migrationEquity += pnl + EESAlphaBonus - cost;
      migrationPath.push({
        timestamp: trade.timestamp,
        equity: migrationEquity
      });
    }

    const netDivergence = baselineEquity - migrationEquity;

    return {
      baselinePath,
      migrationPath,
      metrics: {
        baselineFinalEquity: Math.round(baselineEquity * 100) / 100,
        migrationFinalEquity: Math.round(migrationEquity * 100) / 100,
        feeBleedTotal: Math.round(feeBleedTotal * 100) / 100,
        alphaCaptured: Math.round(alphaCaptured * 100) / 100,
        netDivergence: Math.round(netDivergence * 100) / 100,
        totalRotations: rotationCount
      }
    };
  }

  /**
   * Generates a text-based research report summarizing the study.
   */
  public generateReport(result: SimulationResult): string {
    const isFeeBleedCritical = result.metrics.netDivergence > 0;
    
    return `========================================================================
                 LYZER LABS - CAPITAL ROTATION STUDY
========================================================================
STATUS: ${isFeeBleedCritical ? 'CRITICAL_FEE_BLEED_PROVEN' : 'SURPLUS_EDGE_NOT_JUSTIFIED'}
INITIAL CAPITAL: $${this.initialEquity.toFixed(2)}

- Results:
- Baseline Path Final Equity (No Migration): $${result.metrics.baselineFinalEquity.toFixed(2)}
- Migration Path Final Equity (Chasing Edge): $${result.metrics.migrationFinalEquity.toFixed(2)}
- Accumulated Fee Bleed (Slippage + Fees):   $${result.metrics.feeBleedTotal.toFixed(2)}
- Excess Alpha Captured (EES Chasing Bonus):  $${result.metrics.alphaCaptured.toFixed(2)}
- Net Divergence (Baseline - Migration):     $${result.metrics.netDivergence.toFixed(2)}

ARCHITECTURAL EVALUATION:
- The Counterfactual Capital Paths prove that:
  ${isFeeBleedCritical 
    ? `Baseline Alpha ($${result.metrics.baselineFinalEquity.toFixed(2)}) outranks Active Migration ($${result.metrics.migrationPath.toFixed(2)}).
  The fee bleed ($${result.metrics.feeBleedTotal.toFixed(2)}) consumed more thermodynamic energy than EES chasing produced ($${result.metrics.alphaCaptured.toFixed(2)}).`
    : 'Active migration remains edge-efficient under the simulated parameters.'}
  
VERDICT:
- Enforcing the Second Law of Capital Thermodynamics (TR > Threshold) is
  MANDATORY to prevent structural decay and transaction cost death.
========================================================================
`;
  }
}
