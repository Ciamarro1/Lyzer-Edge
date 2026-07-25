export type ClassificationLevel = 
  | 'PRE_HALLUCINATION' 
  | 'COUNTERFACTUAL_HALLUCINATION' 
  | 'BLACK_SWAN' 
  | 'VERIFIED' 
  | 'REJECTED_BY_SYSTEM'
  | 'REJECTED_BY_PLAUSIBILITY'
  | 'REJECTED_BY_CONFIDENCE'
  | 'REJECTED_BY_SENSITIVITY';

export type RetentionClass = 'CLASS_A' | 'CLASS_B' | 'CLASS_C';

export interface EvidenceRecord {
  id: string;
  timestamp: number;
  classification: ClassificationLevel;
  retentionClass: RetentionClass;
  data: string; // JSON payload
  eps: number;
  ncr: number;
  ccs: number;
}

export interface EpochMetadata {
  constitution_version: string;
  constitution_hash: string;
  transition_timestamp: number;
  previous_constitution: string | null;
  structural_changes: string;
}

export interface EpochTransitionRecord {
  new_version: string;
  constitution_hash: string;
  structural_changes: string;
}

export interface RecoveryTelemetry {
  recoveredRecords: number;
  recoveryDurationMs: number;
  largestRecoveryEvent: number;
  degradedModeTriggered: boolean;
  recoveryCatchUpRatio: number; // RCR
  evidenceEntropyScore: number; // EES
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
}

export type FMCFailureMode = 
  | 'EVIDENCE_LOSS_RISK' 
  | 'QUEUE_CORRUPTION' 
  | 'RECOVERY_STORM' 
  | 'EPOCH_FRAGMENTATION' 
  | 'DURABILITY_GAP_CRITICAL' 
  | 'RECOVERY_INSOLVENCY' 
  | 'EPISTEMIC_COLLAPSE'
  | 'TELEMETRY_STALENESS';

export interface RollupRecord {
  id: string;
  period_start: number;
  period_end: number;
  rollup_type: 'DAILY' | 'STRATEGIC_180D';
  causal_narrative: string;
  aggregated_metrics: string; // JSON
  rollup_provenance: string; // JSON Array of IDs
  rollup_confidence: number;
}
