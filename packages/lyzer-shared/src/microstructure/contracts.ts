// contracts.ts
 
/**
 * Contract A – Observation
 */
export interface Observation {
  timestamp: number; // epoch ms
  regime: string; // e.g., "bull", "bear", "sideways"
  volatility: number; // numeric volatility measure
  observations: {
    liquidity_signal: any;
    structure_signal: any;
    fvg_signal: any;
    sd_signal: any;
    ob_signal: any;
  };
}
 
/**
 * Contract B – EvidenceMetrics
 */
export interface EvidenceMetrics {
  hit_rate: number | null;
  expectancy: number | null;
  sample_size: number | null;
  regime_stability: number | null;
  causal_contribution: number | null;
  persistence_score: number | null;
  edge_survival_score: number | null;
  degradation_rate: number | null;
  performance_decay: number | null;
  structural_decay: number | null;
}
 
/**
 * Contract C – EvidencePayload
 */
export interface EvidencePayload {
  score: number | null;
  evidence: EvidenceMetrics;
  evidence_source: EvidenceSource;
  metadata: Metadata;
}
 
/**
 * Additional types for schema freeze
 */
export type EvidenceSource = "internal" | "external" | "hybrid";
 
export interface Metadata {
  horizon_fast: number;
  horizon_medium: number;
  horizon_slow: number;
  regime: string;
  volatility: number;
}
 