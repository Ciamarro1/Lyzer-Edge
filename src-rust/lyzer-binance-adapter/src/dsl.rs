use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum OrderSide {
    BUY,
    SELL,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum OrderType {
    MARKET,
    LIMIT,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderIntent {
    pub symbol: String,
    pub side: OrderSide,
    pub order_type: OrderType,
    pub quantity: f64,
    pub price: Option<f64>,
    pub timestamp: u64,
    pub recv_window: u64,
}

impl OrderIntent {
    /// Produz a string de query canônica determinística para a assinatura HMAC.
    pub fn to_canonical_query(&self) -> String {
        let mut query = format!(
            "symbol={}&side={:?}&type={:?}&quantity={}",
            self.symbol, self.side, self.order_type, self.quantity
        );

        if let Some(p) = self.price {
            query.push_str(&format!("&price={}", p));
        }

        query.push_str(&format!(
            "&recvWindow={}&timestamp={}",
            self.recv_window, self.timestamp
        ));

        // Para LIMIT orders na Binance, timeInForce é geralmente obrigatório
        if self.order_type == OrderType::LIMIT {
            query.push_str("&timeInForce=GTC");
        }

        query
    }
}
