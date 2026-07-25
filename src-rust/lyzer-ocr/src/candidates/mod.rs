pub mod liquidity_vacuum;
pub mod tick_kurtosis;
pub mod book_fracture;

pub trait ObservationCandidate {
    fn id(&self) -> &'static str;
    fn relies_on_agg_trades(&self) -> bool;
    fn relies_on_diff_depth(&self) -> bool;
    
    /// Evaluates the hypothesis against a pair of concurrent observations.
    /// Returns Ok(()) if it survives, or Err(String) if falsified.
    fn evaluate(&self, agg_trade: &lyzer_oal::types::ObservationRecord, diff_depth: &lyzer_oal::types::ObservationRecord) -> Result<(), String>;
}
