#[derive(Debug, Clone, PartialEq)]
pub enum OcmPosture {
    Blind,
    Fragile,
    Stereoscopic,
}

#[derive(Debug, Clone)]
pub enum CandidateStatus {
    Quarantine,
    Falsified(String), // Reason for falsification
    Evidence,
}

#[derive(Debug, Clone)]
pub struct FalsificationTrace {
    pub candidate_id: String,
    pub event_timestamp: u64,
    pub posture: OcmPosture,
    pub survived: bool,
    pub failure_mode: Option<String>,
}
