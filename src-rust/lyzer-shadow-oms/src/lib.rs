pub mod governance;
pub mod edi;

use std::time::Duration;
use tokio::time::sleep;
use lyzer_shm_spine::RealityLOBEvent;
use lyzer_binance_adapter::dsl::{OrderIntent, OrderSide, OrderType};

pub struct ShadowExecutionEngine {
    pub base_latency_ms: u64,
}

impl ShadowExecutionEngine {
    pub fn new(base_latency_ms: u64) -> Self {
        Self { base_latency_ms }
    }

    /// Recebe o intent da camada estratégica, aguarda a latência da rede (T_delay),
    /// e então cruza a ordem contra a cópia local do Order Book (o Oráculo da Realidade).
    pub async fn simulate_execution(&self, intent: &OrderIntent, current_lob: &RealityLOBEvent) -> ExecutionResult {
        // 1. Latency Falsification
        sleep(Duration::from_millis(self.base_latency_ms)).await;

        // 2. Opcional: Re-fetch o Order Book após a latência para ver o book real *naquele* milissegundo
        // (Aqui vamos usar o snapshot atual do LOB-M passado pelo parâmetro para manter idempotente a fn)
        
        // 3. Order Matching
        let mut filled_qty = 0.0;
        let mut total_cost = 0.0;
        let mut partial_fills = 0;

        let levels = match intent.side {
            OrderSide::BUY => &current_lob.asks,
            OrderSide::SELL => &current_lob.bids,
        };

        for level in levels.iter() {
            if level.price == 0.0 || level.quantity == 0.0 {
                continue; // Nível vazio ou nulo
            }

            let remaining_needed = intent.quantity - filled_qty;
            if remaining_needed <= 0.0 {
                break;
            }

            let fill_qty = f64::min(remaining_needed, level.quantity as f64);
            filled_qty += fill_qty;
            total_cost += fill_qty * level.price as f64;
            partial_fills += 1;

            if filled_qty >= intent.quantity {
                break;
            }
        }

        // 4. Calcula o VWAP e a Situação
        let vwap = if filled_qty > 0.0 { total_cost / filled_qty } else { 0.0 };
        let expected_price = intent.price.unwrap_or(levels[0].price as f64);
        
        let slippage_bps = if expected_price > 0.0 && vwap > 0.0 {
            let delta = f64::abs(vwap - expected_price);
            (delta / expected_price) * 10000.0
        } else {
            0.0
        };

        let edi = slippage_bps / 10.0; // Simplificação provisória

        ExecutionResult {
            intent_id: "dummy-uuidv7".to_string(),
            filled_qty,
            vwap,
            slippage_bps,
            partial_fills,
            latency_ms: self.base_latency_ms,
            edi,
            is_rejected: filled_qty == 0.0,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ExecutionResult {
    pub intent_id: String,
    pub filled_qty: f64,
    pub vwap: f64,
    pub slippage_bps: f64,
    pub partial_fills: usize,
    pub latency_ms: u64,
    pub edi: f64,
    pub is_rejected: bool,
}
