use lyzer_core_models::*;

pub enum ArbitrationOutcome {
    Authorized(AuthorizedMeaningRecord, Vec<RejectedMeaningRecord>),
    Contested(ContestedMeaningRecord, Vec<RejectedMeaningRecord>),
    RejectedAll(Vec<RejectedMeaningRecord>),
    EvidenceRequest(String),
}

pub struct Arbitrator;

impl Arbitrator {
    /// Executes the Meaning Arbitration Protocol (Document 3) state machine
    pub fn arbitrate(meaning_id: String, interpretations: Vec<InterpretationRecord>) -> ArbitrationOutcome {
        if interpretations.is_empty() {
            return ArbitrationOutcome::EvidenceRequest("No interpretations submitted for arbitration.".to_string());
        }

        let mut admissible = Vec::new();
        let mut rejected = Vec::new();

        // PHASE A: Admissibility Review
        for interp in interpretations {
            if Self::phase_a_admissible(&interp) {
                admissible.push(interp);
            } else {
                rejected.push(RejectedMeaningRecord {
                    meaning_id: meaning_id.clone(),
                    interpretation: interp,
                    rejection_reason: "Failed Phase A: Admissibility (Evidence Presence / Traceability)".to_string(),
                });
            }
        }

        if admissible.is_empty() {
            return ArbitrationOutcome::RejectedAll(rejected);
        }

        // Evaluate remaining
        let mut scored: Vec<(InterpretationRecord, f64)> = admissible.into_iter().map(|interp| {
            let e_score = Self::phase_b_evidence(&interp);
            let c_score = Self::phase_c_constraint(&interp);
            let j_score = Self::phase_d_justification(&interp);
            let legitimacy = Self::phase_e_synthesis(e_score, c_score, j_score);
            (interp, legitimacy)
        }).collect();

        // PHASE F: Arbitration Decision (Rank Interpretations)
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        // PHASE G: Uncertainty Management
        let top_score = scored[0].1;
        
        // G1: Minimum Legitimacy Threshold
        if top_score < 10.0 { 
            for (interp, _) in scored {
                rejected.push(RejectedMeaningRecord {
                    meaning_id: meaning_id.clone(),
                    interpretation: interp,
                    rejection_reason: "Failed Phase G1: Below Minimum Legitimacy Threshold".to_string(),
                });
            }
            return ArbitrationOutcome::RejectedAll(rejected);
        }

        // G2: Tie Condition
        let tied: Vec<_> = scored.iter().filter(|(_, s)| (*s - top_score).abs() < 0.1).cloned().collect();

        if tied.len() > 1 {
            let tied_interps: Vec<InterpretationRecord> = tied.iter().map(|(i, _)| i.clone()).collect();
            for (interp, _) in scored.into_iter().skip(tied_interps.len()) {
                rejected.push(RejectedMeaningRecord {
                    meaning_id: meaning_id.clone(),
                    interpretation: interp,
                    rejection_reason: "Rejected in favor of tied higher legitimacy interpretations".to_string(),
                });
            }
            return ArbitrationOutcome::Contested(ContestedMeaningRecord {
                meaning_id,
                tied_interpretations: tied_interps,
            }, rejected);
        }

        // Single winner
        let (winner, score) = scored.remove(0);
        let authorized = AuthorizedMeaningRecord {
            meaning_id: meaning_id.clone(),
            interpretation: winner,
            legitimacy_score: score,
        };

        for (interp, _) in scored {
            rejected.push(RejectedMeaningRecord {
                meaning_id: meaning_id.clone(),
                interpretation: interp,
                rejection_reason: "Rejected in favor of interpretation with higher legitimacy".to_string(),
            });
        }

        ArbitrationOutcome::Authorized(authorized, rejected)
    }

    fn phase_a_admissible(interp: &InterpretationRecord) -> bool {
        // A1: Verify Evidence Presence
        if interp.evidence_references.is_empty() { return false; }
        // A2 & A3: Traceability & Compliance check baseline
        true
    }

    fn phase_b_evidence(interp: &InterpretationRecord) -> f64 {
        // B1, B2, B3 logic skeleton
        // MVP: Higher score for more evidence anchors
        10.0 + (interp.evidence_references.len() as f64) * 2.0
    }

    fn phase_c_constraint(interp: &InterpretationRecord) -> f64 {
        // C1, C2, C3 Penalty application
        // MVP: Simple penalty if observer declares heavy constraints but still asserts high confidence
        if !interp.incentive_profile.constraints.is_empty() {
            -5.0
        } else {
            0.0
        }
    }

    fn phase_d_justification(interp: &InterpretationRecord) -> f64 {
        // D1, D2, D3 reasoning evaluation
        // MVP: Observer-provided confidence scales the justification
        interp.confidence * 10.0
    }

    fn phase_e_synthesis(evidence: f64, constraint: f64, justification: f64) -> f64 {
        // Legitimacy Synthesis formula
        evidence + constraint + justification
    }
}
