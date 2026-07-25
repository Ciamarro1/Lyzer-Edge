import fs from 'fs';
import path from 'path';
import { EmpiricalExecution } from './execution_engine';
import { CorrelationAdjustedAllocation } from './portfolio_engine';

/**
 * Capital Ledger
 * 
 * Domain: Capital Layer (The Survival Guardian)
 * Purpose: Immutable memory. Records the entire lifecycle from
 * Intelligence Decision to Risk, Allocation, Veto, and Execution.
 */
export class CapitalLedger {
  
  private ledgerPath = path.join(__dirname, '../../../data/empirical/capital_ledger.json');
  private records: any[] = [];

  constructor() {
    if (fs.existsSync(this.ledgerPath)) {
      this.records = JSON.parse(fs.readFileSync(this.ledgerPath, 'utf-8'));
    }
  }

  /**
   * Records a vetoed or rejected allocation.
   */
  public recordVeto(allocation: CorrelationAdjustedAllocation) {
    const record = {
      timestamp: Date.now(),
      type: 'VETO',
      decisionId: allocation.originalProposal.riskAssessment.decisionId,
      survivalState: allocation.survivalState,
      reasoning: allocation.reasoning
    };
    this.records.push(record);
    this.persist();
  }

  /**
   * Records a successfully executed trade including real-world friction.
   */
  public recordExecution(execution: EmpiricalExecution) {
    const record = {
      timestamp: execution.timestamp,
      type: 'EXECUTION',
      decisionId: execution.allocation.originalProposal.riskAssessment.decisionId,
      asset: execution.allocation.originalProposal.riskAssessment.candidate.asset,
      direction: execution.allocation.originalProposal.riskAssessment.candidate.direction,
      exposurePct: execution.allocation.adjustedExposurePct,
      expectedPrice: execution.expectedPrice,
      executedPrice: execution.executedPrice,
      slippagePct: execution.slippagePct,
      fees: execution.makerTakerFees,
      latencyMs: execution.latencyMs
    };
    this.records.push(record);
    this.persist();
  }

  private persist() {
    // In production this would be an append-only database
    // Ensure directory exists
    const dir = path.dirname(this.ledgerPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(this.ledgerPath, JSON.stringify(this.records, null, 2));
  }
}
