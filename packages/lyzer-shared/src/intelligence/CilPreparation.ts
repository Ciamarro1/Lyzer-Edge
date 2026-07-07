import { eventBus } from '../lib/eventBus.js';
import { CausalRecord, ThermodynamicRatioEvent, OpportunityEntropyEvent } from '../types/governanceContracts.js';

export class CilPreparation {
  private records: CausalRecord[] = [];
  private currentCause: CausalRecord['cause'] = 'NONE';
  private currentIntervention: CausalRecord['intervention'] = 'NONE';
  private causeTimestamp: number = 0;
  private interventionTimestamp: number = 0;

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    // 1. Listen for Causes
    eventBus.on('research:opportunity_entropy', (data: OpportunityEntropyEvent) => {
      if (data.triggerEvent === 'VOLATILITY_SHOCK') {
        this.setCause('VOLATILITY_SHOCK');
      } else if (data.triggerEvent === 'REGIME_CHANGE') {
        this.setCause('REGIME_CHANGE');
      } else if (data.triggerEvent === 'OPPORTUNITY_COLLAPSE') {
        this.setCause('OPPORTUNITY_COLLAPSE');
      }
    });

    eventBus.on('market:stress', () => {
      this.setCause('MARKET_STRESS');
    });

    // 2. Listen for Interventions
    eventBus.on('thermodynamics:ratio', (data: ThermodynamicRatioEvent) => {
      if (!data.allowed) {
        this.setIntervention('TR_VETO');
      }
    });

    eventBus.on('eca:constraint_applied', () => {
      this.setIntervention('ECA_CONSTRAINT');
    });

    eventBus.on('fmc:threat_alert', () => {
      this.setIntervention('FMC_ALERT');
    });

    eventBus.on('governance:override', () => {
      this.setIntervention('GOVERNANCE_OVERRIDE');
    });

    eventBus.on('allocation:freeze', () => {
      this.setIntervention('ALLOCATION_FREEZE');
    });

    // 3. Listen for Capital Intelligence updates to evaluate outcome
    eventBus.on('capital:intelligence_summary', (summary: any) => {
      setTimeout(() => {
        if (this.currentCause !== 'NONE' || this.currentIntervention !== 'NONE') {
          this.evaluateAndRecord(summary);
        }
      }, 0);
    });
  }

  private setCause(cause: CausalRecord['cause']): void {
    this.currentCause = cause;
    this.causeTimestamp = Date.now();
  }

  private setIntervention(intervention: CausalRecord['intervention']): void {
    this.currentIntervention = intervention;
    this.interventionTimestamp = Date.now();
  }

  private evaluateAndRecord(summary: any): void {
    const timestamp = Date.now();

    // Determine observed and counterfactual outcomes
    let observedOutcome = 'Normal Operations';
    let counterfactualOutcome = 'No Action Required';

    if (this.currentIntervention === 'TR_VETO') {
      if (summary.lockAlert) {
        observedOutcome = 'Capital Lock (Veto Active)';
        counterfactualOutcome = 'Rotation Allowed but Bleed Incurred';
      } else if (summary.feeBleedVelocity === 0) {
        observedOutcome = 'Fee Bleed Stopped';
        counterfactualOutcome = 'Capital Rotated with Fee Attrition';
      } else {
        observedOutcome = 'System Stabilized';
        counterfactualOutcome = 'Capital rotated chasing lower edge';
      }
    } else if (this.currentIntervention === 'ECA_CONSTRAINT' || this.currentIntervention === 'ALLOCATION_FREEZE') {
      observedOutcome = 'Allocation Frozen / Rigid Constraints';
      counterfactualOutcome = 'Unconstrained Rotations leading to Fee Bleed';
    } else if (this.currentIntervention === 'FMC_ALERT') {
      observedOutcome = 'Threat Throttled';
      counterfactualOutcome = 'Cascade Failure or Monoculture Collapse';
    } else if (summary.lockAlert) {
      observedOutcome = 'Capital Stagnation';
      counterfactualOutcome = 'Active Rotations capturing Edge';
    }

    const record: CausalRecord = {
      timestamp,
      cause: this.currentCause,
      intervention: this.currentIntervention,
      observedOutcome,
      counterfactualOutcome
    };

    this.records.push(record);
    eventBus.emit('cil:causal_record', record);

    // Reset pending states
    this.currentCause = 'NONE';
    this.currentIntervention = 'NONE';
  }

  /**
   * Manually injects a causal record into the dataset.
   */
  public addRecord(record: CausalRecord): void {
    this.records.push(record);
    eventBus.emit('cil:causal_record', record);
  }

  /**
   * Returns the causal dataset history.
   */
  public getDataset(): CausalRecord[] {
    return this.records;
  }
}
