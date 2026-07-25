use std::collections::HashMap;

pub struct LatencyWindow {
    pub samples: Vec<u64>,
}

impl LatencyWindow {
    pub fn new() -> Self {
        Self { samples: Vec::new() }
    }

    pub fn insert(&mut self, latency_ms: u64) {
        self.samples.push(latency_ms);
        if self.samples.len() > 100 {
            self.samples.remove(0);
        }
    }
    
    pub fn p50(&mut self) -> u64 {
        if self.samples.is_empty() { return 0; }
        let mut sorted = self.samples.clone();
        sorted.sort_unstable();
        sorted[sorted.len() / 2]
    }
    
    pub fn p95(&mut self) -> u64 {
        if self.samples.is_empty() { return 0; }
        let mut sorted = self.samples.clone();
        sorted.sort_unstable();
        sorted[(sorted.len() as f64 * 0.95) as usize]
    }
}

pub struct ExecutionDriftIndex {
    pub latency_window: LatencyWindow,
    pub total_intents: u64,
    pub rejected_intents: u64,
    pub cumulative_slippage_bps: f64,
    pub cumulative_expected_volume: f64,
    pub cumulative_filled_volume: f64,

    // Composite Weights
    pub weight_slippage: f64,
    pub weight_latency: f64,
    pub weight_rejects: f64,
    pub weight_fill_ratio: f64,
}

impl ExecutionDriftIndex {
    pub fn new() -> Self {
        Self {
            latency_window: LatencyWindow::new(),
            total_intents: 0,
            rejected_intents: 0,
            cumulative_slippage_bps: 0.0,
            cumulative_expected_volume: 0.0,
            cumulative_filled_volume: 0.0,
            weight_slippage: 0.4,
            weight_latency: 0.2,
            weight_rejects: 0.2,
            weight_fill_ratio: 0.2,
        }
    }

    pub fn compute_edi(&mut self) -> f64 {
        let avg_slippage = self.cumulative_slippage_bps / f64::max(1.0, self.total_intents as f64);
        let slippage_score = f64::min(1.0, avg_slippage / 10.0); 

        let current_p95 = self.latency_window.p95() as f64;
        let latency_score = f64::min(1.0, current_p95 / 500.0); 

        let reject_rate = self.rejected_intents as f64 / f64::max(1.0, self.total_intents as f64);

        let fill_ratio = self.cumulative_filled_volume / f64::max(1.0, self.cumulative_expected_volume);
        let fill_defect = 1.0 - fill_ratio;

        (slippage_score * self.weight_slippage) +
        (latency_score * self.weight_latency) +
        (reject_rate * self.weight_rejects) +
        (fill_defect * self.weight_fill_ratio)
    }
}
