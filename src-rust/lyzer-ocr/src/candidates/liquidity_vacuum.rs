use crate::candidates::ObservationCandidate;
use lyzer_oal::types::ObservationRecord;

/// CANDIDATE-001: Liquidity Vacuum
/// Hypothesis: Directional liquidity depletion precedes market phase transitions.
pub struct LiquidityVacuum;

impl ObservationCandidate for LiquidityVacuum {
    fn id(&self) -> &'static str {
        "CANDIDATE-001: Liquidity Vacuum"
    }

    fn relies_on_agg_trades(&self) -> bool {
        true
    }

    fn relies_on_diff_depth(&self) -> bool {
        false // Intentional flaw for the Shadow Test: Candidate ignores Depth (Blind posture)
    }

    fn evaluate(&self, _agg_trade: &ObservationRecord, _diff_depth: &ObservationRecord) -> Result<(), String> {
        let payload = _diff_depth.payload.to_string();
        if payload.contains("toxic_spread_break") {
            return Err("Failed: Spread broke, vacuum hypothesis shattered.".to_string());
        }
        Ok(())
    }
}
