use lyzer_contracts::events::GovernanceEvent;

/// Role-Based Access Control for the CER (Causal Evidence Repository).

pub trait CerWriter {
    /// Append-only access. Cannot read what was written.
    fn append_event(&self, event: GovernanceEvent) -> Result<(), String>;
}

pub trait CerReader {
    /// Restricted reading for the ECA VM to calculate Deadlock budgets.
    /// Returns aggregates, not philosophical history.
    fn get_veto_count(&self, clause_id: &str) -> Result<u64, String>;
}

pub trait CerAuditor {
    /// Unrestricted Read-Only access for the Reality Audit Daemon.
    fn read_history(&self, since_timestamp: u64) -> Result<Vec<GovernanceEvent>, String>;
}
