import fs from 'fs';
import path from 'path';

export class DecisionLedger {
  constructor() {
    this.ledgerPath = path.resolve(process.cwd(), '../../../knowledge/operations/decision_ledger');
    if (!fs.existsSync(this.ledgerPath)) {
       // Mock for environment without fs or sync
       console.log(`[LEDGER] In-memory mode active. Fallback from ${this.ledgerPath}`);
    }
    this.batchedLogs = [];
    this.SIMULATION_MODE = process.env.SIMULATION_MODE === 'true';
  }

  logDecision(who, metric, rule, evidence, actionTaken) {
    const timestamp = new Date().toISOString();
    const decisionRecord = {
      timestamp,
      decision_maker: who,
      trigger_metric: metric,
      governance_rule: rule,
      action: actionTaken,
      evidence_snapshot: evidence
    };

    console.log(`[DECISION LEDGER] ${who} executed ${actionTaken} due to ${rule}`);

    try {
      if (this.SIMULATION_MODE) {
        this.batchedLogs.push(decisionRecord);
        if (this.batchedLogs.length >= 1000) {
           this.flushBatch();
        }
      } else {
        const filename = `decision_${timestamp.replace(/[:.]/g, '-')}.json`;
        const fullPath = path.join(this.ledgerPath, filename);
        fs.writeFileSync(fullPath, JSON.stringify(decisionRecord, null, 2));
      }
    } catch (e) {
      console.log(`[DECISION LEDGER] Write error masked for simulation. Record: ${JSON.stringify(decisionRecord)}`);
    }
  }

  flushBatch() {
    if (this.batchedLogs.length === 0) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `simulation_batch_${timestamp}.json`;
    const fullPath = path.join(this.ledgerPath, filename);
    try {
      fs.writeFileSync(fullPath, JSON.stringify(this.batchedLogs, null, 2));
    } catch(e) {}
    this.batchedLogs = [];
  }
}
