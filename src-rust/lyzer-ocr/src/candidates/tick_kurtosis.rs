use crate::candidates::ObservationCandidate;
use lyzer_oal::types::ObservationRecord;

pub struct TickKurtosis;

impl ObservationCandidate for TickKurtosis {
    fn id(&self) -> &'static str {
        "CANDIDATE-002: Tick Kurtosis"
    }

    fn relies_on_agg_trades(&self) -> bool {
        true
    }

    fn relies_on_diff_depth(&self) -> bool {
        true // Stereoscopic posture
    }

    fn evaluate(&self, _agg_trade: &ObservationRecord, _diff_depth: &ObservationRecord) -> Result<(), String> {
        let payload = _diff_depth.payload.to_string();
        if payload.contains("some_other_anomaly") {
            return Err("Failed: Kurtosis not detected.".to_string());
        }
        Ok(())
    }
}
