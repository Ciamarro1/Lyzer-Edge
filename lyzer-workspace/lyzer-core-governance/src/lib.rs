use lyzer_core_models::*;

pub struct TruthAssessmentEngine;

impl TruthAssessmentEngine {
    /// Evaluates Reality vs Authorized Expectation.
    /// In a live system, `accuracy` is derived empirically from causality metrics.
    pub fn assess_truth(authorized: &AuthorizedMeaningRecord, observed_outcomes: String, accuracy: f64) -> TruthAssessmentRecord {
        let truth_score = accuracy * 10.0; // normalized 0-10
        let expected_outcomes = authorized.interpretation.interpretation.clone();
        
        // Legitimacy-Truth Delta
        // Positive: System thought it was right, but it was wrong (Delusion)
        // Negative: System thought it was weak, but it was right (Opportunity Loss)
        let divergence_score = authorized.legitimacy_score - truth_score;

        TruthAssessmentRecord {
            authorized_meaning_id: authorized.meaning_id.clone(),
            expected_outcomes,
            observed_outcomes,
            truth_score,
            divergence_score,
        }
    }

    /// Determines if the Legitimacy-Truth Delta violates survival bounds,
    /// triggering an institutional adaptation event.
    pub fn evaluate_drift(assessment: &TruthAssessmentRecord) -> Option<AdaptationEventRecord> {
        if assessment.divergence_score > 5.0 {
            Some(AdaptationEventRecord {
                assessment_id: assessment.authorized_meaning_id.clone(),
                trigger_reason: format!("Constitutional Drift: High Legitimacy ({}), Low Truth ({}). Delta = {}", 
                    assessment.truth_score + assessment.divergence_score, assessment.truth_score, assessment.divergence_score),
            })
        } else if assessment.divergence_score < -5.0 {
            Some(AdaptationEventRecord {
                assessment_id: assessment.authorized_meaning_id.clone(),
                trigger_reason: format!("Opportunity Loss: Low Legitimacy ({}), High Truth ({}). Delta = {}", 
                    assessment.truth_score + assessment.divergence_score, assessment.truth_score, assessment.divergence_score),
            })
        } else {
            None
        }
    }

    /// Computes the Adaptive Improvement Rate (AIR).
    /// AIR = (Error_before - Error_after) / Error_before
    /// Returns the AIR record proving if institutional learning occurred.
    pub fn compute_air(adaptation_event_id: String, previous_delta: f64, new_delta: f64) -> AdaptiveImprovementRateRecord {
        let air_score = if previous_delta == 0.0 {
            0.0
        } else {
            (previous_delta.abs() - new_delta.abs()) / previous_delta.abs()
        };

        AdaptiveImprovementRateRecord {
            adaptation_event_id,
            previous_delta,
            new_delta,
            air_score,
        }
    }
}
