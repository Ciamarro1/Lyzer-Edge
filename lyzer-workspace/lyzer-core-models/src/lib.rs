use serde::{Deserialize, Serialize};

/// OEP-O3: Observer Incentives
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ObserverIncentiveProfile {
    pub primary_mandate: String,
    pub constraints: Vec<String>,
}

/// Document 2: Observer
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Observer {
    Human(String),
    Agent(String),
    System(String),
    Institutional(String),
}

/// Document 2: Evidence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceRecord {
    pub origin: String,
    pub timestamp: i64,
    pub observation: String,
    pub context: String,
}

/// Document 2: Constraint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConstraintCategory {
    Physical,
    Capital,
    Temporal,
    Compute,
    Regulatory,
    Institutional,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConstraintRecord {
    pub category: ConstraintCategory,
    pub description: String,
}

/// Document 2: Interpretation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterpretationRecord {
    pub observer: Observer,
    pub incentive_profile: ObserverIncentiveProfile,
    pub evidence_references: Vec<String>,
    pub interpretation: String,
    pub justification: String,
    pub confidence: f64,
}

/// Document 2 & 3: Arbitration Outcomes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthorizedMeaningRecord {
    pub meaning_id: String,
    pub interpretation: InterpretationRecord,
    pub legitimacy_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RejectedMeaningRecord {
    pub meaning_id: String,
    pub interpretation: InterpretationRecord,
    pub rejection_reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContestedMeaningRecord {
    pub meaning_id: String,
    pub tied_interpretations: Vec<InterpretationRecord>,
}

/// Document 2: Adaptation & Reality Feedback
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SurpriseRecord {
    pub meaning_id: String,
    pub expected_outcome: String,
    pub observed_outcome: String,
    pub prediction_error: f64,
    pub surprise_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TruthAssessmentRecord {
    pub authorized_meaning_id: String,
    pub expected_outcomes: String,
    pub observed_outcomes: String,
    pub truth_score: f64,
    pub divergence_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdaptationEventRecord {
    pub assessment_id: String,
    pub trigger_reason: String,
}

/// Document 3.75: Ontological Evolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OntologicalHypothesisRecord {
    pub observer: Observer,
    pub missing_concept_description: String,
    pub evidence_package: Vec<EvidenceRecord>,
}

/// Document 3.5 & 3.9: Governance Review
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceReviewRecord {
    pub trigger_source: String, // e.g., "Legitimacy-Truth Delta", "IDI Drop"
    pub severity: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdaptiveImprovementRateRecord {
    pub adaptation_event_id: String,
    pub previous_delta: f64,
    pub new_delta: f64,
    pub air_score: f64, // (prev - new) / prev
}
