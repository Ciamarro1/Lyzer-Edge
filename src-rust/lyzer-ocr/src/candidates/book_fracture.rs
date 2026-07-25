use crate::candidates::ObservationCandidate;
use lyzer_oal::types::ObservationRecord;

pub struct BookFracture;

impl ObservationCandidate for BookFracture {
    fn id(&self) -> &'static str {
        "CANDIDATE-003: Book Fracture"
    }

    fn relies_on_agg_trades(&self) -> bool {
        false // Ignora agressões, foca puramente no sumiço do limite
    }

    fn relies_on_diff_depth(&self) -> bool {
        true
    }

    fn evaluate(&self, _agg_trade: &ObservationRecord, _diff_depth: &ObservationRecord) -> Result<(), String> {
        let payload = _diff_depth.payload.to_string();
        if payload.contains("top_bid_qty\": 100.0") {
            return Err("Failed: Spread did not fracture, liquidity remained contiguous.".to_string());
        }
        if payload.contains("toxic_spread_break") {
            return Err("Failed: Spread broke but for the wrong reasons.".to_string());
        }
        Ok(())
    }
}
