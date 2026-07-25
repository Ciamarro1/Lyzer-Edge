use crate::SignalEvent;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecutionState {
    Idle,
    IntentReceived,

    PreRiskValidation,
    HardwareGateCheck,
    CircuitBreakerCheck,

    ExecutionReady,
    OrderSent,

    PartialFill,
    Filled,

    Rejected,
    Failed,

    Cooldown,
    SafeMode,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitState {
    Closed,
    HalfOpen,
    Open,
}

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct StateTransitionEvent {
    pub timestamp_ns: u64,
    pub from_state: u8, // Cast ExecutionState to u8 for ABI
    pub to_state: u8,
    pub reason_code: u16,

    pub mrce_signal: f32,
    pub risk_score: f32,
    pub edi: f32,

    pub circuit_state: u8, 
    pub _pad: [u8; 3],
}

pub struct ExecutionStateMachine {
    pub state: ExecutionState,

    pub last_edi: f32,
    pub last_risk: f32,
    pub last_mrce: f32,

    pub circuit_state: CircuitState,
}

impl ExecutionStateMachine {
    pub fn new() -> Self {
        Self {
            state: ExecutionState::Idle,
            last_edi: 0.0,
            last_risk: 0.0,
            last_mrce: 0.0,
            circuit_state: CircuitState::Closed,
        }
    }

    /// Evaluates structural bounds before allowing transition logic
    fn evaluate_panic_triggers(&mut self) -> Option<ExecutionState> {
        if self.last_edi > 0.8 {
            return Some(ExecutionState::SafeMode);
        } else if self.last_edi > 0.5 {
            return Some(ExecutionState::Cooldown);
        }
        None
    }

    pub fn step(&mut self, input: &SignalEvent) -> ExecutionState {
        // Global Hardening Overrides
        if let Some(panic_state) = self.evaluate_panic_triggers() {
            self.state = panic_state;
            return self.state;
        }

        self.state = match self.state {
            ExecutionState::Idle => {
                ExecutionState::IntentReceived
            }

            ExecutionState::IntentReceived => {
                ExecutionState::PreRiskValidation
            }

            ExecutionState::PreRiskValidation => {
                if input.causal_pressure < 0.8 {
                    ExecutionState::HardwareGateCheck
                } else {
                    ExecutionState::Rejected
                }
            }

            ExecutionState::HardwareGateCheck => {
                if input.sga_grounding < 0.3 {
                    ExecutionState::SafeMode
                } else {
                    ExecutionState::CircuitBreakerCheck
                }
            }

            ExecutionState::CircuitBreakerCheck => {
                match self.circuit_state {
                    CircuitState::Open => ExecutionState::SafeMode,
                    CircuitState::HalfOpen => ExecutionState::Cooldown,
                    CircuitState::Closed => ExecutionState::ExecutionReady,
                }
            }

            ExecutionState::ExecutionReady => {
                ExecutionState::OrderSent
            }

            ExecutionState::OrderSent => {
                // In reality, this waits for feedback. For logic cycle:
                ExecutionState::PartialFill
            }

            ExecutionState::PartialFill => {
                ExecutionState::Filled
            }

            ExecutionState::Cooldown | ExecutionState::Rejected | ExecutionState::Failed | ExecutionState::Filled => {
                ExecutionState::Idle
            }

            ExecutionState::SafeMode => {
                // SafeMode requires manual intervention or strict heartbeat logic to escape
                ExecutionState::SafeMode
            }
        };

        self.state
    }
}
