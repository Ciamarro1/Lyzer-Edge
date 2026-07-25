use crate::types::FalsificationTrace;

/// Observation Conflict Resolution Layer (OCRL) & ERT Controller
pub struct OcrlState {
    quarantined_candidates: Vec<String>,
    pub event_time_fatigue_clock: u64,
}

impl OcrlState {
    pub fn new() -> Self {
        Self {
            quarantined_candidates: Vec::new(),
            event_time_fatigue_clock: 0,
        }
    }

    /// Receives the traces from the MCFF for a single historical Event
    pub fn process_event_traces(&mut self, traces: Vec<FalsificationTrace>) {
        let mut survivors = Vec::new();

        for trace in traces {
            if trace.survived {
                survivors.push(trace.candidate_id);
            }
        }

        if survivors.is_empty() {
            println!("[OCRL] EVENT VACUUM: All candidates failed to explain this reality.");
            // Decay fatigue clock since no conflict is being resolved
            self.event_time_fatigue_clock = 0;
            self.quarantined_candidates.clear();
        } else if survivors.len() == 1 {
            let survivor = &survivors[0];
            
            // If there's an ongoing conflict, this is a Tie-breaker Event!
            if self.quarantined_candidates.len() > 1 && self.quarantined_candidates.contains(survivor) {
                println!("[OCRL] TIE-BREAKER EVENT DETECTED!");
                println!("[OCRL] Candidate [{}] survived edge case. Rival(s) falsified.", survivor);
                println!("[OCRL] Resolution achieved after {} events of Epistemological Fatigue.", self.event_time_fatigue_clock);
                println!("[OCRL] ---> PROMOTED TO EVIDENCE: {}", survivor);
                
                // Reset state
                self.quarantined_candidates.clear();
                self.event_time_fatigue_clock = 0;
            } else {
                // Isolated survival
                println!("[OCRL] Isolated survival for {}. Logging Integrity Score.", survivor);
            }
        } else {
            // Multiple survivors => CAUSAL CONFLICT (Suspension)
            println!("[OCRL] CAUSAL CONFLICT: Multiple hypotheses survived.");
            println!("[OCRL] Quarantining candidates: {:?}", survivors);
            self.quarantined_candidates = survivors;
            self.event_time_fatigue_clock += 1; // Increment ERT fatigue
            println!("[OCRL] Suspension Lock Activated. Awaiting Tie-breaker (Fatigue: {}).", self.event_time_fatigue_clock);
        }
    }
}
