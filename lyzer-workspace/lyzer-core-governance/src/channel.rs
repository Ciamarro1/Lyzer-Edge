use lyzer_contracts::events::GovernanceEvent;

pub enum ChannelError {
    Disconnected,
    Timeout,
    SerializationError,
}

pub enum VetoDecision {
    Allow,
    Deny { reason: String },
}

/// The Transport Abstraction Boundary (Amendment A).
/// The Constitution talks to this trait, not to Unix Sockets.
pub trait GovernanceChannel {
    /// Dispara um evento constitucionamente rastreado
    fn send_event(&self, event: GovernanceEvent) -> Result<(), ChannelError>;
    
    /// Avalia a intenção sincronamente (L2 Veto)
    fn evaluate_hypothesis(&self, hypothesis_payload: &[u8]) -> Result<VetoDecision, ChannelError>;
}
