use std::collections::{HashMap};
use std::time::Instant;
use lyzer_binance_adapter::dsl::OrderIntent;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecutionState {
    Green,
    Yellow,
    Red,
}

pub struct TokenBucket {
    pub capacity: u32,
    pub tokens: f64,
    pub fill_rate: f64, // tokens per second
    pub last_update: Instant,
}

impl TokenBucket {
    pub fn new(capacity: u32, fill_rate: f64) -> Self {
        Self {
            capacity,
            tokens: capacity as f64,
            fill_rate,
            last_update: Instant::now(),
        }
    }

    pub fn consume(&mut self, amount: f64) -> bool {
        self.refill();
        if self.tokens >= amount {
            self.tokens -= amount;
            true
        } else {
            false
        }
    }

    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_update).as_secs_f64();
        self.tokens = f64::min(self.capacity as f64, self.tokens + elapsed * self.fill_rate);
        self.last_update = now;
    }
    
    pub fn utilization(&self) -> f64 {
        1.0 - (self.tokens / self.capacity as f64)
    }
}

pub struct RateLimitGuardian {
    pub order_bucket: TokenBucket,
    pub request_bucket: TokenBucket,
    pub current_state: ExecutionState,
    pub yellow_threshold: f64, 
    pub red_threshold: f64,    
}

impl RateLimitGuardian {
    pub fn new(yellow_threshold: f64, red_threshold: f64) -> Self {
        Self {
            order_bucket: TokenBucket::new(50, 10.0),
            request_bucket: TokenBucket::new(1200, 20.0),
            current_state: ExecutionState::Green,
            yellow_threshold,
            red_threshold,
        }
    }

    pub fn evaluate_state(&mut self, current_edi: f64) -> ExecutionState {
        if current_edi > 0.8 {
            self.current_state = ExecutionState::Red;
            return ExecutionState::Red;
        }

        self.order_bucket.refill();
        self.request_bucket.refill();

        let max_utilization = f64::max(
            self.order_bucket.utilization(),
            self.request_bucket.utilization()
        );

        self.current_state = if max_utilization >= self.red_threshold {
            ExecutionState::Red
        } else if max_utilization >= self.yellow_threshold {
            ExecutionState::Yellow
        } else {
            ExecutionState::Green
        };

        self.current_state
    }
}
