use crate::candidates::ObservationCandidate;
use crate::reconciliation::ObserverConflictMatrix;
use crate::types::{FalsificationTrace, OcmPosture};
use lyzer_oal::types::ObservationRecord;

pub struct FalsificationEngine;

impl FalsificationEngine {
    /// Multi-Candidate Falsification Field (MCFF)
    /// Runs a slice of reality (Event) against an array of Candidates simultaneously.
    pub fn execute_mcff(
        candidates: &[Box<dyn ObservationCandidate>],
        agg_trade: &ObservationRecord,
        diff_depth: &ObservationRecord,
    ) -> Vec<FalsificationTrace> {
        
        let mut traces = Vec::with_capacity(candidates.len());

        for candidate in candidates {
            // 1. OCM Classification
            let posture = ObserverConflictMatrix::classify_posture(
                agg_trade, 
                diff_depth, 
                candidate.relies_on_agg_trades(), 
                candidate.relies_on_diff_depth()
            );

            // 2. Falsification Evaluation
            let eval_result = candidate.evaluate(agg_trade, diff_depth);

            let (survived, failure_mode) = match eval_result {
                Ok(_) => (true, None),
                Err(reason) => (false, Some(reason)),
            };

            traces.push(FalsificationTrace {
                candidate_id: candidate.id().to_string(),
                event_timestamp: agg_trade.exchange_timestamp,
                posture,
                survived,
                failure_mode,
            });
        }
        
        traces
    }

    /// Single Candidate Stress Test (Shadow Mode)
    pub fn run_shadow_test(
        candidate: &dyn ObservationCandidate,
        agg_trade: &ObservationRecord,
        diff_depth: &ObservationRecord,
    ) -> FalsificationTrace {
        let posture = ObserverConflictMatrix::classify_posture(
            agg_trade,
            diff_depth,
            candidate.relies_on_agg_trades(),
            candidate.relies_on_diff_depth(),
        );

        let eval_result = candidate.evaluate(agg_trade, diff_depth);

        let (survived, failure_mode) = match eval_result {
            Ok(_) => (true, None),
            Err(reason) => (false, Some(reason)),
        };

        FalsificationTrace {
            candidate_id: candidate.id().to_string(),
            event_timestamp: agg_trade.exchange_timestamp,
            posture,
            survived,
            failure_mode,
        }
    }
}
